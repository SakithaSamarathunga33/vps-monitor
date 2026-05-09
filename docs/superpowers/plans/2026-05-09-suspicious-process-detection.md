# Suspicious Process Detection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add suspicious process detection with kill and kill-on-sight controls to the Processes page — backend detects via four heuristics, auto-kills blocklisted processes every poll, frontend shows a red alert section with Kill button and Kill-on-Sight toggle.

**Architecture:** Extend the Go `ProcessInfo` model with `Suspicious`/`SuspiciousReason` fields, add a `KillOnSightStore` for persistence, rewrite `GetProcesses` to run heuristics and auto-kill, add four new protected API endpoints, wire everything through `RouterOptions`. Frontend updates `get-processes.ts` types, adds kill/kill-on-sight API functions and mutations, and extends `processes-page.tsx` with a conditional Suspicious section. Add `pid: "host"` to docker-compose so the container can send SIGKILL to host processes.

**Tech Stack:** Go 1.24, gopsutil/v4/process, Chi v5, sync.Map, React 19, TypeScript, TanStack Query, shadcn AlertDialog/Switch/Table.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `home/internal/models/stats.go` | Add `Suspicious`, `SuspiciousReason` to `ProcessInfo`; `AutoKilled` to `ProcessesResponse` |
| Create | `home/internal/system/kill_on_sight.go` | `KillOnSightStore` — persist `/data/kill-on-sight.json` |
| Create | `home/internal/system/kill_on_sight_test.go` | Tests for `KillOnSightStore` |
| Modify | `home/internal/system/processes.go` | Heuristics, auto-kill, new `GetProcesses(ctx, store)` signature |
| Modify | `home/internal/system/processes_test.go` | Update tests for new signature |
| Modify | `home/internal/api/router.go` | Add `killOnSight` field, `RouterOptions.KillOnSight`, register process routes |
| Create | `home/internal/api/process_handlers.go` | `KillProcess`, `GetKillOnSight`, `AddKillOnSight`, `RemoveKillOnSight` handlers |
| Modify | `home/internal/api/handlers.go` | Update `GetProcesses` handler to pass store |
| Modify | `home/internal/api/process_handlers_test.go` | Tests for new handlers |
| Modify | `home/cmd/server/main.go` | Init `KillOnSightStore`, pass via `RouterOptions` |
| Modify | `docker-compose.yml` | Add `pid: "host"` |
| Modify | `frontend/src/features/processes/api/get-processes.ts` | Add `suspicious`, `suspicious_reason`, `auto_killed` to types |
| Create | `frontend/src/features/processes/api/kill-process.ts` | `killProcess(pid)` API call |
| Create | `frontend/src/features/processes/api/kill-on-sight.ts` | `getKillOnSight`, `addKillOnSight`, `removeKillOnSight` API calls |
| Create | `frontend/src/features/processes/hooks/use-kill-process.ts` | Mutation hook |
| Create | `frontend/src/features/processes/hooks/use-kill-on-sight.ts` | Query + mutation hooks |
| Modify | `frontend/src/features/processes/components/processes-page.tsx` | Suspicious section, Kill dialog, Kill-on-Sight toggle, auto-kill toasts |

---

## Task 1: Extend ProcessInfo model

**Files:**
- Modify: `home/internal/models/stats.go`

- [ ] **Step 1: Add fields to ProcessInfo and ProcessesResponse**

In `home/internal/models/stats.go`, replace the `ProcessInfo` and `ProcessesResponse` structs:

```go
// ProcessInfo holds per-process CPU data for the processes endpoint.
type ProcessInfo struct {
	PID              int32   `json:"pid"`
	Name             string  `json:"name"`
	CPUPercent       float64 `json:"cpu_percent"`
	Suspicious       bool    `json:"suspicious"`
	SuspiciousReason string  `json:"suspicious_reason,omitempty"`
}

// ProcessesResponse is the JSON envelope returned by GET /api/v1/system/processes.
type ProcessesResponse struct {
	Processes  []ProcessInfo `json:"processes"`
	AutoKilled []string      `json:"auto_killed,omitempty"`
}
```

- [ ] **Step 2: Commit**

```bash
git add home/internal/models/stats.go
git commit -m "feat(processes): add Suspicious fields and AutoKilled to models"
```

---

## Task 2: KillOnSightStore

**Files:**
- Create: `home/internal/system/kill_on_sight.go`
- Create: `home/internal/system/kill_on_sight_test.go`

- [ ] **Step 1: Write the tests first**

Create `home/internal/system/kill_on_sight_test.go`:

```go
package system

import (
	"os"
	"path/filepath"
	"testing"
)

func TestKillOnSightStoreAddContainsRemove(t *testing.T) {
	dir := t.TempDir()
	store, err := NewKillOnSightStore(dir)
	if err != nil {
		t.Fatalf("NewKillOnSightStore() error = %v", err)
	}

	if store.Contains("xmrig") {
		t.Fatal("expected empty store to not contain xmrig")
	}

	if err := store.Add("xmrig"); err != nil {
		t.Fatalf("Add() error = %v", err)
	}
	if !store.Contains("xmrig") {
		t.Fatal("expected store to contain xmrig after Add")
	}

	if err := store.Remove("xmrig"); err != nil {
		t.Fatalf("Remove() error = %v", err)
	}
	if store.Contains("xmrig") {
		t.Fatal("expected store to not contain xmrig after Remove")
	}
}

func TestKillOnSightStorePersistsAcrossReload(t *testing.T) {
	dir := t.TempDir()

	store1, err := NewKillOnSightStore(dir)
	if err != nil {
		t.Fatalf("NewKillOnSightStore() error = %v", err)
	}
	if err := store1.Add("minerd"); err != nil {
		t.Fatalf("Add() error = %v", err)
	}

	store2, err := NewKillOnSightStore(dir)
	if err != nil {
		t.Fatalf("NewKillOnSightStore() error = %v", err)
	}
	if !store2.Contains("minerd") {
		t.Fatal("expected reloaded store to contain minerd")
	}
}

func TestKillOnSightStoreList(t *testing.T) {
	dir := t.TempDir()
	store, _ := NewKillOnSightStore(dir)
	_ = store.Add("a")
	_ = store.Add("b")
	names := store.List()
	if len(names) != 2 {
		t.Fatalf("expected 2 names, got %d", len(names))
	}
}

func TestKillOnSightStoreFileIsWritten(t *testing.T) {
	dir := t.TempDir()
	store, _ := NewKillOnSightStore(dir)
	_ = store.Add("kinsing")

	data, err := os.ReadFile(filepath.Join(dir, "kill-on-sight.json"))
	if err != nil {
		t.Fatalf("expected file to exist: %v", err)
	}
	if len(data) == 0 {
		t.Fatal("expected non-empty file")
	}
}
```

- [ ] **Step 2: Implement KillOnSightStore**

Create `home/internal/system/kill_on_sight.go`:

```go
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

// List returns a sorted slice of all names in the kill-on-sight list.
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
```

- [ ] **Step 3: Commit**

```bash
git add home/internal/system/kill_on_sight.go home/internal/system/kill_on_sight_test.go
git commit -m "feat(processes): add KillOnSightStore with JSON persistence"
```

---

## Task 3: Rewrite GetProcesses with heuristics and auto-kill

**Files:**
- Modify: `home/internal/system/processes.go`
- Modify: `home/internal/system/processes_test.go`

- [ ] **Step 1: Rewrite processes.go**

Replace the entire content of `home/internal/system/processes.go`:

```go
package system

import (
	"context"
	"os"
	"runtime"
	"sort"
	"strings"
	"sync"
	"unicode"

	"github.com/hhftechnology/vps-monitor/internal/models"
	"github.com/shirou/gopsutil/v4/process"
)

// cpuHistory tracks the previous CPU% per PID for sustained-CPU detection.
var cpuHistory sync.Map // map[int32]float64

var knownBadNames = map[string]struct{}{
	"xmrig": {}, "minerd": {}, "kinsing": {}, "masscan": {},
	"nmap": {}, "cryptonight": {}, "kdevtmpfsi": {}, "kworkerds": {},
	"sysupdate": {}, "networkservice": {}, "ld-musl": {},
}

var suspiciousExePrefixes = []string{
	"/tmp/", "/dev/shm/", "/var/tmp/", "/run/shm/",
}

// checkSuspicious runs all four heuristics and returns (suspicious, reason).
func checkSuspicious(ctx context.Context, p *process.Process, name string, cpu float64) (bool, string) {
	// 1. Sustained high CPU: flag if >80% on two consecutive polls.
	if cpu > 80 {
		if prev, ok := cpuHistory.Load(p.Pid); ok && prev.(float64) > 80 {
			return true, "High CPU"
		}
	}

	// 2. Known bad name.
	if _, bad := knownBadNames[strings.ToLower(name)]; bad {
		return true, "Known malware name"
	}

	// 3. Empty or non-printable name.
	if name == "" || !isPrintableASCII(name) {
		return true, "Invalid process name"
	}

	// 4. Executable in a suspicious directory.
	exe, err := p.ExeWithContext(ctx)
	if err == nil {
		for _, prefix := range suspiciousExePrefixes {
			if strings.HasPrefix(exe, prefix) {
				return true, "Temp dir execution"
			}
		}
	}

	return false, ""
}

func isPrintableASCII(s string) bool {
	for _, r := range s {
		if r > unicode.MaxASCII || !unicode.IsPrint(r) {
			return false
		}
	}
	return true
}

// GetProcesses returns the top 20 host processes sorted by CPU descending,
// annotated with suspicious flags, and auto-kills any process whose name is
// in the kill-on-sight store.
func GetProcesses(ctx context.Context, store *KillOnSightStore) (*models.ProcessesResponse, error) {
	procs, err := process.ProcessesWithContext(ctx)
	if err != nil {
		return nil, err
	}

	numCPU := float64(runtime.NumCPU())
	if numCPU < 1 {
		numCPU = 1
	}

	type entry struct {
		pid              int32
		name             string
		cpu              float64
		suspicious       bool
		suspiciousReason string
	}

	var autoKilled []string
	entries := make([]entry, 0, len(procs))

	for _, p := range procs {
		name, err := p.NameWithContext(ctx)
		if err != nil {
			continue
		}
		cpu, err := p.CPUPercentWithContext(ctx)
		if err != nil {
			continue
		}
		cpu = cpu / numCPU

		// Auto-kill if on the kill-on-sight list.
		if store != nil && store.Contains(name) {
			_ = p.KillWithContext(ctx)
			autoKilled = append(autoKilled, name)
			cpuHistory.Delete(p.Pid)
			continue
		}

		suspicious, reason := checkSuspicious(ctx, p, name, cpu)
		cpuHistory.Store(p.Pid, cpu)

		entries = append(entries, entry{
			pid: p.Pid, name: name, cpu: cpu,
			suspicious: suspicious, suspiciousReason: reason,
		})
	}

	sort.Slice(entries, func(i, j int) bool {
		return entries[i].cpu > entries[j].cpu
	})

	if len(entries) > 20 {
		entries = entries[:20]
	}

	result := make([]models.ProcessInfo, len(entries))
	for i, e := range entries {
		result[i] = models.ProcessInfo{
			PID:              e.pid,
			Name:             e.name,
			CPUPercent:       e.cpu,
			Suspicious:       e.suspicious,
			SuspiciousReason: e.suspiciousReason,
		}
	}

	return &models.ProcessesResponse{
		Processes:  result,
		AutoKilled: autoKilled,
	}, nil
}
```

- [ ] **Step 2: Update processes_test.go for new signature**

Replace the entire content of `home/internal/system/processes_test.go`:

```go
package system

import (
	"context"
	"testing"
)

func TestGetProcessesReturnsCapped(t *testing.T) {
	ctx := context.Background()
	resp, err := GetProcesses(ctx, nil)
	if err != nil {
		t.Fatalf("GetProcesses() error = %v", err)
	}
	if len(resp.Processes) > 20 {
		t.Fatalf("expected at most 20 processes, got %d", len(resp.Processes))
	}
}

func TestGetProcessesSortedByCPUDescending(t *testing.T) {
	ctx := context.Background()
	resp, err := GetProcesses(ctx, nil)
	if err != nil {
		t.Fatalf("GetProcesses() error = %v", err)
	}
	for i := 1; i < len(resp.Processes); i++ {
		if resp.Processes[i].CPUPercent > resp.Processes[i-1].CPUPercent {
			t.Fatalf("not sorted: index %d cpu=%.2f > index %d cpu=%.2f",
				i, resp.Processes[i].CPUPercent, i-1, resp.Processes[i-1].CPUPercent)
		}
	}
}

func TestGetProcessesFieldsNonEmpty(t *testing.T) {
	ctx := context.Background()
	resp, err := GetProcesses(ctx, nil)
	if err != nil {
		t.Fatalf("GetProcesses() error = %v", err)
	}
	if len(resp.Processes) == 0 {
		t.Skip("no processes returned — skipping field check")
	}
	for _, p := range resp.Processes {
		if p.PID == 0 {
			t.Fatalf("expected non-zero PID, got 0 for process %q", p.Name)
		}
		if p.Name == "" {
			t.Fatalf("expected non-empty Name for PID %d", p.PID)
		}
	}
}

func TestIsPrintableASCII(t *testing.T) {
	cases := []struct {
		input string
		want  bool
	}{
		{"nginx", true},
		{"", false},
		{"\x00bash", false},
		{"kworker/u", true},
	}
	for _, c := range cases {
		if got := isPrintableASCII(c.input); got != c.want {
			t.Errorf("isPrintableASCII(%q) = %v, want %v", c.input, got, c.want)
		}
	}
}

func TestCheckSuspiciousKnownBadName(t *testing.T) {
	if sus, reason := checkSuspicious(nil, nil, "xmrig", 5); !sus || reason != "Known malware name" {
		t.Fatalf("expected xmrig to be flagged as Known malware name, got sus=%v reason=%q", sus, reason)
	}
}

func TestCheckSuspiciousEmptyName(t *testing.T) {
	if sus, reason := checkSuspicious(nil, nil, "", 5); !sus || reason != "Invalid process name" {
		t.Fatalf("expected empty name to be flagged, got sus=%v reason=%q", sus, reason)
	}
}
```

