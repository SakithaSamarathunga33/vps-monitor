# UI Modernization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modernize VPS-Monitor frontend to a clean Vercel/Linear-inspired design with indigo primary, semantic status colors, pill badges, top-accent metric cards, and uppercase table headers — applied consistently across all pages.

**Architecture:** Start with CSS tokens so shadcn components update globally for free, then build two shared components (StatusBadge, MetricCard), then update each page to use them. No new dependencies needed — everything uses existing shadcn primitives.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, shadcn/radix, lucide-react.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `frontend/src/styles.css` | Swap red OKLch palette → slate/indigo tokens |
| Create | `frontend/src/components/status-badge.tsx` | Shared pill badge for container states |
| Create | `frontend/src/components/metric-card.tsx` | Top-accent metric card (CPU/mem/disk) |
| Modify | `frontend/src/components/header.tsx` | Indigo active nav state |
| Modify | `frontend/src/features/containers/components/containers-summary-cards.tsx` | Use MetricCard |
| Modify | `frontend/src/features/containers/components/containers-table.tsx` | Uppercase headers + StatusBadge |
| Modify | `frontend/src/features/containers/components/container-utils.ts` | Update getStateBadgeClass colors |
| Modify | `frontend/src/features/stats/components/container-stats-card.tsx` | amber instead of yellow, consistent colors |
| Modify | `frontend/src/features/processes/components/processes-page.tsx` | shadcn Table instead of manual grid |
| Modify | `frontend/src/features/alerts/components/alerts-list.tsx` | Semantic alert colors |
| Modify | `frontend/src/features/images/components/images-table.tsx` | Uppercase table headers |
| Modify | `frontend/src/features/networks/components/networks-table.tsx` | Uppercase table headers |

---

## Task 1: CSS Design Tokens

**Files:**
- Modify: `frontend/src/styles.css`

Replace the red OKLch palette with slate/indigo. All shadcn components that use `--primary`, `--background`, `--card`, etc. will update automatically.

- [ ] **Step 1: Replace the `:root` light-mode block**

In `frontend/src/styles.css`, replace everything between `/* Red Theme - Light Mode */` and the closing `}` of `:root` with:

```css
/* Indigo/Slate Theme - Light Mode */
:root {
  --background: oklch(0.984 0.003 247);
  --foreground: oklch(0.13 0.028 261);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.13 0.028 261);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.13 0.028 261);
  --primary: oklch(0.585 0.233 277);
  --primary-foreground: oklch(1 0 0);
  --secondary: oklch(0.968 0.007 247);
  --secondary-foreground: oklch(0.13 0.028 261);
  --muted: oklch(0.968 0.007 247);
  --muted-foreground: oklch(0.554 0.046 257);
  --accent: oklch(0.941 0.018 272);
  --accent-foreground: oklch(0.585 0.233 277);
  --destructive: oklch(0.577 0.245 27);
  --destructive-foreground: oklch(1 0 0);
  --border: oklch(0.929 0.013 255);
  --input: oklch(0.929 0.013 255);
  --ring: oklch(0.585 0.233 277);
  --chart-1: oklch(0.585 0.233 277);
  --chart-2: oklch(0.769 0.147 70);
  --chart-3: oklch(0.723 0.191 149);
  --chart-4: oklch(0.577 0.245 27);
  --chart-5: oklch(0.667 0.195 322);
  --radius: 0.625rem;
  --sidebar: oklch(0.984 0.003 247);
  --sidebar-foreground: oklch(0.13 0.028 261);
  --sidebar-primary: oklch(0.585 0.233 277);
  --sidebar-primary-foreground: oklch(1 0 0);
  --sidebar-accent: oklch(0.941 0.018 272);
  --sidebar-accent-foreground: oklch(0.585 0.233 277);
  --sidebar-border: oklch(0.929 0.013 255);
  --sidebar-ring: oklch(0.585 0.233 277);
}
```

- [ ] **Step 2: Replace the `.dark` block**

Replace everything between `/* Red Theme - Dark Mode */` and the closing `}` of `.dark` with:

