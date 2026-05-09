# UI Modernization — Design Spec

**Date:** 2026-05-09  
**Status:** Approved

## Overview

Modernize the entire VPS-Monitor frontend to a clean, Vercel/Linear-inspired design with full light and dark mode support. The design uses indigo as the primary accent, semantic status colors (green/amber/red), pill-shaped badges, top-accent metric cards, and uppercase tracking table headers — applied consistently across all pages using shadcn components.

## Design Tokens

Update `frontend/src/styles.css` CSS variables:

**Light mode:**
- Background: `#f8fafc` (slate-50)
- Card: `#ffffff`
- Border: `#e2e8f0` (slate-200)
- Primary: `#6366f1` (indigo-500)
- Primary foreground: `#ffffff`
- Muted bg: `#f1f5f9` (slate-100)
- Muted text: `#64748b` (slate-500)
- Foreground: `#0f172a` (slate-900)

**Dark mode:**
- Background: `#0c0e14`
- Card: `#13151f`
- Border: `#1e2132`
- Primary: `#6366f1` (same indigo)
- Primary foreground: `#ffffff`
- Muted bg: `#0f1118`
- Muted text: `#475569` (slate-600)
- Foreground: `#f1f5f9` (slate-100)

**Semantic status colors (both modes):**
- Running/success: green-500 (`#10b981`) with `bg-green-500/10 text-green-600 border-green-500/20`
- Exited/error: red-500 (`#ef4444`) with `bg-red-500/10 text-red-500 border-red-500/20`
- Paused/warning: amber-500 (`#f59e0b`) with `bg-amber-500/10 text-amber-600 border-amber-500/20`
- CPU metric accent: indigo-500
- Memory metric accent: amber-500
- Disk metric accent: green-500

## Components Changed

### 1. CSS Variables (`frontend/src/styles.css`)
Replace existing OKLch color palette with the slate/indigo token set above. Preserve all variable names so existing shadcn components auto-update.

### 2. Shared Status Badge (`frontend/src/components/status-badge.tsx`)
New shared component — pill badge for container status used everywhere:
```tsx
<StatusBadge status="running" />  // → green pill "● running"
<StatusBadge status="exited" />   // → red pill "● exited"
<StatusBadge status="paused" />   // → amber pill "● paused"
```
Replaces all ad-hoc `Badge` + inline color logic across containers, stats, processes pages.

### 3. Metric Card (`frontend/src/components/metric-card.tsx`)
New shared component — top-accent card with uppercase label, large value, colored progress bar:
```tsx
<MetricCard label="CPU" value="23%" percent={23} color="indigo" />
<MetricCard label="MEMORY" value="67%" percent={67} color="amber" />
<MetricCard label="DISK" value="45%" percent={45} color="green" />
```
Replaces the inline summary cards in the dashboard and fixes the raw `<div>` progress bars.

### 4. Header (`frontend/src/components/header.tsx`)
- Active nav link: `bg-primary/10 text-primary border border-primary/20 rounded-md` (indigo tint)
- Logo: indigo square icon instead of plain `ServerIcon`
- Clean up alert badge integration

### 5. Containers Dashboard (`frontend/src/features/containers/components/`)
- `containers-summary-cards.tsx`: Replace with `MetricCard` components
- `containers-table.tsx`: Uppercase tracking `TableHead`, `StatusBadge` for status column, remove inline colors
- Batch action bar: wrap in `Card` with `CardContent`, use shadcn `Button` variants

### 6. Stats Page (`frontend/src/features/stats/components/container-stats-card.tsx`)
- Replace hardcoded `bg-red-500/yellow/green` strings with CSS variable-aware color utility
- Use `StatusBadge` for live/off indicator

### 7. Processes Page (`frontend/src/features/processes/components/processes-page.tsx`)
- Replace manual grid `<div>` layout with shadcn `Table` / `TableRow` / `TableCell`
- Reuse `MetricCard` color logic for the CPU progress bar

### 8. Alerts Page (`frontend/src/features/alerts/components/`)
- Replace hardcoded `text-yellow-500`, `text-red-500` with semantic CSS variable classes
- Config info section: use `Card` + grid instead of raw divs

### 9. Images & Networks Pages
- Table headers: add `uppercase tracking-wide text-xs` to `TableHead` elements
- Already largely consistent — minor polish only

## Scope Boundaries

**In scope:** CSS tokens, shared MetricCard + StatusBadge components, dashboard, stats, processes, alerts, header, images/networks table headers.

**Out of scope:** Scan History, SBOM pages, Settings page, mobile app, footer social icons, chart colors (Recharts), terminal/log viewer styling.

## Implementation Order

1. CSS tokens (everything auto-updates)
2. `StatusBadge` + `MetricCard` shared components
3. Header active state
4. Dashboard summary cards + table
5. Stats page color fix
6. Processes page table migration
7. Alerts page color fix
8. Images + Networks table header polish
