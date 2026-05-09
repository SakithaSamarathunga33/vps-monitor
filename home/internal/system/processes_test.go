package system

import (
	"context"
	"testing"
)

func TestGetProcessesReturnsCapped(t *testing.T) {
	ctx := context.Background()
	resp, err := GetProcesses(ctx, nil)
	if err != nil {
		t.Fatalf("GetProcesses() error = %v", err)
	}
	if len(resp.Processes) > 20 {
		t.Fatalf("expected at most 20 processes, got %d", len(resp.Processes))
	}
}

func TestGetProcessesSortedByCPUDescending(t *testing.T) {
	ctx := context.Background()
	resp, err := GetProcesses(ctx, nil)
	if err != nil {
		t.Fatalf("GetProcesses() error = %v", err)
	}
	for i := 1; i < len(resp.Processes); i++ {
		if resp.Processes[i].CPUPercent > resp.Processes[i-1].CPUPercent {
			t.Fatalf("not sorted: index %d cpu=%.2f > index %d cpu=%.2f",
				i, resp.Processes[i].CPUPercent, i-1, resp.Processes[i-1].CPUPercent)
		}
	}
}

func TestGetProcessesFieldsNonEmpty(t *testing.T) {
	ctx := context.Background()
	resp, err := GetProcesses(ctx, nil)
	if err != nil {
		t.Fatalf("GetProcesses() error = %v", err)
	}
	if len(resp.Processes) == 0 {
		t.Skip("no processes returned — skipping field check")
	}
	for _, p := range resp.Processes {
		if p.PID == 0 {
			t.Fatalf("expected non-zero PID, got 0 for process %q", p.Name)
		}
		if p.Name == "" {
			t.Fatalf("expected non-empty Name for PID %d", p.PID)
		}
	}
}

func TestIsPrintableASCII(t *testing.T) {
	cases := []struct {
		input string
		want  bool
	}{
		{"nginx", true},
		{"", true},
		{"\x00bash", false},
		{"kworker/u", true},
	}
	for _, c := range cases {
		if got := isPrintableASCII(c.input); got != c.want {
			t.Errorf("isPrintableASCII(%q) = %v, want %v", c.input, got, c.want)
		}
	}
}

func TestCheckSuspiciousKnownBadName(t *testing.T) {
	sus, reason := checkSuspicious(nil, nil, "xmrig", 5)
	if !sus || reason != "Known malware name" {
		t.Fatalf("expected xmrig to be flagged as Known malware name, got sus=%v reason=%q", sus, reason)
	}
}

func TestCheckSuspiciousHighCPU(t *testing.T) {
	sus, reason := checkSuspicious(nil, nil, "unknown-worker", 62)
	if !sus || reason != "High CPU" {
		t.Fatalf("expected unknown-worker above 50%% CPU to be flagged as High CPU, got sus=%v reason=%q", sus, reason)
	}
}

func TestCheckSuspiciousFlagsDockerBuilderPruneRelatedHighCPU(t *testing.T) {
	sus, reason := checkSuspicious(nil, nil, "nccontd", 62)
	if !sus || reason != "High CPU" {
		t.Fatalf("expected nccontd above 50%% CPU to be flagged as High CPU, got sus=%v reason=%q", sus, reason)
	}
}

func TestClassifyDockerProcess(t *testing.T) {
	if got := classifyProcess("nccontd"); got != "Docker task" {
		t.Fatalf("classifyProcess(nccontd) = %q, want Docker task", got)
	}
}

func TestClassifySystemLikeProcess(t *testing.T) {
	if got := classifyProcess("apt-cdrommouset"); got != "System-like task" {
		t.Fatalf("classifyProcess(apt-cdrommouset) = %q, want System-like task", got)
	}
}

func TestClassifyUnknownProcess(t *testing.T) {
	if got := classifyProcess("unknown-worker"); got != "User/unknown task" {
		t.Fatalf("classifyProcess(unknown-worker) = %q, want User/unknown task", got)
	}
}

func TestCheckSuspiciousDoesNotFlagNormalCPU(t *testing.T) {
	sus, reason := checkSuspicious(nil, nil, "nginx", 50)
	if sus {
		t.Fatalf("expected nginx at 50%% CPU not to be flagged, got reason=%q", reason)
	}
}

func TestCheckSuspiciousSystemProcessImpostor(t *testing.T) {
	sus, reason := checkSuspicious(nil, nil, "apt-cdrommouset", 65.8)
	if !sus || reason != "High CPU" {
		t.Fatalf("expected apt-cdrommouset to be flagged as High CPU, got sus=%v reason=%q", sus, reason)
	}
}

func TestCheckSuspiciousXkbevdImpostor(t *testing.T) {
	sus, reason := checkSuspicious(nil, nil, "xkbevdsort", 66.4)
	if !sus || reason != "High CPU" {
		t.Fatalf("expected xkbevdsort to be flagged as High CPU, got sus=%v reason=%q", sus, reason)
	}
}

func TestCheckSuspiciousSystemProcessImpostorPattern(t *testing.T) {
	sus, reason := checkSuspicious(nil, nil, "apt-getabc123", 25)
	if !sus || reason != "System process impersonation" {
		t.Fatalf("expected apt-getabc123 to be flagged as System process impersonation, got sus=%v reason=%q", sus, reason)
	}
}

func TestCheckSuspiciousXkbevdImpostorPattern(t *testing.T) {
	sus, reason := checkSuspicious(nil, nil, "xkbevdabc123", 25)
	if !sus || reason != "System process impersonation" {
		t.Fatalf("expected xkbevdabc123 to be flagged as System process impersonation, got sus=%v reason=%q", sus, reason)
	}
}

func TestCheckSuspiciousAllowsSeparatedSystemProcessNames(t *testing.T) {
	sus, reason := checkSuspicious(nil, nil, "systemd-journald", 20)
	if sus {
		t.Fatalf("expected systemd-journald not to be flagged, got reason=%q", reason)
	}
}

func TestCheckSuspiciousEmptyName(t *testing.T) {
	sus, reason := checkSuspicious(nil, nil, "", 5)
	if !sus || reason != "Invalid process name" {
		t.Fatalf("expected empty name to be flagged, got sus=%v reason=%q", sus, reason)
	}
}

func TestSuggestedKillOnSightNameUsesFamilyForRandomizedNames(t *testing.T) {
	cases := map[string]string{
		"byobu-screenzne": "byobu-screen*",
		"bzip2sg_compare": "bzip2*",
		"pslogdh_install": "pslog*",
		"xfce4-mime-help": "xfce4-*",
		"mmclinmtui-edit": "mmcli*",
		"ipcrmavahi-brow": "ipcrm*",
		"apt-getabc123":   "apt-get*",
		"nginx":           "",
	}

	for input, want := range cases {
		if got := suggestedKillOnSightName(input); got != want {
			t.Fatalf("suggestedKillOnSightName(%q) = %q, want %q", input, got, want)
		}
	}
}

func TestSourceHintPrefersSuspiciousExecutablePath(t *testing.T) {
	got := sourceHint(123, "bash", "/tmp/mmclinmtui-edit", "mmclinmtui-edit", "")
	want := "Executable in temporary directory: /tmp/mmclinmtui-edit"
	if got != want {
		t.Fatalf("sourceHint() = %q, want %q", got, want)
	}
}

func TestSourceHintPrefersSystemdUnit(t *testing.T) {
	got := sourceHint(1, "systemd", "/usr/bin/ssh-keyscangunzip", "", "malware.service")
	want := "systemd unit: malware.service"
	if got != want {
		t.Fatalf("sourceHint() = %q, want %q", got, want)
	}
}