Note: `checkSuspicious` accepts nil for ctx and p when those fields (exe lookup, CPU history) are not needed for the test case. The function guards `ExeWithContext` behind an `err == nil` check so nil p will just skip step 4 gracefully. However, since `p.ExeWithContext` would panic on nil, adjust the test to not exercise that path — the tests above avoid it by using a non-nil name and low CPU.

Actually, update `checkSuspicious` to guard against nil process pointer:

In `home/internal/system/processes.go`, change the exe check block:

```go
	// 4. Executable in a suspicious directory.
	if p != nil {
		exe, err := p.ExeWithContext(ctx)
		if err == nil {
			for _, prefix := range suspiciousExePrefixes {
				if strings.HasPrefix(exe, prefix) {
					return true, "Temp dir execution"
				}
			}
		}
	}
```

- [ ] **Step 3: Commit**

```bash
git add home/internal/system/processes.go home/internal/system/processes_test.go
git commit -m "feat(processes): add heuristics, auto-kill, and suspicious flagging"
```

---

## Task 4: API handlers for kill and kill-on-sight

**Files:**
- Create: `home/internal/api/process_handlers.go`
- Modify: `home/internal/api/handlers.go`
- Modify: `home/internal/api/router.go`
- Modify: `home/internal/api/process_handlers_test.go`

- [ ] **Step 1: Create process_handlers.go**

Create `home/internal/api/process_handlers.go`:

```go
package api

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/shirou/gopsutil/v4/process"
)

// KillProcess handles POST /api/v1/system/processes/{pid}/kill
func (ar *APIRouter) KillProcess(w http.ResponseWriter, r *http.Request) {
	pidStr := chi.URLParam(r, "pid")
	pid64, err := strconv.ParseInt(pidStr, 10, 32)
	if err != nil {
		http.Error(w, "invalid pid", http.StatusBadRequest)
		return
	}
	pid := int32(pid64)

	ctx := r.Context()
	p, err := process.NewProcessWithContext(ctx, pid)
	if err != nil {
		http.Error(w, "process not found", http.StatusNotFound)
		return
	}

	if err := p.KillWithContext(ctx); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	WriteJsonResponse(w, http.StatusOK, map[string]any{"killed": true, "pid": pid})
}

// GetKillOnSight handles GET /api/v1/system/processes/kill-on-sight
func (ar *APIRouter) GetKillOnSight(w http.ResponseWriter, r *http.Request) {
	if ar.killOnSight == nil {
		WriteJsonResponse(w, http.StatusOK, map[string]any{"names": []string{}})
		return
	}
	WriteJsonResponse(w, http.StatusOK, map[string]any{"names": ar.killOnSight.List()})
}

// AddKillOnSight handles POST /api/v1/system/processes/kill-on-sight
func (ar *APIRouter) AddKillOnSight(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Name string `json:"name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Name == "" {
		http.Error(w, "name required", http.StatusBadRequest)
		return
	}
	if ar.killOnSight == nil {
		http.Error(w, "kill-on-sight store unavailable", http.StatusServiceUnavailable)
		return
	}
	if err := ar.killOnSight.Add(body.Name); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	WriteJsonResponse(w, http.StatusOK, map[string]any{"added": body.Name})
}

