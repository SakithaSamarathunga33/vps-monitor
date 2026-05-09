# CPU Task Monitor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/processes` page that shows the top 20 host processes sorted by CPU in real time, updated every 2 seconds, displaying rank, PID, process name, and a colour-coded CPU bar.

**Architecture:** A new public `GET /api/v1/system/processes` endpoint reads from `/host/proc` via `gopsutil/v4/process` (already a dependency), sorts all processes by CPU descending, and returns the top 20 as JSON. The frontend polls this endpoint every 2 seconds with React Query and renders a table in a dedicated `/processes` route.

**Tech Stack:** Go 1.24, `gopsutil/v4/process`, Chi v5, React 19, TypeScript, TanStack Router + Query, Tailwind CSS, Shadcn UI.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `home/internal/models/stats.go` | Add `ProcessInfo` and `ProcessesResponse` structs |
| Create | `home/internal/system/processes.go` | `GetProcesses()` — reads from gopsutil, returns top 20 |
| Create | `home/internal/system/processes_test.go` | Tests for `GetProcesses()` |
| Modify | `home/internal/api/handlers.go` | Add `GetProcesses` HTTP handler |
| Create | `home/internal/api/process_handlers_test.go` | Handler test |
| Modify | `home/internal/api/router.go` | Register public route |
| Create | `frontend/src/features/processes/api/get-processes.ts` | Typed API call |
| Create | `frontend/src/features/processes/api/get-processes.test.ts` | API function tests |
| Create | `frontend/src/features/processes/hooks/use-processes.ts` | React Query hook |
| Create | `frontend/src/features/processes/components/processes-page.tsx` | Full page component |
| Create | `frontend/src/routes/processes/index.tsx` | TanStack route file |
| Modify | `frontend/src/components/header.tsx` | Add Processes nav link |

---

## Task 1: Add ProcessInfo model

**Files:**
- Modify: `home/internal/models/stats.go`

- [ ] **Step 1: Add structs to the models file**

Open `home/internal/models/stats.go` and append after the existing `HistoricalAverages` struct:

```go
// ProcessInfo holds per-process CPU data for the processes endpoint.
type ProcessInfo struct {
	PID        int32   `json:"pid"`
	Name       string  `json:"name"`
	CPUPercent float64 `json:"cpu_percent"`
}

// ProcessesResponse is the JSON envelope returned by GET /api/v1/system/processes.
type ProcessesResponse struct {
	Processes []ProcessInfo `json:"processes"`
}
```

- [ ] **Step 2: Verify the package compiles**

```bash
cd home && go build ./internal/models/...
```

Expected: no output, exit 0.

- [ ] **Step 3: Commit**

```bash
git add home/internal/models/stats.go
git commit -m "feat: add ProcessInfo and ProcessesResponse models"
```

---

## Task 2: GetProcesses function

**Files:**
- Create: `home/internal/system/processes.go`
- Create: `home/internal/system/processes_test.go`

- [ ] **Step 1: Write the failing tests**

Create `home/internal/system/processes_test.go`:

```go
package system

import (
	"context"
	"testing"
)

func TestGetProcessesReturnsCapped(t *testing.T) {
	ctx := context.Background()
	procs, err := GetProcesses(ctx)
	if err != nil {
		t.Fatalf("GetProcesses() error = %v", err)
	}
	if len(procs) > 20 {
		t.Fatalf("expected at most 20 processes, got %d", len(procs))
	}
}

func TestGetProcessesSortedByCPUDescending(t *testing.T) {
	ctx := context.Background()
	procs, err := GetProcesses(ctx)
	if err != nil {
		t.Fatalf("GetProcesses() error = %v", err)
	}
	for i := 1; i < len(procs); i++ {
		if procs[i].CPUPercent > procs[i-1].CPUPercent {
			t.Fatalf("not sorted: index %d cpu=%.2f > index %d cpu=%.2f",
				i, procs[i].CPUPercent, i-1, procs[i-1].CPUPercent)
		}
	}
}

func TestGetProcessesFieldsNonEmpty(t *testing.T) {
	ctx := context.Background()
	procs, err := GetProcesses(ctx)
	if err != nil {
		t.Fatalf("GetProcesses() error = %v", err)
	}
	if len(procs) == 0 {
		t.Skip("no processes returned — skipping field check")
	}
	for _, p := range procs {
		if p.PID == 0 {
			t.Fatalf("expected non-zero PID, got 0 for process %q", p.Name)
		}
		if p.Name == "" {
			t.Fatalf("expected non-empty Name for PID %d", p.PID)
		}
	}
}
```

