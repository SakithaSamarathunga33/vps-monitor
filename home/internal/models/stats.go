package models

// ContainerStats represents real-time container resource usage
type ContainerStats struct {
	ContainerID   string  `json:"container_id"`
	Host          string  `json:"host"`
	CPUPercent    float64 `json:"cpu_percent"`
	MemoryUsage   uint64  `json:"memory_usage"`
	MemoryLimit   uint64  `json:"memory_limit"`
	MemoryPercent float64 `json:"memory_percent"`
	NetworkRx     uint64  `json:"network_rx"`
	NetworkTx     uint64  `json:"network_tx"`
	BlockRead     uint64  `json:"block_read"`
	BlockWrite    uint64  `json:"block_write"`
	PIDs          uint64  `json:"pids"`
	Timestamp     int64   `json:"timestamp"`
}

type HistoricalAverages struct {
	CPU1h     float64          `json:"cpu_1h"`
	Memory1h  float64          `json:"memory_1h"`
	CPU12h    float64          `json:"cpu_12h"`
	Memory12h float64          `json:"memory_12h"`
	HasData   bool             `json:"has_data"`
	Samples   []ContainerStats `json:"samples,omitempty"`
}

// ProcessInfo holds per-process CPU/memory data for the processes endpoint.
type ProcessInfo struct {
	PID                      int32   `json:"pid"`
	PPID                     int32   `json:"ppid,omitempty"`
	Name                     string  `json:"name"`
	ParentName               string  `json:"parent_name,omitempty"`
	CPUPercent               float64 `json:"cpu_percent"`
	MemoryBytes              uint64  `json:"memory_bytes"`
	Suspicious               bool    `json:"suspicious"`
	SuspiciousReason         string  `json:"suspicious_reason,omitempty"`
	ProcessType              string  `json:"process_type"`
	KillError                string  `json:"kill_error,omitempty"`
	SuggestedKillOnSightName string  `json:"suggested_kill_on_sight_name,omitempty"`
	ExePath                  string  `json:"exe_path,omitempty"`
	Cmdline                  string  `json:"cmdline,omitempty"`
	SourceHint               string  `json:"source_hint,omitempty"`
	SystemdUnit              string  `json:"systemd_unit,omitempty"`
}

// ProcessKillFailure describes a kill-on-sight attempt that could not terminate
// a matching process.
type ProcessKillFailure struct {
	PID   int32  `json:"pid"`
	Name  string `json:"name"`
	Error string `json:"error"`
}

// ProcessesResponse is the JSON envelope returned by GET /api/v1/system/processes.
type ProcessesResponse struct {
	Processes      []ProcessInfo        `json:"processes"`
	AutoKilled     []string             `json:"auto_killed,omitempty"`
	AutoKillFailed []ProcessKillFailure `json:"auto_kill_failed,omitempty"`
}