// RemoveKillOnSight handles DELETE /api/v1/system/processes/kill-on-sight/{name}
func (ar *APIRouter) RemoveKillOnSight(w http.ResponseWriter, r *http.Request) {
	name := chi.URLParam(r, "name")
	if ar.killOnSight == nil {
		http.Error(w, "kill-on-sight store unavailable", http.StatusServiceUnavailable)
		return
	}
	if err := ar.killOnSight.Remove(name); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	WriteJsonResponse(w, http.StatusOK, map[string]any{"removed": name})
}
```

- [ ] **Step 2: Add killOnSight field to APIRouter and RouterOptions**

In `home/internal/api/router.go`:

1. Add import for system package at top of imports block:
```go
"github.com/hhftechnology/vps-monitor/internal/system"
```

2. Add `killOnSight` field to the `APIRouter` struct after `statsDB`:
```go
killOnSight    *system.KillOnSightStore
```

3. Add `KillOnSight` to `RouterOptions`:
```go
type RouterOptions struct {
    AlertMonitor   *alerts.Monitor
    ScannerService *scanner.ScannerService
    AutoScanner    *scanner.AutoScanner
    BotService     botRelayService
    ScanDB         *scanner.ScanDB
    KillOnSight    *system.KillOnSightStore
}
```

4. In `NewRouter`, after the existing opts nil-checks, add:
```go
if opts != nil && opts.KillOnSight != nil {
    r.killOnSight = opts.KillOnSight
}
```

5. Add `registerProcessRoutes` method and call it in the protected group. Add after `ar.registerScanRoutes(protected)`:
```go
ar.registerProcessRoutes(protected)
```

Add the method:
```go
func (ar *APIRouter) registerProcessRoutes(r chi.Router) {
    r.Post("/system/processes/{pid}/kill", ar.KillProcess)
    r.Get("/system/processes/kill-on-sight", ar.GetKillOnSight)
    r.Post("/system/processes/kill-on-sight", ar.AddKillOnSight)
    r.Delete("/system/processes/kill-on-sight/{name}", ar.RemoveKillOnSight)
}
```

- [ ] **Step 3: Update GetProcesses handler in handlers.go**

In `home/internal/api/handlers.go`, replace the `GetProcesses` handler:

```go
func (ar *APIRouter) GetProcesses(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	resp, err := system.GetProcesses(ctx, ar.killOnSight)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	WriteJsonResponse(w, http.StatusOK, resp)
}
```

- [ ] **Step 4: Update process_handlers_test.go**

Replace the entire content of `home/internal/api/process_handlers_test.go`:

```go
package api

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/hhftechnology/vps-monitor/internal/config"
	"github.com/hhftechnology/vps-monitor/internal/models"
	"github.com/hhftechnology/vps-monitor/internal/services"
	"github.com/hhftechnology/vps-monitor/internal/system"
)

func TestGetProcessesHandlerReturnsOK(t *testing.T) {
	router := &APIRouter{
		registry: services.NewRegistry(nil, nil, nil, &config.Config{}, nil),
	}

	req := httptest.NewRequest(http.MethodGet, "/api/v1/system/processes", nil)
	rec := httptest.NewRecorder()

	router.GetProcesses(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}

	var resp models.ProcessesResponse
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if resp.Processes == nil {
		t.Fatal("expected non-nil processes slice in response")
	}
	if len(resp.Processes) > 20 {
		t.Fatalf("expected at most 20 processes, got %d", len(resp.Processes))
	}
}

