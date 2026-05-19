package system

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
)

// KillOnSightStore persists a set of process names that should be killed
// automatically whenever they are detected. The list is saved to
// <dataDir>/kill-on-sight.json so it survives container restarts.
type KillOnSightStore struct {
	path  string
	mu    sync.RWMutex
	names map[string]struct{}
}

var protectedExactKillOnSightNames = map[string]struct{}{
	"apache2": {}, "caddy": {}, "haproxy": {}, "httpd": {}, "nginx": {},
	"buildctl": {}, "buildkitd": {}, "containerd": {}, "containerd-shim": {},
	"docker": {}, "docker-init": {}, "docker-proxy": {}, "dockerd": {},
	"github-actions-runner": {}, "runner.listener": {}, "runner.worker": {},
	"run.sh": {}, "runsvc.sh": {},
	"mysql": {}, "mysqld": {}, "nccontd": {}, "postgres": {}, "redis-server": {},
	"pm2": {}, "runc": {},
}

var protectedKillOnSightPrefixes = []string{
	"actions.runner",
	"containerd-shim",
	"github-actions-runner",
	"pm2",
	"runner.listener",
	"runner.worker",
}

// NewKillOnSightStore loads (or creates) the kill-on-sight list from dataDir.
func NewKillOnSightStore(dataDir string) (*KillOnSightStore, error) {
	s := &KillOnSightStore{
		path:  filepath.Join(dataDir, "kill-on-sight.json"),
		names: make(map[string]struct{}),
	}
	if err := s.load(); err != nil && !os.IsNotExist(err) {
		return nil, err
	}
	return s, nil
}

// Contains reports whether name is in the kill-on-sight list. Entries ending
// in * are treated as prefix rules, e.g. "byobu-screen*".
func (s *KillOnSightStore) Contains(name string) bool {
	if IsProtectedKillOnSightName(name) {
		return false
	}

	s.mu.RLock()
	defer s.mu.RUnlock()
	for rule := range s.names {
		if IsProtectedExactKillOnSightName(rule) {
			continue
		}
		if killOnSightRuleMatches(rule, name) {
			return true
		}
	}
	return false
}

// Add adds name to the kill-on-sight list and persists it.
func (s *KillOnSightStore) Add(name string) error {
	if IsProtectedExactKillOnSightName(name) {
		return fmt.Errorf("%q is a protected service name; use a more specific wildcard or executable-path investigation", name)
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	s.names[name] = struct{}{}
	return s.save()
}

// Remove removes name from the kill-on-sight list and persists it.
func (s *KillOnSightStore) Remove(name string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.names, name)
	return s.save()
}

// List returns a slice of all names in the kill-on-sight list.
func (s *KillOnSightStore) List() []string {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]string, 0, len(s.names))
	for name := range s.names {
		out = append(out, name)
	}
	return out
}

func (s *KillOnSightStore) load() error {
	data, err := os.ReadFile(s.path)
	if err != nil {
		return err
	}
	var names []string
	if err := json.Unmarshal(data, &names); err != nil {
		return err
	}
	for _, name := range names {
		s.names[name] = struct{}{}
	}
	return nil
}

func (s *KillOnSightStore) save() error {
	names := make([]string, 0, len(s.names))
	for name := range s.names {
		names = append(names, name)
	}
	data, err := json.Marshal(names)
	if err != nil {
		return err
	}
	return os.WriteFile(s.path, data, 0644)
}

func IsProtectedExactKillOnSightName(name string) bool {
	normalized := strings.ToLower(strings.TrimSpace(name))
	if strings.Contains(normalized, "*") {
		return false
	}
	_, protected := protectedExactKillOnSightNames[normalized]
	return protected
}

func IsProtectedKillOnSightName(name string) bool {
	normalized := strings.ToLower(strings.TrimSpace(name))
	if IsProtectedExactKillOnSightName(normalized) {
		return true
	}
	for _, prefix := range protectedKillOnSightPrefixes {
		if strings.HasPrefix(normalized, prefix) {
			return true
		}
	}
	return false
}

func killOnSightRuleMatches(rule, name string) bool {
	lowerRule := strings.ToLower(rule)
	lowerName := strings.ToLower(name)
	if lowerRule == lowerName {
		return true
	}
	if strings.HasSuffix(lowerRule, "*") {
		prefix := strings.TrimSuffix(lowerRule, "*")
		return prefix != "" && strings.HasPrefix(lowerName, prefix)
	}
	return false
}
