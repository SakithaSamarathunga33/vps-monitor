import { useMemo } from "react";
import {
  ActivityIcon,
  CpuIcon,
  DatabaseIcon,
  HardDriveIcon,
  NetworkIcon,
  RefreshCcwIcon,
  ServerIcon,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { MetricCard } from "@/components/metric-card";
import { useSystemStats } from "@/features/containers/hooks/use-system-stats";

import { useSystemStatsHistory } from "../hooks/use-system-stats-history";
import { useDockerDiskUsage } from "../hooks/use-docker-disk-usage";
import type { HostStatPoint } from "../api/get-system-stats-history";

function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  const gb = bytes / 1024 ** 3;
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  const mb = bytes / 1024 ** 2;
  if (mb >= 1) return `${mb.toFixed(0)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatNetRate(bytesPerSec: number): string {
  const kb = bytesPerSec / 1024;
  if (kb >= 1024) return `${(kb / 1024).toFixed(1)} MB/s`;
  return `${kb.toFixed(0)} KB/s`;
}

function SparklineArea({
  data,
  dataKey,
  color,
}: {
  data: HostStatPoint[];
  dataKey: keyof HostStatPoint;
  color: string;
}) {
  if (data.length < 2) return null;
  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
        <XAxis dataKey="ts" hide />
        <YAxis domain={[0, 100]} width={28} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
        <Tooltip
          contentStyle={{
            background: "hsl(var(--popover))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 8,
            fontSize: 11,
          }}
          formatter={(v) => [`${(v as number).toFixed(1)}%`, ""]}
          labelFormatter={() => ""}
        />
        <Area
          type="monotone"
          dataKey={dataKey as string}
          stroke={color}
          fill={color}
          fillOpacity={0.15}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

interface CoreBarProps {
  index: number;
  value: number;
}

function CoreBar({ index, value }: CoreBarProps) {
  const color =
    value > 80 ? "bg-red-500" : value > 60 ? "bg-amber-500" : "bg-green-500";
  return (
    <div>
      <div className="flex justify-between font-mono text-xs text-muted-foreground mb-1">
        <span>CPU{index + 1}</span>
        <span>{value.toFixed(0)}%</span>
      </div>
      <Progress value={value} className="h-1.5" indicatorClassName={color} />
    </div>
  );
}

export function StatsPage() {
  const { data: stats, isLoading, refetch, isRefetching } = useSystemStats();
  const { data: history = [] } = useSystemStatsHistory();
  const { data: dockerDisk } = useDockerDiskUsage();

  // Compute derived network rate from last two history points
  const netRxRate = useMemo(() => {
    if (history.length < 2) return 0;
    const last = history[history.length - 1];
    const prev = history[history.length - 2];
    const dt = last.ts - prev.ts;
    if (dt <= 0) return 0;
    return Math.max(0, (last.rx - prev.rx) / dt);
  }, [history]);

  const netTxRate = useMemo(() => {
    if (history.length < 2) return 0;
    const last = history[history.length - 1];
    const prev = history[history.length - 2];
    const dt = last.ts - prev.ts;
    if (dt <= 0) return 0;
    return Math.max(0, (last.tx - prev.tx) / dt);
  }, [history]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  const usage = stats?.usage;
  const host = stats?.hostInfo;
  const load = stats?.load;

  const memFreeBytes = (usage?.memoryTotal ?? 0) - (usage?.memoryUsed ?? 0);
  const memAppBytes = Math.max(
    0,
    (usage?.memoryUsed ?? 0) -
      (usage?.memoryCached ?? 0) -
      (usage?.memoryBuffers ?? 0)
  );
  const memCachedBytes = usage?.memoryCached ?? 0;
  const memBuffersBytes = usage?.memoryBuffers ?? 0;
  const memTotal = usage?.memoryTotal ?? 1;

  const swapPct =
    (usage?.swapTotal ?? 0) > 0
      ? ((usage?.swapUsed ?? 0) / (usage?.swapTotal ?? 1)) * 100
      : 0;

  const diskFreeBytes = (usage?.diskTotal ?? 0) - (usage?.diskUsed ?? 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">System Stats</h1>
          <p className="text-sm text-muted-foreground">
            Real-time host metrics · {host?.hostname ?? "—"}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isRefetching}
        >
          <RefreshCcwIcon
            className={`mr-2 size-4 ${isRefetching ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <MetricCard
          label="CPU"
          value={`${(usage?.cpuPercent ?? 0).toFixed(1)}%`}
          percent={usage?.cpuPercent ?? 0}
          color="indigo"
          subtitle={`${host?.cpuLogical ?? "—"} logical cores`}
          sparkData={history.length >= 2 ? history.map((p) => p.cpu) : undefined}
          delta={history.length >= 12 ? (() => { const d = history[history.length - 1].cpu - history[history.length - 12].cpu; return `${d >= 0 ? "+" : ""}${d.toFixed(1)}%`; })() : undefined}
          deltaTone={history.length >= 12 && history[history.length - 1].cpu >= history[history.length - 12].cpu ? "up" : "down"}
        />
        <MetricCard
          label="Memory"
          value={`${(usage?.memoryPercent ?? 0).toFixed(1)}%`}
          percent={usage?.memoryPercent ?? 0}
          color="amber"
          subtitle={`${formatBytes(usage?.memoryUsed ?? 0)} / ${formatBytes(usage?.memoryTotal ?? 0)}`}
          sparkData={history.length >= 2 ? history.map((p) => p.mem) : undefined}
          delta={history.length >= 12 ? (() => { const d = history[history.length - 1].mem - history[history.length - 12].mem; return `${d >= 0 ? "+" : ""}${d.toFixed(1)}%`; })() : undefined}
          deltaTone={history.length >= 12 && history[history.length - 1].mem >= history[history.length - 12].mem ? "up" : "down"}
        />
        <MetricCard
          label="Disk"
          value={`${(usage?.diskPercent ?? 0).toFixed(1)}%`}
          percent={usage?.diskPercent ?? 0}
          color="green"
          subtitle={`${formatBytes(diskFreeBytes)} free`}
          sparkData={history.length >= 2 ? history.map((p) => p.disk) : undefined}
        />
        <MetricCard
          label="Network ↓"
          value={formatNetRate(netRxRate)}
          percent={Math.min(100, (netRxRate / 1024 / 1024) * 100)}
          color="cyan"
          subtitle={`↑ ${formatNetRate(netTxRate)}`}
          sparkData={history.length >= 2 ? history.map((p) => p.rx + p.tx) : undefined}
        />
      </div>

      {/* Charts */}
      {history.length >= 2 && (
        <div className="grid gap-4 md:grid-cols-2">
          {[
            { title: "CPU", dataKey: "cpu" as const, color: "hsl(var(--chart-1))" },
            { title: "Memory", dataKey: "mem" as const, color: "hsl(var(--chart-2))" },
            { title: "Disk", dataKey: "disk" as const, color: "hsl(var(--chart-3))" },
          ].map((chart) => (
            <Card key={chart.title}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  <ActivityIcon className="size-4" />
                  {chart.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <SparklineArea data={history} dataKey={chart.dataKey} color={chart.color} />
              </CardContent>
            </Card>
          ))}

          {/* Network chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                <NetworkIcon className="size-4" />
                Network (cumulative bytes)
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={history} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                  <XAxis dataKey="ts" hide />
                  <YAxis width={28} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `${(v / 1e6).toFixed(0)}M`} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 11,
                    }}
                    formatter={(v, name) => [formatBytes(v as number), name === "rx" ? "↓ Rx" : "↑ Tx"]}
                    labelFormatter={() => ""}
                  />
                  <Area type="monotone" dataKey="rx" stroke="hsl(var(--chart-3))" fill="hsl(var(--chart-3))" fillOpacity={0.15} strokeWidth={1.5} dot={false} isAnimationActive={false} />
                  <Area type="monotone" dataKey="tx" stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1))" fillOpacity={0.15} strokeWidth={1.5} dot={false} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detail cards row */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Host info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              <ServerIcon className="size-4" />
              Host
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2 text-sm">
              {[
                { label: "Hostname", value: host?.hostname },
                { label: "OS", value: host ? `${host.platform} ${host.platformVersion}` : undefined },
                { label: "Kernel", value: host?.kernelVersion },
                { label: "Arch", value: host?.arch },
                { label: "Uptime", value: host ? formatUptime(host.uptime) : undefined },
                { label: "CPU Cores", value: host ? `${host.cpuLogical} logical${host.cpuPhysical ? ` / ${host.cpuPhysical} physical` : ""}` : undefined },
                { label: "Load avg", value: load ? `${load.load1.toFixed(2)} · ${load.load5.toFixed(2)} · ${load.load15.toFixed(2)}` : undefined },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between gap-2">
                  <dt className="text-muted-foreground shrink-0">{label}</dt>
                  <dd className="font-mono text-xs text-right truncate">{value ?? "—"}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        {/* Memory breakdown */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              <CpuIcon className="size-4" />
              Memory Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Total · <span className="font-mono text-foreground">{formatBytes(memTotal)}</span></span>
              <span className="font-mono">used {formatBytes(usage?.memoryUsed ?? 0)}</span>
            </div>

            {/* Segmented bar */}
            <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
              <div style={{ width: `${(memAppBytes / memTotal) * 100}%` }} className="bg-indigo-500" />
              <div style={{ width: `${(memCachedBytes / memTotal) * 100}%` }} className="bg-sky-500" />
              <div style={{ width: `${(memBuffersBytes / memTotal) * 100}%` }} className="bg-amber-500" />
              <div style={{ width: `${(memFreeBytes / memTotal) * 100}%` }} className="bg-muted" />
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { label: "App", bytes: memAppBytes, color: "bg-indigo-500" },
                { label: "Cache", bytes: memCachedBytes, color: "bg-sky-500" },
                { label: "Buffers", bytes: memBuffersBytes, color: "bg-amber-500" },
                { label: "Free", bytes: memFreeBytes, color: "bg-muted-foreground/30" },
              ].map(({ label, bytes, color }) => (
                <div key={label} className="flex items-center gap-2">
                  <span className={`size-2 shrink-0 rounded-sm ${color}`} />
                  <span className="text-muted-foreground">{label}</span>
                  <span className="ml-auto font-mono">{formatBytes(bytes)}</span>
                </div>
              ))}
            </div>

            {(usage?.swapTotal ?? 0) > 0 && (
              <div className="border-t pt-3">
                <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                  <span>Swap</span>
                  <span className="font-mono">{formatBytes(usage?.swapUsed ?? 0)} / {formatBytes(usage?.swapTotal ?? 0)} · {swapPct.toFixed(0)}%</span>
                </div>
                <Progress value={swapPct} className="h-1.5" indicatorClassName="bg-sky-500" />
              </div>
            )}

            {/* Per-core CPU */}
            {(usage?.cpuPerCore?.length ?? 0) > 0 && (
              <div className="border-t pt-3 space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">CPU Cores</div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  {(usage?.cpuPerCore ?? []).map((pct, i) => (
                    <CoreBar key={i} index={i} value={pct} />
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Disk */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              <HardDriveIcon className="size-4" />
              Disk
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono tabular-nums">
                {(usage?.diskPercent ?? 0).toFixed(0)}
                <span className="text-sm font-normal text-muted-foreground">%</span>
              </span>
              <span className="text-xs text-muted-foreground font-mono">
                {formatBytes(usage?.diskUsed ?? 0)} used · {formatBytes(diskFreeBytes)} free
              </span>
            </div>
            <Progress
              value={usage?.diskPercent ?? 0}
              className="h-2"
              indicatorClassName={
                (usage?.diskPercent ?? 0) > 90
                  ? "bg-red-500"
                  : (usage?.diskPercent ?? 0) > 75
                  ? "bg-amber-500"
                  : "bg-green-500"
              }
            />

            {dockerDisk && (
              <div className="border-t pt-3">
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <DatabaseIcon className="size-3" />
                  Docker Usage
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Images", bytes: dockerDisk.imagesBytes },
                    { label: "Volumes", bytes: dockerDisk.volumesBytes },
                    { label: "Containers", bytes: dockerDisk.containersBytes },
                    { label: "Build cache", bytes: dockerDisk.buildCacheBytes },
                  ].map(({ label, bytes }) => (
                    <div key={label}>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
                      <div className="font-mono text-sm font-semibold tabular-nums">{formatBytes(bytes)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t pt-3 flex justify-between text-xs text-muted-foreground">
              <span>Total</span>
              <span className="font-mono">{formatBytes(usage?.diskTotal ?? 0)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live indicator */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex size-2 rounded-full bg-green-500" />
        </span>
        <span>Live · polling every 2s</span>
        {history.length > 0 && (
          <Badge variant="outline" className="ml-2 text-[10px]">
            {history.length} history points
          </Badge>
        )}
      </div>
    </div>
  );
}
