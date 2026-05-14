package system

import (
	"context"
	"os"
	"path/filepath"
	"runtime"
	"sort"
	"strconv"
	"strings"
	"sync"
	"unicode"

	"github.com/hhftechnology/vps-monitor/internal/models"
	"github.com/shirou/gopsutil/v4/process"
)

// cpuHistory tracks the previous CPU% per PID for sustained-CPU detection.
var cpuHistory sync.Map // map[int32]float64

var knownBadNames = map[string]struct{}{
	"xmrig": {}, "minerd": {}, "kinsing": {}, "masscan": {},
	"nmap": {}, "cryptonight": {}, "kdevtmpfsi": {}, "kworkerds": {},
	"sysupdate": {}, "networkservice": {}, "ld-musl": {}, "stratum+tcp": {},
	"apt-cdrommouset": {}, "xkbevdsort": {},
}

var suspiciousExePrefixes = []string{
	"/tmp/", "/dev/shm/", "/var/tmp/", "/run/shm/",
}

var systemProcessNamePrefixes = []string{
	"apt-cdrom", "apt-get", "apt-cache", "dpkg",
	"systemd", "sshd", "cron", "crond", "dockerd", "containerd",
	"kworker", "ksoftirqd", "xkbevd", "mmcli", "nmtui", "ipcrm",
	"avahi-browse",
}

var randomizedUserProcessPrefixes = []string{
	"byobu-screen", "bzip2", "pslog", "xfce4-", "mmcli", "ipcrm",
	"avahi-",
}

var dockerProcessNames = map[string]struct{}{
	"buildctl": {}, "buildkitd": {}, "containerd": {}, "containerd-shim": {},
	"docker": {}, "docker-init": {}, "docker-proxy": {}, "dockerd": {},
	"runc": {}, "nccontd": {},
}

var systemProcessNames = map[string]struct{}{
	"cron": {}, "crond": {}, "dbus-daemon": {}, "journald": {}, "ksoftirqd": {},
	"kworker": {}, "sshd": {}, "systemd": {}, "systemd-journald": {},
	"systemd-logind": {}, "systemd-resolved": {}, "systemd-timesyncd": {},
	"systemd-udevd": {},
}

const suspiciousCPUThreshold = 50.0

// checkSuspicious runs all heuristics and returns (suspicious, reason).
// p may be nil when called from tests that only exercise name/CPU checks.
func checkSuspicious(ctx context.Context, p *process.Process, name string, cpu float64) (bool, string) {
	if IsProtectedKillOnSightName(name) {
		return false, ""
	}

	// 1. High CPU: flag immediately so the UI can offer manual kill/ban controls.
	if cpu > suspiciousCPUThreshold {
		return true, "High CPU"
	}

	// 2. Known bad name.
	if _, bad := knownBadNames[strings.ToLower(name)]; bad {
		return true, "Known malware name"
	}

	// 3. Fake names that append random-looking text to common system commands.
	if cpu > 20 && isSystemProcessNameImpostor(name) {
		return true, "System process impersonation"
	}

	// 4. Empty or non-printable name.
	if name == "" || !isPrintableASCII(name) {
		return true, "Invalid process name"
	}

	// 5. Executable in a suspicious directory.
	if p != nil {
		exe, err := p.ExeWithContext(ctx)
		if err == nil {
			for _, prefix := range suspiciousExePrefixes {
				if strings.HasPrefix(exe, prefix) {
					return true, "Temp dir execution"
				}
			}
		}
	}

	return false, ""
}

func isPrintableASCII(s string) bool {
	for _, r := range s {
		if r > unicode.MaxASCII || !unicode.IsPrint(r) {
			return false
		}
	}
	return true
}

func classifyProcess(name string) string {
	lowerName := strings.ToLower(name)
	if _, ok := dockerProcessNames[lowerName]; ok {
		return "Docker task"
	}
	if strings.HasPrefix(lowerName, "containerd-shim") {
		return "Docker task"
	}
	if _, ok := systemProcessNames[lowerName]; ok {
		return "System task"
	}
	if isSystemProcessNameImpostor(name) {
		return "System-like task"
	}
	if suggestedKillOnSightName(name) != name {
		return "System-like task"
	}
	return "User/unknown task"
}

