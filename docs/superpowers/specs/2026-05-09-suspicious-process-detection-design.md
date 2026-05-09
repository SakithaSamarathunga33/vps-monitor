# Suspicious Process Detection — Design Spec

**Date:** 2026-05-09  
**Status:** Approved

## Overview

Extend the Processes page with a Suspicious Process Detection section. The backend detects suspicious host processes via four heuristics, exposes kill and kill-on-sight endpoints, and auto-kills processes on the blocklist every poll cycle. The frontend shows flagged processes above the Top 20 table with Kill and Kill-on-Sight controls.

---

## Backend

### Model changes (`home/internal/models/stats.go`)

Add two fields to `ProcessInfo`:

```go
type ProcessInfo struct {
    PID              int32   `json:"pid"`
    Name             string  `json:"name"`
    CPUPercent       float64 `json:"cpu_percent"`
    Suspicious       bool    `json:"suspicious"`
    SuspiciousReason string  `json:"suspicious_reason,omitempty"`
}
```

### Detection heuristics (`home/internal/system/processes.go`)

Run four checks per process after collecting CPU/name. A process is flagged if any check fires; `SuspiciousReason` is set to the first matching reason string.

1. **Sustained high CPU** — in-memory `sync.Map` keyed by PID stores previous CPU%. Flag if current CPU > 80% AND previous CPU > 80%.
2. **Suspicious exe path** — read `/proc/<pid>/exe` (or `$HOST_PROC/<pid>/exe`) symlink. Flag if the resolved path starts with `/tmp/`, `/dev/shm/`, `/var/tmp/`, `/run/shm/`.
3. **Known bad name** — case-insensitive match against: `xmrig`, `minerd`, `kinsing`, `masscan`, `nmap`, `cryptonight`, `stratum+tcp`, `ld-musl`, `kdevtmpfsi`, `kworkerds`, `sysupdate`, `networkservice`.
4. **Empty/garbage name** — flag if name is empty or contains no printable ASCII characters.

Reason strings: `"High CPU"`, `"Temp dir execution"`, `"Known malware name"`, `"Invalid process name"`.

### Kill-on-sight persistence (`home/internal/system/kill_on_sight.go`)

New file. Manages `/data/kill-on-sight.json` — a JSON array of process name strings.

```go
type KillOnSightStore struct {
    path  string
    mu    sync.RWMutex
    names map[string]struct{}
}

func NewKillOnSightStore(dataDir string) *KillOnSightStore
func (s *KillOnSightStore) Contains(name string) bool
func (s *KillOnSightStore) Add(name string) error
func (s *KillOnSightStore) Remove(name string) error
func (s *KillOnSightStore) List() []string
```

Loaded from disk on startup. Written to disk on every Add/Remove. Thread-safe.

### Auto-kill in GetProcesses

After building the process list, iterate over all processes. For any process whose name is in the `KillOnSightStore`:
1. Call `p.KillWithContext(ctx)` (gopsutil)
2. Log: `killed process <name> PID <pid> (kill-on-sight)`
3. Show a toast on the frontend via the API response (add `AutoKilled []string` to `ProcessesResponse`)

```go
type ProcessesResponse struct {
    Processes  []ProcessInfo `json:"processes"`
    AutoKilled []string      `json:"auto_killed,omitempty"`
}
```

### New endpoints (`home/internal/api/handlers.go` + `home/internal/api/router.go`)

All registered as **protected** (behind auth middleware if auth is enabled).

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/system/processes/{pid}/kill` | SIGKILL a process by PID |
| `GET`  | `/api/v1/system/processes/kill-on-sight` | List kill-on-sight names |
| `POST` | `/api/v1/system/processes/kill-on-sight` | Add name to kill-on-sight |
| `DELETE` | `/api/v1/system/processes/kill-on-sight/{name}` | Remove name from kill-on-sight |

`POST /{pid}/kill` returns:
- `200 OK` with `{"killed": true, "pid": 1234}`
- `404` if process not found
- `500` if kill fails

### docker-compose.yml

Add `pid: "host"` to the service so the container shares the host PID namespace, enabling SIGKILL to reach host processes.

---

## Frontend

### New API functions (`frontend/src/features/processes/api/`)

- `kill-process.ts` — `POST /api/v1/system/processes/{pid}/kill`
- `kill-on-sight.ts` — GET/POST/DELETE `/api/v1/system/processes/kill-on-sight`

### New hooks (`frontend/src/features/processes/hooks/`)

- `use-kill-process.ts` — React Query mutation
- `use-kill-on-sight.ts` — query (list) + mutations (add/remove)

### Updated `processes-page.tsx`

**Suspicious Processes section** (rendered above Top 20, hidden when empty):

- Section heading: "Suspicious Processes" with a red `ShieldAlertIcon`
- Each suspicious process as a table row with red left border or red background tint
- Columns: Name · PID · CPU% · Reason badge · Kill button · Kill-on-Sight toggle
- **Kill button**: red destructive variant, opens `AlertDialog` confirmation before calling kill mutation. On success shows toast "Process `<name>` killed".
- **Kill-on-Sight toggle**: `Switch` component. When toggled on, calls add mutation and shows toast "Auto-kill enabled for `<name>`". When toggled off, calls remove mutation.
- On `auto_killed` in response: show toast per entry "Process `<name>` auto-killed"

**Top 20 section** unchanged except suspicious processes are also shown there with a subtle `ShieldAlertIcon` badge next to their name.

### Updated `use-processes.ts`

After each successful fetch, if `data.auto_killed` has entries, fire a toast per entry.

---

## Scope Boundaries

**In scope:** Detection heuristics, kill endpoint, kill-on-sight persistence, UI section, auto-kill toasts, `pid: host` docker-compose change.

**Out of scope:** Email/webhook alerts, alert history, per-process memory heuristics, network connection scanning, process whitelisting.
