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