```css
/* Indigo/Slate Theme - Dark Mode */
.dark {
  --background: oklch(0.085 0.022 261);
  --foreground: oklch(0.968 0.007 247);
  --card: oklch(0.12 0.024 265);
  --card-foreground: oklch(0.968 0.007 247);
  --popover: oklch(0.12 0.024 265);
  --popover-foreground: oklch(0.968 0.007 247);
  --primary: oklch(0.585 0.233 277);
  --primary-foreground: oklch(1 0 0);
  --secondary: oklch(0.175 0.035 262);
  --secondary-foreground: oklch(0.968 0.007 247);
  --muted: oklch(0.095 0.02 263);
  --muted-foreground: oklch(0.44 0.037 259);
  --accent: oklch(0.175 0.035 262);
  --accent-foreground: oklch(0.585 0.233 277);
  --destructive: oklch(0.577 0.245 27);
  --destructive-foreground: oklch(1 0 0);
  --border: oklch(0.175 0.035 262);
  --input: oklch(0.175 0.035 262);
  --ring: oklch(0.585 0.233 277);
  --chart-1: oklch(0.585 0.233 277);
  --chart-2: oklch(0.769 0.147 70);
  --chart-3: oklch(0.723 0.191 149);
  --chart-4: oklch(0.577 0.245 27);
  --chart-5: oklch(0.667 0.195 322);
  --sidebar: oklch(0.12 0.024 265);
  --sidebar-foreground: oklch(0.968 0.007 247);
  --sidebar-primary: oklch(0.585 0.233 277);
  --sidebar-primary-foreground: oklch(1 0 0);
  --sidebar-accent: oklch(0.175 0.035 262);
  --sidebar-accent-foreground: oklch(0.585 0.233 277);
  --sidebar-border: oklch(0.175 0.035 262);
  --sidebar-ring: oklch(0.585 0.233 277);
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/styles.css
git commit -m "feat(ui): replace red theme with slate/indigo design tokens"
```

---

## Task 2: StatusBadge component

**Files:**
- Create: `frontend/src/components/status-badge.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusStyles: Record<string, string> = {
  running:    "bg-green-500/10 text-green-600 border border-green-500/20 dark:text-green-400 dark:border-green-500/30",
  paused:     "bg-amber-500/10 text-amber-600 border border-amber-500/20 dark:text-amber-400 dark:border-amber-500/30",
  exited:     "bg-red-500/10 text-red-500 border border-red-500/20 dark:border-red-500/30",
  dead:       "bg-red-500/10 text-red-500 border border-red-500/20 dark:border-red-500/30",
  restarting: "bg-blue-500/10 text-blue-600 border border-blue-500/20 dark:text-blue-400 dark:border-blue-500/30",
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const normalized = status.toLowerCase();
  const style = statusStyles[normalized] ?? "bg-muted text-muted-foreground border border-border";
  const label = normalized.charAt(0).toUpperCase() + normalized.slice(1);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        style,
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/status-badge.tsx
git commit -m "feat(ui): add StatusBadge shared component"
```

---

## Task 3: MetricCard component

**Files:**
- Create: `frontend/src/components/metric-card.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export type MetricColor = "indigo" | "amber" | "green";

interface MetricCardProps {
  label: string;
  value: string;
  percent: number;
  color: MetricColor;
  className?: string;
}

const colorMap: Record<MetricColor, { border: string; bar: string }> = {
  indigo: { border: "border-t-indigo-500", bar: "bg-indigo-500" },
  amber:  { border: "border-t-amber-500",  bar: "bg-amber-500" },
  green:  { border: "border-t-green-500",  bar: "bg-green-500" },
};

export function MetricCard({ label, value, percent, color, className }: MetricCardProps) {
  const { border, bar } = colorMap[color];
  return (
    <Card className={cn("border-t-2 py-4", border, className)}>
      <CardContent className="px-6 py-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="mt-1 text-2xl font-bold">{value}</p>
        <Progress
          value={Math.min(percent, 100)}
          className="mt-2 h-1.5"
          indicatorClassName={bar}
        />
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/metric-card.tsx
git commit -m "feat(ui): add MetricCard shared component"
```

---

## Task 4: Header active state

**Files:**
- Modify: `frontend/src/components/header.tsx`

- [ ] **Step 1: Update the active nav link style**