func isSystemProcessNameImpostor(name string) bool {
	lowerName := strings.ToLower(name)
	for _, prefix := range systemProcessNamePrefixes {
		if lowerName == prefix || !strings.HasPrefix(lowerName, prefix) {
			continue
		}

		suffix := strings.TrimPrefix(lowerName, prefix)
		if len(suffix) < 3 {
			continue
		}

		// Legitimate systemd helpers are usually separated, e.g. systemd-journald.
		first := rune(suffix[0])
		if first == '-' || first == '_' || first == '.' || first == '/' {
			continue
		}

		if isASCIIAlnum(suffix) {
			return true
		}
	}
	return false
}

func suggestedKillOnSightName(name string) string {
	lowerName := strings.ToLower(name)
	if IsProtectedKillOnSightName(lowerName) {
		return ""
	}
	for _, prefix := range systemProcessNamePrefixes {
		if hasStrictRandomizedSuffix(lowerName, prefix) {
			return prefix + "*"
		}
	}
	for _, prefix := range randomizedUserProcessPrefixes {
		if hasLooseRandomizedSuffix(lowerName, prefix) {
			return prefix + "*"
		}
	}
	return name
}

func hasStrictRandomizedSuffix(lowerName, prefix string) bool {
	if lowerName == prefix || !strings.HasPrefix(lowerName, prefix) {
		return false
	}

	suffix := strings.TrimPrefix(lowerName, prefix)
	if len(suffix) < 3 {
		return false
	}

	first := rune(suffix[0])
	return first != '-' &&
		first != '_' &&
		first != '.' &&
		first != '/' &&
		isASCIIAlnum(suffix)
}

func hasLooseRandomizedSuffix(lowerName, prefix string) bool {
	if lowerName == prefix || !strings.HasPrefix(lowerName, prefix) {
		return false
	}

	suffix := strings.TrimPrefix(lowerName, prefix)
	if len(suffix) < 3 {
		return false
	}

	trimmed := strings.TrimLeft(suffix, "-_.")
	if len(trimmed) < 3 {
		return false
	}
	compact := strings.NewReplacer("-", "", "_", "", ".", "").Replace(trimmed)
	return len(compact) >= 3 && isASCIIAlnum(compact)
}

func isASCIIAlnum(s string) bool {
	for _, r := range s {
		if r > unicode.MaxASCII || !(unicode.IsLetter(r) || unicode.IsDigit(r)) {
			return false
		}
	}
	return true
}

func getProcessSourceDetails(ctx context.Context, p *process.Process) (int32, string, string, string, string) {
	var ppid int32
	var parentName string
	var exePath string
	var cmdline string
	var systemdUnit string

	if pid, err := p.PpidWithContext(ctx); err == nil {
		ppid = pid
		if parent, err := process.NewProcessWithContext(ctx, pid); err == nil {
			if name, err := parent.NameWithContext(ctx); err == nil {
				parentName = name
			}
		}
	}
	if exe, err := p.ExeWithContext(ctx); err == nil {
		exePath = exe
	}
	if cmd, err := p.CmdlineWithContext(ctx); err == nil {
		cmdline = cmd
	}
	systemdUnit = processSystemdUnit(p.Pid)

	return ppid, parentName, exePath, cmdline, systemdUnit
}

func processSystemdUnit(pid int32) string {
	data, err := os.ReadFile(filepath.Join("/proc", strconv.FormatInt(int64(pid), 10), "cgroup"))
	if err != nil {
		return ""
	}
	for _, line := range strings.Split(string(data), "\n") {
		for _, part := range strings.Split(line, "/") {
			if strings.HasSuffix(part, ".service") ||
				strings.HasSuffix(part, ".scope") ||
				strings.HasSuffix(part, ".timer") {
				return part
			}
		}
	}
	return ""
}

func sourceHint(ppid int32, parentName, exePath, cmdline, systemdUnit string) string {
	if systemdUnit != "" {
		return "systemd unit: " + systemdUnit
	}
	if exePath != "" {
		for _, prefix := range suspiciousExePrefixes {
			if strings.HasPrefix(exePath, prefix) {
				return "Executable in temporary directory: " + exePath
			}
		}
	}
	if parentName != "" {
		return parentName
	}
	if cmdline != "" {
		return cmdline
	}
	if ppid > 0 {
		return "PID " + strconv.FormatInt(int64(ppid), 10)
	}
	return ""
}

