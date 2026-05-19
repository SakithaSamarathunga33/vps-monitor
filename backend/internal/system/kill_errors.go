package system

import (
	"errors"
	"os"
	"strings"
)

const killPermissionErrorMessage = "permission denied: vps-monitor cannot signal this process. Recreate the container with host PID access and privileged/CAP_KILL permissions, or kill it manually on the host."

// IsKillPermissionError reports whether err means the monitor lacks permission
// to signal a process on the host.
func IsKillPermissionError(err error) bool {
	if err == nil {
		return false
	}
	if errors.Is(err, os.ErrPermission) {
		return true
	}
	msg := strings.ToLower(err.Error())
	return strings.Contains(msg, "permission denied") || strings.Contains(msg, "operation not permitted")
}

// KillErrorMessage returns a user-facing explanation for process kill failures.
func KillErrorMessage(err error) string {
	if err == nil {
		return ""
	}
	if IsKillPermissionError(err) {
		return killPermissionErrorMessage
	}
	return err.Error()
}
