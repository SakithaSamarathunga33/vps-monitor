package system

import (
	"reflect"
	"testing"
)

func TestProjectPortsFromEnvDefaultsToCommonNodePorts(t *testing.T) {
	t.Setenv("MONITORED_PROJECT_PORTS", "")
	t.Setenv("PROJECT_PORTS", "")

	got := ProjectPortsFromEnv()
	want := []uint32{3000, 3001}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("ProjectPortsFromEnv() = %v, want %v", got, want)
	}
}

func TestProjectPortsFromEnvParsesUniqueSortedPorts(t *testing.T) {
	t.Setenv("MONITORED_PROJECT_PORTS", "3001, 3000, bad, 3001")

	got := ProjectPortsFromEnv()
	want := []uint32{3000, 3001}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("ProjectPortsFromEnv() = %v, want %v", got, want)
	}
}

func TestIsDockerListenerProcess(t *testing.T) {
	if !isDockerListenerProcess("docker-proxy") {
		t.Fatal("expected docker-proxy to be treated as a Docker listener")
	}
	if isDockerListenerProcess("node") {
		t.Fatal("did not expect node to be treated as a Docker listener")
	}
}

func TestParseSSListeners(t *testing.T) {
	output := `
LISTEN 0 511 0.0.0.0:3000 0.0.0.0:* users:(("node",pid=1234,fd=20))
LISTEN 0 511 [::]:3001 [::]:* users:(("node",pid=1235,fd=20))
LISTEN 0 511 0.0.0.0:6789 0.0.0.0:* users:(("vps-monitor",pid=2,fd=7))
`

	got := parseSSListeners(output, []uint32{3000, 3001})
	want := []portListener{
		{pid: 1234, port: 3000},
		{pid: 1235, port: 3001},
	}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("parseSSListeners() = %v, want %v", got, want)
	}
}