- [ ] **Step 2: Run tests — expect compile failure**

```bash
cd home && go test ./internal/system/... 2>&1 | head -20
```

Expected: `undefined: GetProcesses`

- [ ] **Step 3: Implement GetProcesses**

Create `home/internal/system/processes.go`:

```go
package system

import (
	"context"
	"sort"

	"github.com/hhftechnology/vps-monitor/internal/models"
	"github.com/shirou/gopsutil/v4/process"
)

// GetProcesses returns the top 20 host processes sorted by CPU percent descending.
// It respects HOST_PROC so it reads from /host/proc when running in a container.
func GetProcesses(ctx context.Context) ([]models.ProcessInfo, error) {
	procs, err := process.ProcessesWithContext(ctx)
	if err != nil {
		return nil, err
	}

	type entry struct {
		pid  int32
		name string
		cpu  float64
	}

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
		entries = append(entries, entry{pid: p.Pid, name: name, cpu: cpu})
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
			PID:        e.pid,
			Name:       e.name,
			CPUPercent: e.cpu,
		}
	}
	return result, nil
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
cd home && go test ./internal/system/... -v -run "TestGetProcesses"
```

Expected: all three tests PASS (they run against the live system).

- [ ] **Step 5: Commit**

```bash
git add home/internal/system/processes.go home/internal/system/processes_test.go
git commit -m "feat: add GetProcesses returning top 20 by CPU"
```

---

## Task 3: HTTP handler and route

**Files:**
- Modify: `home/internal/api/handlers.go`
- Create: `home/internal/api/process_handlers_test.go`
- Modify: `home/internal/api/router.go`

- [ ] **Step 1: Write the failing handler test**

Create `home/internal/api/process_handlers_test.go`:

```go
package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/hhftechnology/vps-monitor/internal/config"
	"github.com/hhftechnology/vps-monitor/internal/models"
	"github.com/hhftechnology/vps-monitor/internal/services"
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
```

- [ ] **Step 2: Run test — expect compile failure**

```bash
cd home && go test ./internal/api/... -run "TestGetProcessesHandler" 2>&1 | head -10
```

Expected: `router.GetProcesses undefined`

- [ ] **Step 3: Add the handler to handlers.go**

Open `home/internal/api/handlers.go`. Add this method after the `GetSystemStats` method (after line 140):

```go
func (ar *APIRouter) GetProcesses(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	procs, err := system.GetProcesses(ctx)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	WriteJsonResponse(w, http.StatusOK, models.ProcessesResponse{Processes: procs})
}
```

Make sure `system` is already imported — check the import block at the top of `handlers.go`. If `"github.com/hhftechnology/vps-monitor/internal/system"` is not present, add it.

- [ ] **Step 4: Register the route in router.go**

Open `home/internal/api/router.go`. In the `Routes()` method, find these two public lines:

```go
// System stats - publicly available
r.Get("/system/stats", ar.GetSystemStats)
```

Add the processes route directly after:

```go
r.Get("/system/processes", ar.GetProcesses)
```

- [ ] **Step 5: Run the handler test — expect pass**

```bash
cd home && go test ./internal/api/... -run "TestGetProcessesHandler" -v
```

Expected: PASS.

- [ ] **Step 6: Run the full backend test suite**

```bash
cd home && go test ./...
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add home/internal/api/handlers.go home/internal/api/process_handlers_test.go home/internal/api/router.go
git commit -m "feat: add GET /api/v1/system/processes endpoint"
```

