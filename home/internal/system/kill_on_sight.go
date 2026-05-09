package system

import (
	"encoding/json"
	"os"
	"path/filepath"
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

// Contains reports whether name is in the kill-on-sight list.
func (s *KillOnSightStore) Contains(name string) bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	_, ok := s.names[name]
	return ok
}

// Add adds name to the kill-on-sight list and persists it.
func (s *KillOnSightStore) Add(name string) error {
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