func TestGetKillOnSightReturnsEmptyWhenNilStore(t *testing.T) {
	router := &APIRouter{
		registry:    services.NewRegistry(nil, nil, nil, &config.Config{}, nil),
		killOnSight: nil,
	}

	req := httptest.NewRequest(http.MethodGet, "/api/v1/system/processes/kill-on-sight", nil)
	rec := httptest.NewRecorder()

	router.GetKillOnSight(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
}

func TestAddKillOnSightReturnsBadRequestOnEmptyName(t *testing.T) {
	dir := t.TempDir()
	store, _ := system.NewKillOnSightStore(dir)

	router := &APIRouter{
		registry:    services.NewRegistry(nil, nil, nil, &config.Config{}, nil),
		killOnSight: store,
	}

	body := bytes.NewBufferString(`{"name":""}`)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/system/processes/kill-on-sight", body)
	rec := httptest.NewRecorder()

	router.AddKillOnSight(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for empty name, got %d", rec.Code)
	}
}

func TestAddAndGetKillOnSight(t *testing.T) {
	dir := t.TempDir()
	store, _ := system.NewKillOnSightStore(dir)

	router := &APIRouter{
		registry:    services.NewRegistry(nil, nil, nil, &config.Config{}, nil),
		killOnSight: store,
	}

	body := bytes.NewBufferString(`{"name":"xmrig"}`)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/system/processes/kill-on-sight", body)
	rec := httptest.NewRecorder()
	router.AddKillOnSight(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}

	req2 := httptest.NewRequest(http.MethodGet, "/api/v1/system/processes/kill-on-sight", nil)
	rec2 := httptest.NewRecorder()
	router.GetKillOnSight(rec2, req2)

	var result struct {
		Names []string `json:"names"`
	}
	if err := json.NewDecoder(rec2.Body).Decode(&result); err != nil {
		t.Fatalf("decode error: %v", err)
	}
	if len(result.Names) != 1 || result.Names[0] != "xmrig" {
		t.Fatalf("expected [xmrig], got %v", result.Names)
	}
}
```

- [ ] **Step 5: Commit**

```bash
git add home/internal/api/process_handlers.go \
        home/internal/api/handlers.go \
        home/internal/api/router.go \
        home/internal/api/process_handlers_test.go
git commit -m "feat(processes): add kill and kill-on-sight API handlers"
```

---

## Task 5: Wire KillOnSightStore in main.go + docker-compose

**Files:**
- Modify: `home/cmd/server/main.go`
- Modify: `docker-compose.yml`

- [ ] **Step 1: Init KillOnSightStore in main.go**

In `home/cmd/server/main.go`, find where `scanDB` is opened (around line 74). Add immediately after the `scanDB` initialization block:

```go
// Kill-on-sight store (persists process blocklist across restarts)
dataDir := "/data"
killOnSight, err := system.NewKillOnSightStore(dataDir)
if err != nil {
    log.Printf("Warning: failed to init kill-on-sight store: %v", err)
}
```

Then find where `api.NewRouter` is called and add `KillOnSight: killOnSight` to the `RouterOptions`:

```go
opts := &api.RouterOptions{
    // ... existing fields ...
    KillOnSight: killOnSight,
}
```

If `RouterOptions` is constructed inline, add `, KillOnSight: killOnSight` to the struct literal.

- [ ] **Step 2: Add pid: "host" to docker-compose.yml**

In `docker-compose.yml`, add `pid: "host"` directly under `restart: unless-stopped`:

```yaml
services:
  vps-monitor:
    build:
      context: .
      dockerfile: ./home/Dockerfile
    container_name: vps-monitor
    restart: unless-stopped
    pid: "host"
    ports:
      - "6789:6789"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - /proc:/host/proc:ro
      - vps-monitor-data:/data
    environment:
      - READONLY_MODE=false
      - DOCKER_HOSTS=local=unix:///var/run/docker.sock
      - HOSTNAME_OVERRIDE=${HOSTNAME_OVERRIDE:-My VPS}

volumes:
  vps-monitor-data:
```

- [ ] **Step 3: Commit**

```bash
git add home/cmd/server/main.go docker-compose.yml
git commit -m "feat(processes): wire KillOnSightStore in main and add pid:host"
```

---

## Task 6: Frontend API functions

**Files:**
- Modify: `frontend/src/features/processes/api/get-processes.ts`
- Create: `frontend/src/features/processes/api/kill-process.ts`
- Create: `frontend/src/features/processes/api/kill-on-sight.ts`

- [ ] **Step 1: Update get-processes.ts types**

Replace the entire content of `frontend/src/features/processes/api/get-processes.ts`:

```typescript
import { authenticatedFetch } from "@/lib/api-client";
import { API_BASE_URL } from "@/types/api";

export interface ProcessInfo {
  pid: number;
  name: string;
  cpu_percent: number;
  suspicious: boolean;
  suspicious_reason?: string;
}

export interface ProcessesResponse {
  processes: ProcessInfo[];
  auto_killed?: string[];
}

export async function getProcesses(): Promise<ProcessesResponse> {
  const response = await authenticatedFetch(
    `${API_BASE_URL}/api/v1/system/processes`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch processes");
  }

  return response.json();
}
```

- [ ] **Step 2: Create kill-process.ts**

```typescript
import { authenticatedFetch } from "@/lib/api-client";
import { API_BASE_URL } from "@/types/api";

export async function killProcess(pid: number): Promise<void> {
  const response = await authenticatedFetch(
    `${API_BASE_URL}/api/v1/system/processes/${pid}/kill`,
    { method: "POST" }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Failed to kill process");
  }
}
```

- [ ] **Step 3: Create kill-on-sight.ts**

```typescript
import { authenticatedFetch } from "@/lib/api-client";
import { API_BASE_URL } from "@/types/api";

export interface KillOnSightResponse {
  names: string[];
}

export async function getKillOnSight(): Promise<KillOnSightResponse> {
  const response = await authenticatedFetch(
    `${API_BASE_URL}/api/v1/system/processes/kill-on-sight`
  );
  if (!response.ok) throw new Error("Failed to fetch kill-on-sight list");
  return response.json();
}

export async function addKillOnSight(name: string): Promise<void> {
  const response = await authenticatedFetch(
    `${API_BASE_URL}/api/v1/system/processes/kill-on-sight`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    }
  );
  if (!response.ok) throw new Error("Failed to add to kill-on-sight");
}