---

## Task 4: Frontend API function

**Files:**
- Create: `frontend/src/features/processes/api/get-processes.ts`
- Create: `frontend/src/features/processes/api/get-processes.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/features/processes/api/get-processes.test.ts`:

```typescript
import { authenticatedFetch } from "@/lib/api-client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getProcesses } from "./get-processes";

vi.mock("@/lib/api-client", () => ({
  authenticatedFetch: vi.fn(),
}));

const mockFetch = authenticatedFetch as ReturnType<typeof vi.fn>;

describe("getProcesses", () => {
  afterEach(() => vi.clearAllMocks());

  it("returns process list on success", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          processes: [{ pid: 1, name: "init", cpu_percent: 0.5 }],
        }),
    } as unknown as Response);

    const result = await getProcesses();

    expect(result.processes).toHaveLength(1);
    expect(result.processes[0].pid).toBe(1);
    expect(result.processes[0].name).toBe("init");
    expect(result.processes[0].cpu_percent).toBe(0.5);
  });

  it("throws on non-ok response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
    } as unknown as Response);

    await expect(getProcesses()).rejects.toThrow("Failed to fetch processes");
  });
});
```

- [ ] **Step 2: Run tests — expect failure**

```bash
cd frontend && bun run test src/features/processes/api/get-processes.test.ts 2>&1 | tail -10
```

Expected: `Cannot find module './get-processes'`

- [ ] **Step 3: Create the API function**

Create `frontend/src/features/processes/api/get-processes.ts`:

```typescript
import { authenticatedFetch } from "@/lib/api-client";
import { API_BASE_URL } from "@/types/api";

export interface ProcessInfo {
  pid: number;
  name: string;
  cpu_percent: number;
}

export interface ProcessesResponse {
  processes: ProcessInfo[];
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

- [ ] **Step 4: Run tests — expect pass**

```bash
cd frontend && bun run test src/features/processes/api/get-processes.test.ts
```

Expected: 2 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/processes/
git commit -m "feat: add getProcesses API function"
```

---

## Task 5: React Query hook

**Files:**
- Create: `frontend/src/features/processes/hooks/use-processes.ts`

- [ ] **Step 1: Create the hook**

Create `frontend/src/features/processes/hooks/use-processes.ts`:

```typescript
import { useQuery } from "@tanstack/react-query";

import { getProcesses } from "../api/get-processes";

export function useProcesses() {
  return useQuery({
    queryKey: ["processes"],
    queryFn: getProcesses,
    refetchInterval: 2000,
  });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && bun run typecheck 2>&1 | grep processes
```

