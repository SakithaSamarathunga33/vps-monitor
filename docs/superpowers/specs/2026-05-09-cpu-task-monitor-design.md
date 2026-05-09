# CPU Task Monitor — Design Spec

**Date:** 2026-05-09  
**Status:** Approved

## Overview

Add a dedicated `/processes` page to VPS-Monitor that shows the top 20 host processes sorted by CPU usage in real time, updated every 2 seconds. Each row displays: rank, PID, process name, and CPU percentage with a visual bar.

## Architecture

### Backend

**New endpoint:** `GET /api/v1/system/processes`

- Uses `gopsutil/v4/process` (already a dependency via `gopsutil/v4`)
- Reads from `/host/proc` if mounted (respects existing `HOST_PROC` env var set in `system/stats.go`)
- Collects all processes, fetches CPU% for each, returns top 20 sorted descending
- Response shape:
  ```json
  {
    "processes": [
      { "pid": 1234, "name": "nginx", "cpu_percent": 12.4 }
    ]
  }
  ```
- New handler in `home/internal/api/handlers.go`
- Registered as public route (same as `/api/v1/system/stats`) in `home/internal/api/router.go`
- New model `ProcessInfo` in `home/internal/models/stats.go`

### Frontend

**New route:** `frontend/src/routes/processes/index.tsx`  
**New feature dir:** `frontend/src/features/processes/`

- `api/get-processes.ts` — calls `GET /api/v1/system/processes`
- `hooks/use-processes.ts` — React Query, `refetchInterval: 2000`
- `components/processes-page.tsx` — renders the table
- `components/process-row.tsx` — single row: rank, PID, name, CPU bar + %

**Nav link** added to the existing header alongside Containers / Stats / etc.

## Data Flow

```
/host/proc (mounted)
    ↓
gopsutil/v4/process
    ↓
GET /api/v1/system/processes (HTTP, polled every 2s)
    ↓
useProcesses() hook (React Query)
    ↓
ProcessesPage → table of top 20
```

## UI

- Table columns: **#** (rank) · **PID** · **Name** · **CPU %** (progress bar + value)
- Progress bar color matches existing convention: green <60%, yellow 60–80%, red >80%
- Heading: "Top Processes" with a live indicator dot
- No pagination — fixed top 20

## Error Handling

- If `/host/proc` is not mounted the endpoint falls back to container-level proc — processes shown will be container processes, not host processes (acceptable degradation)
- Frontend shows a loading skeleton on first fetch; error state shows a simple message if the endpoint fails

## Out of Scope

- Memory per process
- Sorting/filtering controls
- WebSocket streaming (HTTP polling at 2s is sufficient)
- Kill/signal process actions
