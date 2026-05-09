package system

import (
	"errors"
	"os"
	"strings"
	"testing"
)

func TestKillErrorMessageExplainsPermissionFailures(t *testing.T) {
	msg := KillErrorMessage(os.ErrPermission)

	if !strings.Contains(msg, "vps-monitor cannot signal this process") {
		t.Fatalf("expected actionable permission message, got %q", msg)
	}
}

func TestKillErrorMessagePreservesOtherFailures(t *testing.T) {
	err := errors.New("process already exited")

	if got := KillErrorMessage(err); got != err.Error() {
		t.Fatalf("KillErrorMessage() = %q, want %q", got, err.Error())
	}
}
