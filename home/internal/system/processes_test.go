package system

import (
	"context"
	"testing"
)

func TestGetProcessesReturnsCapped(t *testing.T) {
	ctx := context.Background()
	procs, err := GetProcesses(ctx)
	if err != nil {
		t.Fatalf("GetProcesses() error = %v", err)
	}
	if len(procs) > 20 {
		t.Fatalf("expected at most 20 processes, got %d", len(procs))
	}
}

func TestGetProcessesSortedByCPUDescending(t *testing.T) {
	ctx := context.Background()
	procs, err := GetProcesses(ctx)
	if err != nil {
		t.Fatalf("GetProcesses() error = %v", err)
	}
	for i := 1; i < len(procs); i++ {
		if procs[i].CPUPercent > procs[i-1].CPUPercent {
			t.Fatalf("not sorted: index %d cpu=%.2f > index %d cpu=%.2f",
				i, procs[i].CPUPercent, i-1, procs[i-1].CPUPercent)
		}
	}
}

func TestGetProcessesFieldsNonEmpty(t *testing.T) {
	ctx := context.Background()
	procs, err := GetProcesses(ctx)
	if err != nil {
		t.Fatalf("GetProcesses() error = %v", err)
	}
	if len(procs) == 0 {
		t.Skip("no processes returned — skipping field check")
	}
	for _, p := range procs {
		if p.PID == 0 {
			t.Fatalf("expected non-zero PID, got 0 for process %q", p.Name)
		}
		if p.Name == "" {
			t.Fatalf("expected non-empty Name for PID %d", p.PID)
		}
	}
}
