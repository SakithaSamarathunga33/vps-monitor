import {
	CpuIcon,
	DatabaseIcon,
	HardDriveIcon,
	RefreshCcwIcon,
	ServerIcon,
	WifiIcon,
} from "lucide-react";
import { useMemo } from "react";
import {
	Area,
	AreaChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { MetricCard } from "@/components/metric-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useSystemStats } from "@/features/containers/hooks/use-system-stats";
import type { HostStatPoint } from "../api/get-system-stats-history";
import { useDockerDiskUsage } from "../hooks/use-docker-disk-usage";
import { useSystemStatsHistory } from "../hooks/use-system-stats-history";

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

function formatTimeTick(
	ts: number,
	_oldestTs: number,
	newestTs: number,
): string {
	const diff = newestTs - ts;
	if (diff < 15) return "now";
	if (diff < 3600) return `-${Math.round(diff / 60)}m`;
	return `-${Math.round(diff / 3600)}h`;
}

interface ChartCardProps {
	icon: React.ElementType;
	title: string;
	live?: boolean;
	currentValue: string;
	data: HostStatPoint[];
	dataKey: keyof HostStatPoint;
	color: string;
	sub: string;
	yDomain?: [number, number];
	tooltipUnit?: string;
	customTooltipFmt?: (v: number, name: string) => [string, string];
}

function ChartCard({
	icon: Icon,
	title,
	live = false,
	currentValue,
	data,
	dataKey,
	color,
	sub,
	yDomain = [0, 100],
	tooltipUnit = "%",
	customTooltipFmt,
}: ChartCardProps) {
	const ticks = useMemo(() => {
		if (data.length < 2) return [];
		const first = data[0].ts;
		const last = data[data.length - 1].ts;
		const step = (last - first) / 4;
		return [first, first + step, first + 2 * step, first + 3 * step, last];
	}, [data]);

	const oldest = data[0]?.ts ?? 0;
	const newest = data[data.length - 1]?.ts ?? 0;

	const values = useMemo(
		() => data.map((p) => p[dataKey] as number),
		[data, dataKey],
	);
	const avg = values.length
		? values.reduce((a, b) => a + b, 0) / values.length
		: 0;
	const max = values.length ? Math.max(...values) : 0;
	const gradId = `grad-${String(dataKey)}`;

	if (data.length < 2) return null;

	return (
		<Card className="overflow-hidden">
			{/* Header */}
			<div className="flex items-center justify-between border-b border-border px-4 py-3">
				<div className="flex items-center gap-2">
					<Icon className="size-3.5 text-muted-foreground" />
					<span className="text-xs font-bold uppercase tracking-wider">
						{title}
					</span>
					{live && (
						<span className="flex items-center gap-1 text-[10px] font-semibold text-green-500">
							<span className="size-1.5 rounded-full bg-green-500" />
							LIVE
						</span>
					)}
				</div>
				<span className="font-mono text-lg font-semibold tabular-nums">
					{currentValue}
				</span>
			</div>

			{/* Chart */}
			<div className="px-2 pb-1 pt-2">
				<ResponsiveContainer width="100%" height={160}>
					<AreaChart
						data={data}
						margin={{ top: 4, right: 8, left: 0, bottom: 14 }}
					>
						<defs>
							<linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
								<stop offset="5%" stopColor={color} stopOpacity={0.28} />
								<stop offset="95%" stopColor={color} stopOpacity={0.03} />
							</linearGradient>
						</defs>
						<CartesianGrid
							strokeDasharray="3 3"
							stroke="hsl(var(--border))"
							strokeOpacity={0.4}
						/>
						<XAxis
							dataKey="ts"
							ticks={ticks}
							tickFormatter={(ts) => formatTimeTick(ts, oldest, newest)}
							tick={{
								fontSize: 9,
								fill: "hsl(var(--muted-foreground))",
								fontFamily: "JetBrains Mono, monospace",
							}}
							axisLine={false}
							tickLine={false}
						/>
						<YAxis
							domain={yDomain}
							width={30}
							tick={{
								fontSize: 9,
								fill: "hsl(var(--muted-foreground))",
								fontFamily: "JetBrains Mono, monospace",
							}}
							axisLine={false}
							tickLine={false}
							tickFormatter={(v) => `${v}`}
						/>
						<Tooltip
							contentStyle={{
								background: "hsl(var(--popover))",
								border: "1px solid hsl(var(--border))",
								borderRadius: 8,
								fontSize: 11,
							}}
							formatter={
								customTooltipFmt
									? (v, name) => customTooltipFmt(v as number, String(name))
									: (v) => [`${(v as number).toFixed(1)}${tooltipUnit}`, ""]
							}
							labelFormatter={() => ""}
						/>
						<Area
							type="monotone"
							dataKey={dataKey as string}
							stroke={color}
							fill={`url(#${gradId})`}
							strokeWidth={1.6}
							dot={(props) => {
								const { index, cx, cy } = props as {
									index: number;
									cx: number;
									cy: number;
								};
								if (index !== data.length - 1)
									return <g key={`dot-${index}`} />;
								return (
									<circle
										key={`dot-${index}`}
										cx={cx}
										cy={cy}
										r={3}
										fill={color}
										stroke="hsl(var(--card))"
										strokeWidth={1.5}
									/>
								);
							}}
							isAnimationActive={false}
						/>
					</AreaChart>
				</ResponsiveContainer>
			</div>

			{/* Footer */}
			<div className="flex items-center justify-between px-4 pb-3 font-mono text-[11px] text-muted-foreground">
				<span>{sub}</span>
				<span>
					avg{" "}
					<span className="font-semibold text-foreground">
						{avg.toFixed(1)}
					</span>{" "}
					· max{" "}
					<span className="font-semibold text-foreground">
						{max.toFixed(1)}
					</span>
				</span>
			</div>
		</Card>
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
			<div className="mb-1 flex justify-between font-mono text-xs text-muted-foreground">
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
			(usage?.memoryBuffers ?? 0),
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
					sparkData={
						history.length >= 2 ? history.map((p) => p.cpu) : undefined
					}
					delta={
						history.length >= 12
							? (() => {
									const d =
										history[history.length - 1].cpu -
										history[history.length - 12].cpu;
									return `${d >= 0 ? "+" : ""}${d.toFixed(1)}%`;
								})()
							: undefined
					}
					deltaTone={
						history.length >= 12 &&
						history[history.length - 1].cpu >= history[history.length - 12].cpu
							? "up"
							: "down"
					}
				/>
				<MetricCard
					label="Memory"
					value={`${(usage?.memoryPercent ?? 0).toFixed(1)}%`}
					percent={usage?.memoryPercent ?? 0}
					color="amber"
					subtitle={`${formatBytes(usage?.memoryUsed ?? 0)} / ${formatBytes(usage?.memoryTotal ?? 0)}`}
					sparkData={
						history.length >= 2 ? history.map((p) => p.mem) : undefined
					}
					delta={
						history.length >= 12
							? (() => {
									const d =
										history[history.length - 1].mem -
										history[history.length - 12].mem;
									return `${d >= 0 ? "+" : ""}${d.toFixed(1)}%`;
								})()
							: undefined
					}
					deltaTone={
						history.length >= 12 &&
						history[history.length - 1].mem >= history[history.length - 12].mem
							? "up"
							: "down"
					}
				/>
				<MetricCard
					label="Disk"
					value={`${(usage?.diskPercent ?? 0).toFixed(1)}%`}
					percent={usage?.diskPercent ?? 0}
					color="green"
					subtitle={`${formatBytes(diskFreeBytes)} free`}
					sparkData={
						history.length >= 2 ? history.map((p) => p.disk) : undefined
					}
				/>
				<MetricCard
					label="Network ↓"
					value={formatNetRate(netRxRate)}
					percent={Math.min(100, (netRxRate / 1024 / 1024) * 100)}
					color="cyan"
					subtitle={`↑ ${formatNetRate(netTxRate)}`}
					sparkData={
						history.length >= 2 ? history.map((p) => p.rx + p.tx) : undefined
					}
				/>
			</div>

			{/* Main charts — 2x2 grid */}
			{history.length >= 2 && (
				<div className="grid gap-4 md:grid-cols-2">
					<ChartCard
						icon={CpuIcon}
						title="CPU"
						live
						currentValue={`${(usage?.cpuPercent ?? 0).toFixed(1)}%`}
						data={history}
						dataKey="cpu"
						color="#6366f1"
						sub={`${host?.cpuLogical ?? "—"} cores · avg ${(usage?.cpuPercent ?? 0).toFixed(0)}%`}
					/>
					<ChartCard
						icon={ServerIcon}
						title="Memory"
						live
						currentValue={`${(usage?.memoryPercent ?? 0).toFixed(1)}%`}
						data={history}
						dataKey="mem"
						color="#f59e0b"
						sub={`${formatBytes(usage?.memoryUsed ?? 0)} / ${formatBytes(usage?.memoryTotal ?? 0)}`}
					/>
					<ChartCard
						icon={HardDriveIcon}
						title="Disk"
						currentValue={`${(usage?.diskPercent ?? 0).toFixed(1)}%`}
						data={history}
						dataKey="disk"
						color="#06b6d4"
						sub={`${formatBytes(usage?.diskUsed ?? 0)} used · ${formatBytes(diskFreeBytes)} free`}
					/>
					<ChartCard
						icon={WifiIcon}
						title="Network"
						currentValue={formatNetRate(netRxRate)}
						data={history}
						dataKey="rx"
						color="#22c55e"
						yDomain={[0, Math.max(...history.map((p) => p.rx), 1)]}
						sub={`rx ${formatNetRate(netRxRate)} · tx ${formatNetRate(netTxRate)}`}
						tooltipUnit=""
						customTooltipFmt={(v) => [formatBytes(v), "rx"]}
					/>
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
								{
									label: "OS",
									value: host
										? `${host.platform} ${host.platformVersion}`
										: undefined,
								},
								{ label: "Kernel", value: host?.kernelVersion },
								{ label: "Arch", value: host?.arch },
								{
									label: "Uptime",
									value: host ? formatUptime(host.uptime) : undefined,
								},
								{
									label: "CPU Cores",
									value: host
										? `${host.cpuLogical} logical${host.cpuPhysical ? ` / ${host.cpuPhysical} physical` : ""}`
										: undefined,
								},
								{
									label: "Load avg",
									value: load
										? `${load.load1.toFixed(2)} · ${load.load5.toFixed(2)} · ${load.load15.toFixed(2)}`
										: undefined,
								},
							].map(({ label, value }) => (
								<div key={label} className="flex justify-between gap-2">
									<dt className="shrink-0 text-muted-foreground">{label}</dt>
									<dd className="truncate text-right font-mono text-xs">
										{value ?? "—"}
									</dd>
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
							<span>
								Total ·{" "}
								<span className="font-mono text-foreground">
									{formatBytes(memTotal)}
								</span>
							</span>
							<span className="font-mono">
								used {formatBytes(usage?.memoryUsed ?? 0)}
							</span>
						</div>

						<div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
							<div
								style={{ width: `${(memAppBytes / memTotal) * 100}%` }}
								className="bg-indigo-500"
							/>
							<div
								style={{ width: `${(memCachedBytes / memTotal) * 100}%` }}
								className="bg-sky-500"
							/>
							<div
								style={{ width: `${(memBuffersBytes / memTotal) * 100}%` }}
								className="bg-amber-500"
							/>
							<div
								style={{ width: `${(memFreeBytes / memTotal) * 100}%` }}
								className="bg-muted"
							/>
						</div>

						<div className="grid grid-cols-2 gap-2 text-xs">
							{[
								{ label: "App", bytes: memAppBytes, color: "bg-indigo-500" },
								{ label: "Cache", bytes: memCachedBytes, color: "bg-sky-500" },
								{
									label: "Buffers",
									bytes: memBuffersBytes,
									color: "bg-amber-500",
								},
								{
									label: "Free",
									bytes: memFreeBytes,
									color: "bg-muted-foreground/30",
								},
							].map(({ label, bytes, color }) => (
								<div key={label} className="flex items-center gap-2">
									<span className={`size-2 shrink-0 rounded-sm ${color}`} />
									<span className="text-muted-foreground">{label}</span>
									<span className="ml-auto font-mono">
										{formatBytes(bytes)}
									</span>
								</div>
							))}
						</div>

						{(usage?.swapTotal ?? 0) > 0 && (
							<div className="border-t pt-3">
								<div className="mb-1.5 flex justify-between text-xs text-muted-foreground">
									<span>Swap</span>
									<span className="font-mono">
										{formatBytes(usage?.swapUsed ?? 0)} /{" "}
										{formatBytes(usage?.swapTotal ?? 0)} · {swapPct.toFixed(0)}%
									</span>
								</div>
								<Progress
									value={swapPct}
									className="h-1.5"
									indicatorClassName="bg-sky-500"
								/>
							</div>
						)}

						{(usage?.cpuPerCore?.length ?? 0) > 0 && (
							<div className="space-y-2 border-t pt-3">
								<div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
									CPU Cores
								</div>
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
							<span className="font-mono text-3xl font-bold tabular-nums">
								{(usage?.diskPercent ?? 0).toFixed(0)}
								<span className="text-sm font-normal text-muted-foreground">
									%
								</span>
							</span>
							<span className="font-mono text-xs text-muted-foreground">
								{formatBytes(usage?.diskUsed ?? 0)} used ·{" "}
								{formatBytes(diskFreeBytes)} free
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
										{
											label: "Build cache",
											bytes: dockerDisk.buildCacheBytes,
										},
									].map(({ label, bytes }) => (
										<div key={label}>
											<div className="text-[10px] uppercase tracking-wider text-muted-foreground">
												{label}
											</div>
											<div className="font-mono text-sm font-semibold tabular-nums">
												{formatBytes(bytes)}
											</div>
										</div>
									))}
								</div>
							</div>
						)}

						<div className="flex justify-between border-t pt-3 text-xs text-muted-foreground">
							<span>Total</span>
							<span className="font-mono">
								{formatBytes(usage?.diskTotal ?? 0)}
							</span>
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
				<span>Live · polling every 5s</span>
				{history.length > 0 && (
					<Badge variant="outline" className="ml-2 text-[10px]">
						{history.length} history points
					</Badge>
				)}
			</div>
		</div>
	);
}
