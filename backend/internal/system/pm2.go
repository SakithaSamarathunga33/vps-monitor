package system

import (
	"context"
	"encoding/json"
	"errors"
	"os/exec"
	"strconv"
	"strings"
	"time"

	"github.com/hhftechnology/vps-monitor/internal/models"
)

var ErrPM2Unavailable = errors.New("pm2 is not available")

const hostPM2JListScript = `
if command -v pm2 >/dev/null 2>&1; then
  pm2 jlist
  exit $?
fi
for pm2_bin in /usr/bin/pm2 /usr/local/bin/pm2 /root/.nvm/versions/node/*/bin/pm2 /home/*/.nvm/versions/node/*/bin/pm2; do
  if [ -x "$pm2_bin" ]; then
    case "$pm2_bin" in
      /home/*) user_home="/home/$(printf "%s" "$pm2_bin" | cut -d/ -f3)" ;;
      /root/*) user_home="/root" ;;
      *) user_home="" ;;
    esac
    if [ -n "$user_home" ] && [ -d "$user_home/.pm2" ]; then
      PM2_HOME="$user_home/.pm2" "$pm2_bin" jlist
    else
      "$pm2_bin" jlist
    fi
    exit $?
  fi
done
exit 127
`

type pm2Process struct {
	Name  string `json:"name"`
	PID   int    `json:"pid"`
	PMID  int    `json:"pm_id"`
	Monit struct {
		Memory uint64  `json:"memory"`
		CPU    float64 `json:"cpu"`
	} `json:"monit"`
	Env struct {
		Status       string `json:"status"`
		Namespace    string `json:"namespace"`
		PMUptime     int64  `json:"pm_uptime"`
		RestartTime  int    `json:"restart_time"`
		Script       string `json:"pm_exec_path"`
		CWD          string `json:"pm_cwd"`
		Interpreter  string `json:"exec_interpreter"`
		NodeArgs     string `json:"node_args"`
		Args         any    `json:"args"`
		PMOutLogPath string `json:"pm_out_log_path"`
		PMErrLogPath string `json:"pm_err_log_path"`
	} `json:"pm2_env"`
}

func GetPM2Apps(ctx context.Context) ([]models.ContainerInfo, error) {
	output, err := runPM2JList(ctx)
	if err != nil {
		return nil, err
	}

	var processes []pm2Process
	if err := json.Unmarshal(output, &processes); err != nil {
		return nil, err
	}

	apps := make([]models.ContainerInfo, 0, len(processes))
	for _, proc := range processes {
		name := strings.TrimSpace(proc.Name)
		if name == "" {
			name = "pm2-" + strconv.Itoa(proc.PMID)
		}

		state := normalizePM2Status(proc.Env.Status)
		created := time.Now().Unix()
		if proc.Env.PMUptime > 0 {
			created = proc.Env.PMUptime / 1000
		}

		command := proc.Env.Script
		if command == "" {
			command = proc.Env.Interpreter
		}

		apps = append(apps, models.ContainerInfo{
			ID:      "pm2:" + strconv.Itoa(proc.PMID),
			Names:   []string{name},
			Image:   "PM2",
			ImageID: "",
			Command: command,
			Created: created,
			State:   state,
			Status:  pm2StatusLabel(proc.Env.Status, proc.PID),
			Labels: map[string]string{
				"runtime": "pm2",
			},
			Host:    "local",
			Runtime: "pm2",
			PM2: &models.PM2Info{
				ID:           proc.PMID,
				PID:          proc.PID,
				Namespace:    proc.Env.Namespace,
				ScriptPath:   proc.Env.Script,
				CWD:          proc.Env.CWD,
				Interpreter:  proc.Env.Interpreter,
				RestartCount: proc.Env.RestartTime,
				CPUPercent:   proc.Monit.CPU,
				MemoryBytes:  proc.Monit.Memory,
			},
		})
	}

	return apps, nil
}

func runPM2JList(ctx context.Context) ([]byte, error) {
	if _, err := exec.LookPath("pm2"); err == nil {
		if output, cmdErr := exec.CommandContext(ctx, "pm2", "jlist").Output(); cmdErr == nil {
			return output, nil
		}
	}

	if _, err := exec.LookPath("nsenter"); err == nil {
		output, cmdErr := exec.CommandContext(
			ctx,
			"nsenter",
			"-t",
			"1",
			"-m",
			"-u",
			"-i",
			"-n",
			"-p",
			"--",
			"sh",
			"-lc",
			hostPM2JListScript,
		).Output()
		if cmdErr == nil {
			return output, nil
		}
	}

	return nil, ErrPM2Unavailable
}

func normalizePM2Status(status string) string {
	switch strings.ToLower(strings.TrimSpace(status)) {
	case "online", "launching":
		return "running"
	case "stopped", "errored":
		return "exited"
	case "stopping":
		return "dead"
	default:
		if status == "" {
			return "unknown"
		}
		return strings.ToLower(status)
	}
}

func pm2StatusLabel(status string, pid int) string {
	status = strings.TrimSpace(status)
	if status == "" {
		status = "unknown"
	}
	if pid > 0 {
		return status + " - PID " + strconv.Itoa(pid)
	}
	return status
}