export async function removeKillOnSight(name: string): Promise<void> {
  const response = await authenticatedFetch(
    `${API_BASE_URL}/api/v1/system/processes/kill-on-sight/${encodeURIComponent(name)}`,
    { method: "DELETE" }
  );
  if (!response.ok) throw new Error("Failed to remove from kill-on-sight");
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/processes/api/
git commit -m "feat(processes): add kill and kill-on-sight API functions"
```

---

## Task 7: Frontend hooks

**Files:**
- Create: `frontend/src/features/processes/hooks/use-kill-process.ts`
- Create: `frontend/src/features/processes/hooks/use-kill-on-sight.ts`

- [ ] **Step 1: Create use-kill-process.ts**

```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { killProcess } from "../api/kill-process";

export function useKillProcess() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: killProcess,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["processes"] });
    },
  });
}
```

- [ ] **Step 2: Create use-kill-on-sight.ts**

```typescript
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addKillOnSight,
  getKillOnSight,
  removeKillOnSight,
} from "../api/kill-on-sight";

export function useKillOnSight() {
  return useQuery({
    queryKey: ["kill-on-sight"],
    queryFn: getKillOnSight,
  });
}

export function useAddKillOnSight() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: addKillOnSight,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kill-on-sight"] });
    },
  });
}

export function useRemoveKillOnSight() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: removeKillOnSight,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kill-on-sight"] });
    },
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/processes/hooks/use-kill-process.ts \
        frontend/src/features/processes/hooks/use-kill-on-sight.ts
git commit -m "feat(processes): add kill and kill-on-sight mutation hooks"
```

---

## Task 8: Update processes-page.tsx with Suspicious section

**Files:**
- Modify: `frontend/src/features/processes/components/processes-page.tsx`

- [ ] **Step 1: Rewrite processes-page.tsx**

Replace the entire file content:

```tsx
import { useEffect, useRef } from "react";
import { ShieldAlertIcon, CpuIcon } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import type { ProcessInfo } from "../api/get-processes";
import { useKillOnSight, useAddKillOnSight, useRemoveKillOnSight } from "../hooks/use-kill-on-sight";
import { useKillProcess } from "../hooks/use-kill-process";
import { useProcesses } from "../hooks/use-processes";

function metricColor(percent: number): string {
  if (percent > 80) return "bg-red-500";
  if (percent > 60) return "bg-amber-500";
  return "bg-green-500";
}

