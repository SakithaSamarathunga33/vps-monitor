package system

import (
	"context"
	"runtime"
	"sort"

	"github.com/hhftechnology/vps-monitor/internal/models"
	"github.com/shirou/gopsutil/v4/process"
)

// GetProcesses returns the top 20 host processes sorted by CPU percent descending.
// It respects HOST_PROC so it reads from /host/proc when running in a container.
func GetProcesses(ctx context.Context) ([]models.ProcessInfo, error) {
	procs, err := process.ProcessesWithContext(ctx)
	if err != nil {
		return nil, err
	}

	type entry struct {
		pid  int32
		name string
		cpu  float64
	}

	numCPU := float64(runtime.NumCPU())
	if numCPU < 1 {
		numCPU = 1
	}

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
		entries = append(entries, entry{pid: p.Pid, name: name, cpu: cpu / numCPU})
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
			PID:        e.pid,
			Name:       e.name,
			CPUPercent: e.cpu,
		}
	}
	return result, nil
}
