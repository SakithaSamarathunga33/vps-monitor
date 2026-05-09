package system

import (
	"context"
	"os"
	"runtime"
	"sort"
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
	"sysupdate": {}, "networkservice": {}, "ld-musl": {},
}

var suspiciousExePrefixes = []string{
	"/tmp/", "/dev/shm/", "/var/tmp/", "/run/shm/",
}

// checkSuspicious runs all four heuristics and returns (suspicious, reason).
// p may be nil when called from tests that only exercise name/CPU checks.
func checkSuspicious(ctx context.Context, p *process.Process, name string, cpu float64) (bool, string) {
	// 1. Sustained high CPU: flag if >80% on two consecutive polls.
	if p != nil && cpu > 80 {
		if prev, ok := cpuHistory.Load(p.Pid); ok && prev.(float64) > 80 {
			return true, "High CPU"
		}
	}

	// 2. Known bad name.
	if _, bad := knownBadNames[strings.ToLower(name)]; bad {
		return true, "Known malware name"
	}

	// 3. Empty or non-printable name.
	if name == "" || !isPrintableASCII(name) {
		return true, "Invalid process name"
	}

	// 4. Executable in a suspicious directory.
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
		name             string
		cpu              float64
		suspicious       bool
		suspiciousReason string
	}

	var autoKilled []string
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

		// Auto-kill if on the kill-on-sight list.
		if store != nil && store.Contains(name) {
			_ = p.KillWithContext(ctx)
			autoKilled = append(autoKilled, name)
			cpuHistory.Delete(p.Pid)
			continue
		}

		suspicious, reason := checkSuspicious(ctx, p, name, cpu)
		cpuHistory.Store(p.Pid, cpu)

		entries = append(entries, entry{
			pid: p.Pid, name: name, cpu: cpu,
			suspicious: suspicious, suspiciousReason: reason,
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
			PID:              e.pid,
			Name:             e.name,
			CPUPercent:       e.cpu,
			Suspicious:       e.suspicious,
			SuspiciousReason: e.suspiciousReason,
		}
	}

	return &models.ProcessesResponse{
		Processes:  result,
		AutoKilled: autoKilled,
	}, nil
}

// dataDir returns the configured data directory, defaulting to /data.
func dataDir() string {
	if v := os.Getenv("DATA_DIR"); v != "" {
		return v
	}
	return "/data"
}
