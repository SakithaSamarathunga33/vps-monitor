package docker

import (
	"bytes"
	"testing"

	"github.com/docker/docker/pkg/stdcopy"
)

func TestParseDockerLogsMultiplexed(t *testing.T) {
	var input bytes.Buffer

	stdout := stdcopy.NewStdWriter(&input, stdcopy.Stdout)
	stderr := stdcopy.NewStdWriter(&input, stdcopy.Stderr)

	if _, err := stdout.Write([]byte("2026-05-19T00:00:00Z info booted\n")); err != nil {
		t.Fatalf("write stdout frame: %v", err)
	}
	if _, err := stderr.Write([]byte("2026-05-19T00:00:01Z error failed\n")); err != nil {
		t.Fatalf("write stderr frame: %v", err)
	}

	entries, err := parseDockerLogs(&input, true)
	if err != nil {
		t.Fatalf("parse multiplexed logs: %v", err)
	}

	if len(entries) != 2 {
		t.Fatalf("expected 2 entries, got %d", len(entries))
	}
	if entries[0].Stream != "stdout" || entries[0].Message != "info booted" {
		t.Fatalf("unexpected stdout entry: %#v", entries[0])
	}
	if entries[1].Stream != "stderr" || entries[1].Message != "error failed" {
		t.Fatalf("unexpected stderr entry: %#v", entries[1])
	}
}

func TestParseDockerLogsRawTTY(t *testing.T) {
	input := bytes.NewBufferString("2026-05-19T00:00:00Z info booted\n2026-05-19T00:00:01Z error failed\n")

	entries, err := parseDockerLogs(input, false)
	if err != nil {
		t.Fatalf("parse raw logs: %v", err)
	}

	if len(entries) != 2 {
		t.Fatalf("expected 2 entries, got %d", len(entries))
	}
	if entries[0].Stream != "stdout" || entries[0].Message != "info booted" {
		t.Fatalf("unexpected first entry: %#v", entries[0])
	}
	if entries[1].Stream != "stdout" || entries[1].Message != "error failed" {
		t.Fatalf("unexpected second entry: %#v", entries[1])
	}
}
