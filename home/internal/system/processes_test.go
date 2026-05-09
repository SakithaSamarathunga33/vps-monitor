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
		{"", false},
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

func TestCheckSuspiciousEmptyName(t *testing.T) {
	sus, reason := checkSuspicious(nil, nil, "", 5)
	if !sus || reason != "Invalid process name" {
		t.Fatalf("expected empty name to be flagged, got sus=%v reason=%q", sus, reason)
	}
}