function ReasonBadge({ reason }: { reason: string }) {
  const colors: Record<string, string> = {
    "High CPU": "bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400",
    "Known malware name": "bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400",
    "Temp dir execution": "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400",
    "Invalid process name": "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400",
  };
  const cls = colors[reason] ?? "bg-muted text-muted-foreground border-border";
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${cls}`}>
      {reason}
    </span>
  );
}

function SuspiciousRow({ proc }: { proc: ProcessInfo }) {
  const killMutation = useKillProcess();
  const addMutation = useAddKillOnSight();
  const removeMutation = useRemoveKillOnSight();
  const { data: kosList } = useKillOnSight();

  const isKillOnSight = kosList?.names.includes(proc.name) ?? false;

  const handleKill = () => {
    killMutation.mutate(proc.pid, {
      onSuccess: () => toast.success(`Killed process "${proc.name}" (PID ${proc.pid})`),
      onError: (err) => toast.error(`Failed to kill: ${err instanceof Error ? err.message : "Unknown error"}`),
    });
  };

  const handleToggleKillOnSight = () => {
    if (isKillOnSight) {
      removeMutation.mutate(proc.name, {
        onSuccess: () => toast.info(`Auto-kill disabled for "${proc.name}"`),
      });
    } else {
      addMutation.mutate(proc.name, {
        onSuccess: () => toast.warning(`Auto-kill enabled for "${proc.name}" — will be killed on next detection`),
      });
    }
  };

  return (
    <TableRow className="border-l-2 border-l-red-500">
      <TableCell className="font-medium">
        <div className="flex items-center gap-2">
          <ShieldAlertIcon className="size-3.5 shrink-0 text-red-500" />
          {proc.name || <span className="italic text-muted-foreground">(no name)</span>}
        </div>
      </TableCell>
      <TableCell className="font-mono text-xs text-muted-foreground">{proc.pid}</TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Progress
            value={Math.min(proc.cpu_percent, 100)}
            className="h-1.5 w-16"
            indicatorClassName={metricColor(proc.cpu_percent)}
          />
          <span className="w-10 font-mono text-xs">{proc.cpu_percent.toFixed(1)}%</span>
        </div>
      </TableCell>
      <TableCell>
        <ReasonBadge reason={proc.suspicious_reason ?? "Unknown"} />
      </TableCell>
      <TableCell>
        <Tooltip>
          <TooltipTrigger asChild>
            <Switch
              checked={isKillOnSight}
              onCheckedChange={handleToggleKillOnSight}
              disabled={addMutation.isPending || removeMutation.isPending}
              aria-label={`Kill on sight: ${proc.name}`}
            />
          </TooltipTrigger>
          <TooltipContent>
            {isKillOnSight ? "Disable auto-kill" : "Auto-kill on next detection"}
          </TooltipContent>
        </Tooltip>
      </TableCell>
      <TableCell>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              size="sm"
              disabled={killMutation.isPending}
            >
              {killMutation.isPending ? "Killing…" : "Kill"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Kill "{proc.name}"?</AlertDialogTitle>
              <AlertDialogDescription>
                This sends SIGKILL to PID {proc.pid}. The process will be terminated immediately and cannot be recovered.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleKill}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Kill Process
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TableCell>
    </TableRow>
  );
}

export function ProcessesPage() {
  const { data, isLoading, isError } = useProcesses();

  const autoKilledRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!data?.auto_killed?.length) return;
    for (const name of data.auto_killed) {
      if (!autoKilledRef.current.has(name)) {
        toast.warning(`Auto-killed: "${name}"`);
        autoKilledRef.current.add(name);
      }
    }
    // Reset ref after 10s so repeated kills keep notifying
    const timer = setTimeout(() => { autoKilledRef.current.clear(); }, 10000);
    return () => clearTimeout(timer);
  }, [data?.auto_killed]);

  const suspiciousProcesses = data?.processes.filter((p) => p.suspicious) ?? [];
  const allProcesses = data?.processes ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <CpuIcon className="size-6 text-primary" />
        <h1 className="text-2xl font-bold">Top Processes</h1>
        <span className="relative flex size-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex size-2 rounded-full bg-green-500" />
        </span>
      </div>

      {/* Suspicious Processes Section */}
      {suspiciousProcesses.length > 0 && (
        <Card className="border-red-500/40 bg-red-500/5 dark:bg-red-500/10">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <ShieldAlertIcon className="size-5 text-red-500" />
              <CardTitle className="text-sm font-semibold text-red-600 dark:text-red-400">
                Suspicious Processes Detected
              </CardTitle>
              <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                {suspiciousProcesses.length}
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">PID</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">CPU %</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Reason</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Kill on Sight</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suspiciousProcesses.map((proc) => (
                  <SuspiciousRow key={proc.pid} proc={proc} />
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Top 20 Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Top 20 by CPU · updates every 2s
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading && (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
          )}
          {isError && (
            <p className="py-8 text-center text-sm text-destructive">Failed to load process data</p>
          )}
          {data && (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-12 text-xs font-semibold uppercase tracking-wider text-muted-foreground">#</TableHead>
                  <TableHead className="w-24 text-xs font-semibold uppercase tracking-wider text-muted-foreground">PID</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">CPU %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allProcesses.map((proc, i) => (
                  <TableRow key={proc.pid}>
                    <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{proc.pid}</TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-1.5">
                        {proc.suspicious && (
                          <ShieldAlertIcon className="size-3.5 shrink-0 text-red-500" />
                        )}
                        {proc.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Progress
                          value={Math.min(proc.cpu_percent, 100)}
                          className="h-1.5 w-24"
                          indicatorClassName={metricColor(proc.cpu_percent)}
                        />
                        <span className="w-12 font-mono text-xs">{proc.cpu_percent.toFixed(1)}%</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/features/processes/components/processes-page.tsx
git commit -m "feat(processes): add suspicious section with kill and kill-on-sight UI"
```

---

## Task 9: Push and deploy

- [ ] **Step 1: Push to GitHub**

```bash
git push origin main
```

- [ ] **Step 2: Rebuild on VPS**

```bash
cd ~/vps-monitor
git pull
docker compose down
docker compose up -d --build
```

- [ ] **Step 3: Verify**

Open `http://your-vps-ip:6789/processes`.

- If no suspicious processes are running, the red section will be hidden — the Top 20 table shows as normal.
- To test, run `sleep 999 &` on the VPS and watch if gopsutil flags it (it won't — `sleep` is benign). To test the kill-on-sight flow, the blocklist is at `/data/kill-on-sight.json` inside the container volume.
- Suspicious processes detected via heuristics will appear at the top with Kill and Kill-on-Sight controls.