In `frontend/src/components/header.tsx`, replace the entire `navLinks.map(...)` Button block with this version that uses a cleaner indigo active state:

```tsx
{navLinks.map((link) => {
  const isActive =
    link.to === "/"
      ? location.pathname === "/"
      : location.pathname.startsWith(link.to);
  const Icon = link.icon;

  return (
    <Button
      key={link.to}
      variant="ghost"
      size="sm"
      asChild
      className={cn(
        "gap-2 text-sm font-medium",
        isActive
          ? "bg-primary/10 text-primary hover:bg-primary/15"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      <Link to={link.to}>
        <Icon className="size-4" />
        {link.label}
      </Link>
    </Button>
  );
})}
```

Also update the Alerts button below it to match:

```tsx
<Button
  variant="ghost"
  size="sm"
  asChild
  className={cn(
    "gap-2 text-sm font-medium",
    location.pathname.startsWith("/alerts")
      ? "bg-primary/10 text-primary hover:bg-primary/15"
      : "text-muted-foreground hover:text-foreground"
  )}
>
  <Link to="/alerts">
    <AlertBadge />
    Alerts
  </Link>
</Button>
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/header.tsx
git commit -m "feat(ui): update header active nav state to indigo"
```

---

## Task 5: Dashboard — summary cards + table headers

**Files:**
- Modify: `frontend/src/features/containers/components/containers-summary-cards.tsx`
- Modify: `frontend/src/features/containers/components/containers-table.tsx`
- Modify: `frontend/src/features/containers/components/container-utils.ts`

- [ ] **Step 1: Rewrite containers-summary-cards.tsx**

Replace the entire file content:

```tsx
import { MetricCard } from "@/components/metric-card";
import { Card, CardContent } from "@/components/ui/card";

interface HostInfo {
  hostname: string;
  os: string;
  kernel: string;
}

interface SystemUsage {
  cpu: number;
  memory: number;
  disk: number;
}

interface ContainersSummaryCardsProps {
  totalContainers: number;
  hostInfo: HostInfo;
  systemUsage: SystemUsage;
}

export function ContainersSummaryCards({
  totalContainers,
  hostInfo,
  systemUsage,
}: ContainersSummaryCardsProps) {
  return (
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <Card className="border-t-2 border-t-primary py-4">
        <CardContent className="px-6 py-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Host
          </p>
          <p className="mt-1 text-2xl font-bold truncate" title={hostInfo.hostname}>
            {hostInfo.hostname}
          </p>
          <p className="mt-1 text-xs text-muted-foreground truncate">
            {hostInfo.os} · {hostInfo.kernel}
          </p>
        </CardContent>
      </Card>

      <Card className="border-t-2 border-t-primary py-4">
        <CardContent className="px-6 py-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Containers
          </p>
          <p className="mt-1 text-2xl font-bold">{totalContainers}</p>
          <p className="mt-1 text-xs text-muted-foreground">total</p>
        </CardContent>
      </Card>

      <MetricCard
        label="CPU"
        value={`${systemUsage.cpu}%`}
        percent={systemUsage.cpu}
        color="indigo"
      />

      <MetricCard
        label="Memory"
        value={`${systemUsage.memory}%`}
        percent={systemUsage.memory}
        color="amber"
      />
    </section>
  );
}
```

- [ ] **Step 2: Update containers-table.tsx TableHead elements**

In `frontend/src/features/containers/components/containers-table.tsx`:

1. Add `StatusBadge` import at the top:
```tsx
import { StatusBadge } from "@/components/status-badge";
```

2. Replace ALL `<TableHead className="h-12 px-4 font-medium ...">` elements with uppercase tracking versions. Replace the entire `<TableHeader>` block:

```tsx
<TableHeader>
  <TableRow className="hover:bg-transparent border-b">
    <TableHead className="h-12 w-10 px-4">
      <input
        type="checkbox"
        checked={
          pageItems.length > 0 &&
          selectedIds.length === pageItems.length
        }
        onChange={onSelectAll}
        aria-label="Select all containers on this page"
      />
    </TableHead>
    <TableHead className="h-12 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name</TableHead>
    <TableHead className="h-12 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Image</TableHead>
    <TableHead className="h-12 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[130px]">State</TableHead>
    <TableHead className="h-12 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Uptime</TableHead>
    <TableHead className="h-12 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Created</TableHead>
    <TableHead className="h-12 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">CPU {statsInterval}</TableHead>
    <TableHead className="h-12 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">RAM {statsInterval}</TableHead>
    <TableHead className="h-12 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Command</TableHead>
    <TableHead className="h-12 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[160px]">Actions</TableHead>
  </TableRow>
</TableHeader>
```

