package docker

import (
	"bytes"
	"context"
	"fmt"
	"io"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/pkg/stdcopy"
)

// CreateExec creates an exec instance for a container
// It tries to launch /bin/bash, falling back to /bin/sh if bash is not available
func (c *MultiHostClient) CreateExec(ctx context.Context, host, containerID string) (string, error) {
	cli, err := c.GetClient(host)
	if err != nil {
		return "", err
	}

	// We use a shell command that tries bash first, then sh
	// This is a common pattern to get the best available shell
	cmd := []string{"/bin/sh", "-c", "(test -x /bin/bash && exec /bin/bash) || exec /bin/sh"}

	config := container.ExecOptions{
		AttachStdin:  true,
		AttachStdout: true,
		AttachStderr: true,
		Tty:          true,
		Cmd:          cmd,
	}

	response, err := cli.ContainerExecCreate(ctx, containerID, config)
	if err != nil {
		return "", fmt.Errorf("failed to create exec: %w", err)
	}

	return response.ID, nil
}

// AttachExec attaches to an existing exec instance and returns the hijacked response
func (c *MultiHostClient) AttachExec(ctx context.Context, host, execID string) (*types.HijackedResponse, error) {
	cli, err := c.GetClient(host)
	if err != nil {
		return nil, err
	}

	resp, err := cli.ContainerExecAttach(ctx, execID, container.ExecStartOptions{
		Tty: true,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to attach to exec: %w", err)
	}

	return &resp, nil
}

// ResizeExec resizes the tty for an exec instance
func (c *MultiHostClient) ResizeExec(ctx context.Context, host, execID string, height, width uint) error {
	cli, err := c.GetClient(host)
	if err != nil {
		return err
	}

	return cli.ContainerExecResize(ctx, execID, container.ResizeOptions{
		Height: height,
		Width:  width,
	})
}

// RunExecCommand runs a non-interactive command inside a container and returns
// combined stdout/stderr output.
func (c *MultiHostClient) RunExecCommand(ctx context.Context, host, containerID string, cmd []string, env []string) (string, error) {
	cli, err := c.GetClient(host)
	if err != nil {
		return "", err
	}

	response, err := cli.ContainerExecCreate(ctx, containerID, container.ExecOptions{
		AttachStdout: true,
		AttachStderr: true,
		Tty:          false,
		Cmd:          cmd,
		Env:          env,
	})
	if err != nil {
		return "", fmt.Errorf("failed to create exec: %w", err)
	}

	resp, err := cli.ContainerExecAttach(ctx, response.ID, container.ExecStartOptions{
		Tty: false,
	})
	if err != nil {
		return "", fmt.Errorf("failed to attach exec: %w", err)
	}
	defer resp.Close()

	var stdout bytes.Buffer
	var stderr bytes.Buffer
	if _, err := stdcopy.StdCopy(&stdout, &stderr, resp.Reader); err != nil && err != io.EOF {
		return "", fmt.Errorf("failed to read exec output: %w", err)
	}

	inspect, err := cli.ContainerExecInspect(ctx, response.ID)
	if err != nil {
		return "", fmt.Errorf("failed to inspect exec: %w", err)
	}

	if inspect.ExitCode != 0 {
		output := stdout.String()
		if stderr.Len() > 0 {
			output += stderr.String()
		}
		return output, fmt.Errorf("exec command exited with code %d: %s", inspect.ExitCode, output)
	}

	return stdout.String(), nil
}

// GetClientExport exposes GetClient for use in other packages if needed
// although it is already exported in client.go, this is just a comment reminder
