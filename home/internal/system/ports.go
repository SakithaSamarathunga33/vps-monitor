package system

import (
	"context"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/hhftechnology/vps-monitor/internal/models"
	gopsnet "github.com/shirou/gopsutil/v4/net"
	"github.com/shirou/gopsutil/v4/process"
)

var defaultProjectPorts = []uint32{3000, 3001}

func ProjectPortsFromEnv() []uint32 {
	raw := strings.TrimSpace(os.Getenv("MONITORED_PROJECT_PORTS"))
	if raw == "" {
		raw = strings.TrimSpace(os.Getenv("PROJECT_PORTS"))
	}
	if raw == "" {
		return append([]uint32(nil), defaultProjectPorts...)
	}

	ports := make([]uint32, 0)
	seen := map[uint32]struct{}{}
	for _, part := range strings.Split(raw, ",") {
		value, err := strconv.ParseUint(strings.TrimSpace(part), 10, 16)
		if err != nil || value == 0 {
			continue
		}
		port := uint32(value)
		if _, ok := seen[port]; ok {
			continue
		}
		seen[port] = struct{}{}
		ports = append(ports, port)
	}
	if len(ports) == 0 {
		return append([]uint32(nil), defaultProjectPorts...)
	}
	sort.Slice(ports, func(i, j int) bool { return ports[i] < ports[j] })
	return ports
}

func GetListeningProjects(ctx context.Context, ports []uint32) ([]models.ContainerInfo, error) {
	if len(ports) == 0 {
		return nil, nil
	}

	wanted := make(map[uint32]struct{}, len(ports))
	for _, port := range ports {
		wanted[port] = struct{}{}
	}

	conns, err := gopsnet.ConnectionsWithContext(ctx, "inet")
	if err != nil {
		return nil, err
	}

	apps := make([]models.ContainerInfo, 0)
	seen := map[string]struct{}{}
	for _, conn := range conns {
		if strings.ToUpper(conn.Status) != "LISTEN" {
			continue
		}
		if _, ok := wanted[conn.Laddr.Port]; !ok || conn.Pid <= 0 {
			continue
		}

		key := strconv.Itoa(int(conn.Pid)) + ":" + strconv.Itoa(int(conn.Laddr.Port))
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}

		app := projectFromPID(ctx, conn.Pid, conn.Laddr.Port)
		if app.Process != nil && isDockerListenerProcess(app.Process.Name) {
			continue
		}
		apps = append(apps, app)
	}

	sort.Slice(apps, func(i, j int) bool {
		return apps[i].Process.Port < apps[j].Process.Port
	})
	return apps, nil
}

func isDockerListenerProcess(name string) bool {
	_, ok := dockerProcessNames[strings.ToLower(strings.TrimSpace(name))]
	return ok
}

func projectFromPID(ctx context.Context, pid int32, port uint32) models.ContainerInfo {
	name := "project-" + strconv.Itoa(int(port))
	var ppid int32
	var cmdline string
	var exePath string
	var dir string
	created := time.Now().Unix()

	if p, err := process.NewProcessWithContext(ctx, pid); err == nil {
		if value, err := p.NameWithContext(ctx); err == nil && strings.TrimSpace(value) != "" {
			name = strings.TrimSpace(value)
		}
		if value, err := p.PpidWithContext(ctx); err == nil {
			ppid = value
		}
		if value, err := p.CmdlineWithContext(ctx); err == nil {
			cmdline = value
		}
		if value, err := p.ExeWithContext(ctx); err == nil {
			exePath = value
		}
		if value, err := p.CreateTimeWithContext(ctx); err == nil && value > 0 {
			created = value / 1000
		}
	}

	dir = projectDirectoryFromCmdline(cmdline)
	if dir == "" && exePath != "" {
		dir = filepath.Dir(exePath)
	}

	displayName := name
	if dir != "" {
		displayName = filepath.Base(dir)
	}
	if strings.TrimSpace(displayName) == "" || displayName == "." || displayName == string(filepath.Separator) {
		displayName = name
	}

	return models.ContainerInfo{
		ID:      "process:" + strconv.Itoa(int(pid)) + ":" + strconv.Itoa(int(port)),
		Names:   []string{displayName},
		Image:   "Process",
		Command: cmdline,
		Created: created,
		State:   "running",
		Status:  "listening on port " + strconv.Itoa(int(port)) + " - PID " + strconv.Itoa(int(pid)),
		Labels: map[string]string{
			"runtime": "process",
			"port":    strconv.Itoa(int(port)),
		},
		Host:    "local",
		Runtime: "process",
		Process: &models.ProcessAppInfo{
			PID:       pid,
			PPID:      ppid,
			Port:      port,
			Name:      name,
			Cmdline:   cmdline,
			ExePath:   exePath,
			Directory: dir,
		},
	}
}

func projectDirectoryFromCmdline(cmdline string) string {
	fields := strings.Fields(cmdline)
	for _, field := range fields {
		candidate := strings.Trim(field, `"'`)
		if strings.HasPrefix(candidate, "--prefix=") {
			candidate = strings.TrimPrefix(candidate, "--prefix=")
		}
		if candidate == "" || strings.HasPrefix(candidate, "-") {
			continue
		}
		if info, err := os.Stat(candidate); err == nil && info.IsDir() {
			return candidate
		}
		if base := filepath.Base(candidate); base == "package.json" {
			return filepath.Dir(candidate)
		}
	}
	return ""
}
