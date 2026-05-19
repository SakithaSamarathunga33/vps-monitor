package system

import (
	"context"
	"sync"
	"time"
)

const (
	historyMaxPoints = 120
)

type HostStatPoint struct {
	Timestamp     int64   `json:"ts"`
	CPUPercent    float64 `json:"cpu"`
	MemoryPercent float64 `json:"mem"`
	DiskPercent   float64 `json:"disk"`
	RxBytes       uint64  `json:"rx"`
	TxBytes       uint64  `json:"tx"`
}

var globalHostHistory = struct {
	mu     sync.RWMutex
	points []HostStatPoint
}{
	points: make([]HostStatPoint, 0, historyMaxPoints),
}

func recordHostStats(s *SystemStats) {
	globalHostHistory.mu.Lock()
	defer globalHostHistory.mu.Unlock()

	pt := HostStatPoint{
		Timestamp:     time.Now().Unix(),
		CPUPercent:    s.Usage.CPUPercent,
		MemoryPercent: s.Usage.MemoryPercent,
		DiskPercent:   s.Usage.DiskPercent,
		RxBytes:       s.Network.RxBytes,
		TxBytes:       s.Network.TxBytes,
	}

	globalHostHistory.points = append(globalHostHistory.points, pt)
	if len(globalHostHistory.points) > historyMaxPoints {
		globalHostHistory.points = globalHostHistory.points[len(globalHostHistory.points)-historyMaxPoints:]
	}
}

func GetHostStatsHistory() []HostStatPoint {
	globalHostHistory.mu.RLock()
	defer globalHostHistory.mu.RUnlock()

	out := make([]HostStatPoint, len(globalHostHistory.points))
	copy(out, globalHostHistory.points)
	return out
}

// StartHostStatsCollector samples host stats every 5 seconds in the background.
func StartHostStatsCollector() {
	go func() {
		ticker := time.NewTicker(5 * time.Second)
		defer ticker.Stop()
		for range ticker.C {
			ctx, cancel := context.WithTimeout(context.Background(), 4*time.Second)
			s, err := GetStats(ctx)
			cancel()
			if err == nil {
				recordHostStats(s)
			}
		}
	}()
}