3. In `renderContainerRow`, replace the status `TableCell`:

```tsx
<TableCell className="h-16 px-4">
  <StatusBadge status={container.state} />
</TableCell>
```

4. Remove the now-unused `Badge` import (keep others).

- [ ] **Step 3: Update getStateBadgeClass in container-utils.ts**

This function is still used in other places. Update the colors to match the new design. In `frontend/src/features/containers/components/container-utils.ts`, replace the `getStateBadgeClass` function:

```ts
export function getStateBadgeClass(state: string) {
  const normalized = state.toLowerCase();
  switch (normalized) {
    case "running":
      return "bg-green-500/10 text-green-600 dark:text-green-400";
    case "paused":
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400";
    case "exited":
    case "dead":
      return "bg-red-500/10 text-red-500";
    case "restarting":
      return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
    default:
      return "bg-muted text-muted-foreground";
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/containers/components/containers-summary-cards.tsx \
        frontend/src/features/containers/components/containers-table.tsx \
        frontend/src/features/containers/components/container-utils.ts
git commit -m "feat(ui): modernize dashboard cards and table headers"
```

---

## Task 6: Stats page — consistent colors

**Files:**
- Modify: `frontend/src/features/stats/components/container-stats-card.tsx`

- [ ] **Step 1: Replace hardcoded color functions**

In `frontend/src/features/stats/components/container-stats-card.tsx`, replace the `cpuColor` and `memoryColor` useMemo blocks with a single shared utility:

Replace:
```tsx
const cpuColor = useMemo(() => {
  if (!stats) return "bg-muted";
  if (stats.cpu_percent > 80) return "bg-red-500";
  if (stats.cpu_percent > 60) return "bg-yellow-500";
  return "bg-green-500";
}, [stats]);

const memoryColor = useMemo(() => {
  if (!stats) return "bg-muted";
  if (stats.memory_percent > 80) return "bg-red-500";
  if (stats.memory_percent > 60) return "bg-yellow-500";
  return "bg-green-500";
}, [stats]);
```

With:
```tsx
function metricColor(percent: number): string {
  if (percent > 80) return "bg-red-500";
  if (percent > 60) return "bg-amber-500";
  return "bg-green-500";
}
```

Then update usage — replace `indicatorClassName={cpuColor}` and `indicatorClassName={memoryColor}` with:
```tsx
indicatorClassName={stats ? metricColor(stats.cpu_percent) : "bg-muted"}
// and
indicatorClassName={stats ? metricColor(stats.memory_percent) : "bg-muted"}
```

Also update the Live/Off badge in the card header. Replace:
```tsx
<Badge variant={isConnected ? "default" : "secondary"} className="text-xs">
  {isConnected ? "Live" : "Off"}
</Badge>
```

With:
```tsx
<span className={cn(
  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
  isConnected
    ? "bg-green-500/10 text-green-600 border border-green-500/20 dark:text-green-400"
    : "bg-muted text-muted-foreground border border-border"
)}>
  <span className="size-1.5 rounded-full bg-current" />
  {isConnected ? "Live" : "Off"}
</span>
```

Add `cn` to imports if not already present:
```tsx
import { cn } from "@/lib/utils";
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/features/stats/components/container-stats-card.tsx
git commit -m "feat(ui): use amber/green/red metric colors in stats cards"
```

---

## Task 7: Processes page — shadcn Table

**Files:**
- Modify: `frontend/src/features/processes/components/processes-page.tsx`

- [ ] **Step 1: Rewrite processes-page.tsx**

Replace the entire file:

```tsx
import { CpuIcon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { useProcesses } from "../hooks/use-processes";

function metricColor(percent: number): string {
  if (percent > 80) return "bg-red-500";
  if (percent > 60) return "bg-amber-500";
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
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Top 20 by CPU · updates every 2s
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Loading…
            </p>
          )}

          {isError && (
            <p className="py-8 text-center text-sm text-destructive">
              Failed to load process data
            </p>
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
                {data.processes.map((proc, i) => (
                  <TableRow key={proc.pid}>
                    <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{proc.pid}</TableCell>
                    <TableCell className="font-medium">{proc.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Progress
                          value={Math.min(proc.cpu_percent, 100)}
                          className="h-1.5 w-24"
                          indicatorClassName={metricColor(proc.cpu_percent)}
                        />
                        <span className="w-12 font-mono text-xs">
                          {proc.cpu_percent.toFixed(1)}%
                        </span>
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
git commit -m "feat(ui): migrate processes page to shadcn Table"
```

---

## Task 8: Alerts — semantic colors

**Files:**
- Modify: `frontend/src/features/alerts/components/alerts-list.tsx`

- [ ] **Step 1: Replace hardcoded getAlertColor**

In `frontend/src/features/alerts/components/alerts-list.tsx`, replace the `getAlertColor` function:

```tsx
function getAlertColor(type: AlertType, acknowledged: boolean): string {
  if (acknowledged) return "text-muted-foreground";
  switch (type) {
    case "container_stopped":
      return "text-amber-500";
    case "cpu_threshold":
    case "memory_threshold":
      return "text-red-500";
    default:
      return "text-orange-500";
  }
}
```

- [ ] **Step 2: Update alert row border color**

In the same file, find the alert row `<div>` that uses inline conditional className and update its border treatment:

Replace:
```tsx
className={`flex items-start gap-4 p-4 rounded-lg border ${
  alert.acknowledged
    ? "bg-muted/30 opacity-60"
    : "bg-card"
}`}
```

With:
```tsx
className={cn(
  "flex items-start gap-4 p-4 rounded-lg border transition-opacity",
  alert.acknowledged ? "opacity-50" : "bg-card"
)}
```

Add `cn` import if missing:
```tsx
import { cn } from "@/lib/utils";
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/alerts/components/alerts-list.tsx
git commit -m "feat(ui): update alert colors to amber/red semantic palette"
```

---

## Task 9: Images + Networks — table header polish

**Files:**
- Modify: `frontend/src/features/images/components/images-table.tsx`
- Modify: `frontend/src/features/networks/components/networks-table.tsx`

- [ ] **Step 1: Update images-table.tsx TableHead elements**

In `frontend/src/features/images/components/images-table.tsx`, find the `<TableHeader>` block and add uppercase tracking to each `<TableHead>`:

Replace each `<TableHead className="...">` with one that includes `text-xs font-semibold uppercase tracking-wider text-muted-foreground`. For example:

```tsx
<TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
  Repository
</TableHead>
<TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
  Tag
</TableHead>
<TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
  Size
</TableHead>
<TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
  Created
</TableHead>
<TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
  Actions
</TableHead>
```

- [ ] **Step 2: Update networks-table.tsx TableHead elements**

In `frontend/src/features/networks/components/networks-table.tsx`, apply the same pattern to all `<TableHead>` elements:

```tsx
<TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
  Name
</TableHead>
<TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
  Driver
</TableHead>
<TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
  Scope
</TableHead>
<TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
  Subnet
</TableHead>
<TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
  Actions
</TableHead>
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/images/components/images-table.tsx \
        frontend/src/features/networks/components/networks-table.tsx
git commit -m "feat(ui): uppercase tracking table headers in images and networks"
```

---

## Task 10: Push and deploy

- [ ] **Step 1: Push to GitHub**

```bash
git push origin main
```

- [ ] **Step 2: Rebuild on VPS**

```bash
cd ~/vps-monitor && git pull && docker compose up -d --build
```

- [ ] **Step 3: Verify in browser**

Open `http://your-vps-ip:6789` and check:
- Header: nav links use indigo active state
- Dashboard: 4 top-accent metric cards with colored progress bars
- Container table: uppercase headers, pill status badges
- Processes page: clean Table layout
- Stats: amber (not yellow) for medium CPU/memory
- Alerts: amber for stopped, red for threshold alerts
- Images/Networks: uppercase table headers
- Toggle dark mode — all pages should look clean in both modes