// GetProcesses returns the top 20 host processes sorted by CPU descending,
// annotated with suspicious flags, and auto-kills any process whose name is
// in the kill-on-sight store.
func GetProcesses(ctx context.Context, store *KillOnSightStore) (*models.ProcessesResponse, error) {
	procs, err := process.ProcessesWithContext(ctx)
	if err != nil {
		return nil, err
	}

	numCPU := float64(runtime.NumCPU())
	if numCPU < 1 {
		numCPU = 1
	}

	type entry struct {
		pid              int32
		ppid             int32
		name             string
		parentName       string
		cpu              float64
		memoryBytes      uint64
		suspicious       bool
		suspiciousReason string
		processType      string
		killError        string
		exePath          string
		cmdline          string
		systemdUnit      string
	}

	var autoKilled []string
	var autoKillFailed []models.ProcessKillFailure
	entries := make([]entry, 0, len(procs))

	for _, p := range procs {
		name, err := p.NameWithContext(ctx)
		if err != nil {
			continue
		}
		cpu, err := p.CPUPercentWithContext(ctx)
		if err != nil {
			continue
		}
		cpu = cpu / numCPU
		var memBytes uint64
		if memInfo, err := p.MemoryInfoWithContext(ctx); err == nil && memInfo != nil {
			memBytes = memInfo.RSS
		}
		ppid, parentName, exePath, cmdline, systemdUnit := getProcessSourceDetails(ctx, p)

		// Auto-kill if on the kill-on-sight list.
		if store != nil && store.Contains(name) {
			killErr := p.KillWithContext(ctx)
			if killErr == nil {
				autoKilled = append(autoKilled, name)
				cpuHistory.Delete(p.Pid)
				continue
			}

			autoKillFailed = append(autoKillFailed, models.ProcessKillFailure{
				PID:   p.Pid,
				Name:  name,
				Error: KillErrorMessage(killErr),
			})
			entries = append(entries, entry{
				pid: p.Pid, name: name, cpu: cpu, memoryBytes: memBytes,
				suspicious: true, suspiciousReason: "Kill-on-sight failed",
				processType: classifyProcess(name), killError: KillErrorMessage(killErr),
				ppid: ppid, parentName: parentName, exePath: exePath, cmdline: cmdline, systemdUnit: systemdUnit,
			})
			cpuHistory.Store(p.Pid, cpu)
			continue
		}

		suspicious, reason := checkSuspicious(ctx, p, name, cpu)
		cpuHistory.Store(p.Pid, cpu)

		entries = append(entries, entry{
			pid: p.Pid, name: name, cpu: cpu, memoryBytes: memBytes,
			suspicious: suspicious, suspiciousReason: reason,
			processType: classifyProcess(name),
			ppid:        ppid, parentName: parentName, exePath: exePath, cmdline: cmdline, systemdUnit: systemdUnit,
		})
	}

	sort.Slice(entries, func(i, j int) bool {
		return entries[i].cpu > entries[j].cpu
	})

	if len(entries) > 20 {
		entries = entries[:20]
	}

	result := make([]models.ProcessInfo, len(entries))
	for i, e := range entries {
		result[i] = models.ProcessInfo{
			PID:                      e.pid,
			PPID:                     e.ppid,
			Name:                     e.name,
			ParentName:               e.parentName,
			CPUPercent:               e.cpu,
			MemoryBytes:              e.memoryBytes,
			Suspicious:               e.suspicious,
			SuspiciousReason:         e.suspiciousReason,
			ProcessType:              e.processType,
			KillError:                e.killError,
			SuggestedKillOnSightName: suggestedKillOnSightName(e.name),
			ExePath:                  e.exePath,
			Cmdline:                  e.cmdline,
			SourceHint:               sourceHint(e.ppid, e.parentName, e.exePath, e.cmdline, e.systemdUnit),
			SystemdUnit:              e.systemdUnit,
		}
	}

	return &models.ProcessesResponse{
		Processes:      result,
		AutoKilled:     autoKilled,
		AutoKillFailed: autoKillFailed,
	}, nil
}

// dataDir returns the configured data directory, defaulting to /data.
func dataDir() string {
	if v := os.Getenv("DATA_DIR"); v != "" {
		return v
	}
	return "/data"
}