Expected: no errors related to `processes`.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/processes/hooks/use-processes.ts
git commit -m "feat: add useProcesses React Query hook"
```

---

## Task 6: ProcessesPage component

**Files:**
- Create: `frontend/src/features/processes/components/processes-page.tsx`

- [ ] **Step 1: Create the component**

Create `frontend/src/features/processes/components/processes-page.tsx`:

```tsx
import { CpuIcon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

import { useProcesses } from "../hooks/use-processes";

function cpuIndicatorColor(percent: number): string {
  if (percent > 80) return "bg-red-500";
  if (percent > 60) return "bg-yellow-500";
  return "bg-green-500";
}

export function ProcessesPage() {
  const { data, isLoading, isError } = useProcesses();

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

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Top 20 by CPU · updates every 2s
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Loading…
            </p>
          )}

          {isError && (
            <p className="py-4 text-center text-sm text-destructive">
              Failed to load process data
            </p>
          )}

          {data && (
            <div className="space-y-2">
              <div className="grid grid-cols-[2rem_5rem_1fr_10rem] gap-3 border-b px-1 pb-1 text-xs font-medium text-muted-foreground">
                <span>#</span>
                <span>PID</span>
                <span>Name</span>
                <span>CPU %</span>
              </div>

              {data.processes.map((proc, i) => (
                <div
                  key={proc.pid}
                  className="grid grid-cols-[2rem_5rem_1fr_10rem] items-center gap-3 px-1 text-sm"
                >
                  <span className="text-xs text-muted-foreground">{i + 1}</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {proc.pid}
                  </span>
                  <span className="truncate font-medium">{proc.name}</span>
                  <div className="flex items-center gap-2">
                    <Progress
                      value={Math.min(proc.cpu_percent, 100)}
                      className="h-1.5 flex-1"
                      indicatorClassName={cpuIndicatorColor(proc.cpu_percent)}
                    />
                    <span className="w-12 text-right font-mono text-xs">
                      {proc.cpu_percent.toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd frontend && bun run typecheck 2>&1 | grep processes
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/processes/components/processes-page.tsx
git commit -m "feat: add ProcessesPage component"
```

---

## Task 7: Route file and nav link

**Files:**
- Create: `frontend/src/routes/processes/index.tsx`
- Modify: `frontend/src/components/header.tsx`

- [ ] **Step 1: Create the route file**

Create `frontend/src/routes/processes/index.tsx`:

```tsx
import { createFileRoute } from "@tanstack/react-router";

import { ProcessesPage } from "@/features/processes/components/processes-page";
import { requireAuthIfEnabled } from "@/lib/auth-guard";

export const Route = createFileRoute("/processes/")({
  beforeLoad: async () => {
    await requireAuthIfEnabled();
  },
  component: Processes,
});

function Processes() {
  return (
    <main className="container mx-auto px-4 py-8">
      <ProcessesPage />
    </main>
  );
}
```

- [ ] **Step 2: Add nav link to header**

Open `frontend/src/components/header.tsx`.

Change the import line:
```typescript
import { ActivityIcon, BoxIcon, FileTextIcon, HistoryIcon, ImageIcon, NetworkIcon, ServerIcon } from "lucide-react";
```
to:
```typescript
import { ActivityIcon, BoxIcon, CpuIcon, FileTextIcon, HistoryIcon, ImageIcon, NetworkIcon, ServerIcon } from "lucide-react";
```

Change the `navLinks` array:
```typescript
const navLinks = [
  { to: "/", label: "Containers", icon: BoxIcon },
  { to: "/stats", label: "Stats", icon: ActivityIcon },
  { to: "/processes", label: "Processes", icon: CpuIcon },
  { to: "/images", label: "Images", icon: ImageIcon },
  { to: "/networks", label: "Networks", icon: NetworkIcon },
  { to: "/scan-history", label: "Scan History", icon: HistoryIcon },
  { to: "/sbom-history", label: "SBOMs", icon: FileTextIcon },
] as const;
```

- [ ] **Step 3: Run the full frontend type check and tests**

```bash
cd frontend && bun run typecheck && bun run test
```

Expected: no type errors, all tests pass.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/routes/processes/ frontend/src/components/header.tsx
git commit -m "feat: add /processes route and nav link"
```

---

## Task 8: Push and deploy

- [ ] **Step 1: Push to GitHub**

```bash
git push origin main
```

- [ ] **Step 2: Pull and rebuild on VPS**

SSH into the VPS and run:

```bash
cd ~/vps-monitor
git pull
docker compose pull
docker compose up -d --build
```

Note: since we use the pre-built image (`hhftechnology/vps-monitor:latest`) the backend changes won't be live until an image update is published. To run your custom backend, rebuild locally:

```bash
# On the VPS, if you want to run your custom build:
docker compose down
docker compose up -d --build
```

But this requires the Dockerfile to be present. Check `home/Dockerfile` exists in the repo. If it was not committed (only deployment files were committed in the initial push), you will need to add the source directories first:

```bash
# On your local machine:
git add home/ frontend/ mobile/
git commit -m "feat: add full source for custom builds"
git push origin main
```

Then on the VPS:
```bash
git pull && docker compose up -d --build
```

- [ ] **Step 3: Verify in browser**

Open `http://your-vps-ip:6789/processes` — you should see the Processes page with the live process table updating every 2 seconds.
