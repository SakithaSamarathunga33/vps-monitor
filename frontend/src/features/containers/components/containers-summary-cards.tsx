import {
	ActivityIcon,
	CpuIcon,
	Globe2Icon,
	HardDriveIcon,
	MemoryStickIcon,
	NetworkIcon,
	ServerIcon,
	Trash2Icon,
} from "lucide-react";
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
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";

interface HostInfo {
	hostname: string;
	os: string;
	kernel: string;
}

interface SystemUsage {
	cpu: number;
	memory: number;
	disk: number;
	memoryUsed: number;
	memoryTotal: number;
	cpuLogical: number;
	diskUsed: number;
	diskTotal: number;
	load?: {
		load1: number;
		load5: number;
		load15: number;
	};
	network?: {
		rxBytes: number;
		txBytes: number;
	};
}

interface ContainersSummaryCardsProps {
	totalContainers: number;
	totalPM2Apps?: number;
	hostInfo: HostInfo;
	systemUsage: SystemUsage;
	runningCount: number;
	stoppedCount: number;
	sparkCpu?: number[];
	sparkMem?: number[];
	sparkNet?: number[];
	deltaCpu?: string;
	deltaMem?: string;
	netRxRate?: number;
	netTxRate?: number;
	isReadOnly?: boolean;
	isClearingCache?: boolean;
	onClearCache?: () => void;
}

function formatBytes(bytes: number): string {
	if (bytes === 0) return "0 B";
	const gb = bytes / 1024 ** 3;
	if (gb >= 1) return `${gb.toFixed(gb >= 10 ? 0 : 1)} GB`;
	const mb = bytes / 1024 ** 2;
	return `${Math.round(mb)} MB`;
}

function formatRate(bytesPerSec: number): string {
	const kb = bytesPerSec / 1024;
	if (kb >= 1024) return `${(kb / 1024).toFixed(1)} MB/s`;
	return `${kb.toFixed(0)} KB/s`;
}

function diskColor(pct: number): string {
	if (pct >= 90) return "bg-red-500";
	if (pct >= 75) return "bg-amber-500";
	return "bg-green-500";
}

function InlineSparkline({ data, color }: { data: number[]; color: string }) {
	if (data.length < 2) return null;
	const W = 160,
		H = 28;
	const max = Math.max(...data);
	const min = Math.min(...data);
	const range = max - min || 1;
	const step = W / (data.length - 1);
	const pts = data.map(
		(v, i) =>
			`${(i * step).toFixed(2)},${(H - 2 - ((v - min) / range) * (H - 4)).toFixed(2)}`,
	);
	const d = `M ${pts.join(" L ")}`;
	const dFill = `${d} L ${W},${H} L 0,${H} Z`;
	return (
		<svg
			aria-hidden="true"
			width={W}
			height={H}
			viewBox={`0 0 ${W} ${H}`}
			style={{ display: "block", width: "100%" }}
		>
			<path d={dFill} fill={color} fillOpacity={0.15} />
			<path
				d={d}
				fill="none"
				stroke={color}
				strokeWidth={1.4}
				strokeLinejoin="round"
				strokeLinecap="round"
			/>
		</svg>
	);
}

function KpiSparkline({ data, color }: { data: number[]; color: string }) {
	if (data.length < 2) return null;
	const W = 100,
		H = 26;
	const max = Math.max(...data);
	const min = Math.min(...data);
	const range = max - min || 1;
	const step = W / (data.length - 1);
	const pts = data.map(
		(v, i) =>
			`${(i * step).toFixed(2)},${(H - 2 - ((v - min) / range) * (H - 4)).toFixed(2)}`,
	);
	const d = `M ${pts.join(" L ")}`;
	const dFill = `${d} L ${W},${H} L 0,${H} Z`;
	return (
		<svg
			aria-hidden="true"
			width={W}
			height={H}
			viewBox={`0 0 ${W} ${H}`}
			style={{ display: "block", flexShrink: 0 }}
		>
			<path d={dFill} fill={color} fillOpacity={0.15} />
			<path
				d={d}
				fill="none"
				stroke={color}
				strokeWidth={1.4}
				strokeLinejoin="round"
				strokeLinecap="round"
			/>
		</svg>
	);
}

export function ContainersSummaryCards({
	totalContainers,
	totalPM2Apps = 0,
	hostInfo,
	systemUsage,
	runningCount,
	stoppedCount,
	sparkCpu,
	sparkMem,
	sparkNet,
	deltaCpu,
	deltaMem,
	netRxRate = 0,
	netTxRate = 0,
	isReadOnly = false,
	isClearingCache = false,
	onClearCache,
}: ContainersSummaryCardsProps) {
	const memorySubtitle =
		systemUsage.memoryTotal > 0
			? `${formatBytes(systemUsage.memoryUsed)} / ${formatBytes(systemUsage.memoryTotal)}`
			: undefined;

	const diskFree = Math.max(0, systemUsage.diskTotal - systemUsage.diskUsed);

	const hasCpuSpark = sparkCpu && sparkCpu.length >= 2;
	const hasMemSpark = sparkMem && sparkMem.length >= 2;
	const hasNetSpark = sparkNet && sparkNet.length >= 2;

	return (
		<section className="helm-metrics-grid">
			{/* Host */}
			<Card className="helm-metric-card">
				<CardContent>
					<p className="helm-metric-label">
						<Globe2Icon className="size-3.5" />
						Host
					</p>
					<p className="helm-metric-value is-host" title={hostInfo.hostname}>
						{hostInfo.hostname}
					</p>
					<div className="helm-chip-row">
						<span>{hostInfo.os}</span>
						<span>kernel {hostInfo.kernel}</span>
					</div>
				</CardContent>
			</Card>

			{/* Apps */}
			<Card className="helm-metric-card">
				<CardContent>
					<p className="helm-metric-label">
						<ServerIcon className="size-3.5" />
						Apps
					</p>
					<div className="helm-metric-value">
						<span>{totalContainers}</span>
						<span className="helm-metric-unit">containers</span>
					</div>
					<div className="helm-chip-row">
						<span className="is-success">{runningCount} running</span>
						<span>{stoppedCount} stopped</span>
						{totalPM2Apps > 0 ? <span>{totalPM2Apps} PM2</span> : null}
					</div>
				</CardContent>
			</Card>

			{/* CPU */}
			<Card className="helm-metric-card">
				<CardContent>
					<p className="helm-metric-label">
						<CpuIcon className="size-3.5" />
						CPU
					</p>
					<div className="helm-metric-value">
						<span>{systemUsage.cpu}</span>
						<span className="helm-metric-unit">%</span>
						{deltaCpu && (
							<span className="helm-metric-delta is-up">{deltaCpu}</span>
						)}
					</div>
					<p className="helm-metric-subtitle">
						{systemUsage.cpuLogical || 0} cores · avg{" "}
						{Math.round(systemUsage.cpu)}%
					</p>
					{hasCpuSpark ? (
						<div className="mt-auto flex justify-end pt-1">
							<KpiSparkline data={sparkCpu} color="#6366f1" />
						</div>
					) : (
						<Progress value={systemUsage.cpu} className="helm-mini-progress" />
					)}
				</CardContent>
			</Card>

			{/* Memory */}
			<Card className="helm-metric-card">
				<CardContent>
					<p className="helm-metric-label">
						<MemoryStickIcon className="size-3.5" />
						Memory
					</p>
					<div className="helm-metric-value">
						<span>{systemUsage.memory}</span>
						<span className="helm-metric-unit">%</span>
						{deltaMem && (
							<span className="helm-metric-delta is-down">{deltaMem}</span>
						)}
					</div>
					<p className="helm-metric-subtitle">{memorySubtitle}</p>
					{hasMemSpark ? (
						<div className="mt-auto flex justify-end pt-1">
							<KpiSparkline data={sparkMem} color="#f59e0b" />
						</div>
					) : (
						<Progress
							value={systemUsage.memory}
							className="helm-mini-progress is-amber"
						/>
					)}
				</CardContent>
			</Card>

			{/* Merged Disk + Network + Load — full width */}
			<Card className="helm-wide-card col-span-4">
				<CardContent className="helm-system-wide">
					{/* Disk */}
					<div className="helm-system-col">
						<p className="helm-metric-label">
							<HardDriveIcon className="size-3.5" />
							Disk Usage
							{onClearCache && (
								<AlertDialog>
									<AlertDialogTrigger asChild>
										<Button
											type="button"
											variant="ghost"
											size="icon"
											disabled={isReadOnly || isClearingCache}
											className="ml-auto size-5 text-muted-foreground hover:text-foreground"
											title="Clear Docker build cache"
										>
											{isClearingCache ? (
												<Spinner className="size-3" />
											) : (
												<Trash2Icon className="size-3" />
											)}
										</Button>
									</AlertDialogTrigger>
									<AlertDialogContent>
										<AlertDialogHeader>
											<AlertDialogTitle>
												Clear Docker builder cache?
											</AlertDialogTitle>
											<AlertDialogDescription>
												This runs the equivalent of docker builder prune and
												removes unused build cache from every configured Docker
												host.
											</AlertDialogDescription>
										</AlertDialogHeader>
										<AlertDialogFooter>
											<AlertDialogCancel disabled={isClearingCache}>
												Cancel
											</AlertDialogCancel>
											<AlertDialogAction
												onClick={onClearCache}
												disabled={isClearingCache}
												className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
											>
												Clear Cache
											</AlertDialogAction>
										</AlertDialogFooter>
									</AlertDialogContent>
								</AlertDialog>
							)}
						</p>
						<div className="helm-strip-stat">
							<span className="helm-strip-value tabular-nums">
								{Math.round(systemUsage.disk)}
								<span className="helm-metric-unit">%</span>
							</span>
							<span className="text-muted-foreground font-mono text-xs truncate">
								{formatBytes(systemUsage.diskUsed)} /{" "}
								{formatBytes(systemUsage.diskTotal)} · {formatBytes(diskFree)}{" "}
								free
							</span>
						</div>
						<Progress
							value={Math.min(systemUsage.disk, 100)}
							className="h-1.5 mt-auto"
							indicatorClassName={diskColor(systemUsage.disk)}
						/>
					</div>

					{/* Network */}
					<div className="helm-system-col">
						<p className="helm-metric-label">
							<NetworkIcon className="size-3.5" />
							Network · last 60s
						</p>
						<div className="helm-strip-stat">
							<span className="helm-strip-value">
								<span style={{ color: "#22c55e" }}>
									↓{" "}
									{netRxRate > 0
										? formatRate(netRxRate)
										: formatBytes(systemUsage.network?.rxBytes ?? 0)}
								</span>
								<span
									className="text-muted-foreground mx-2 font-mono text-xs"
									style={{ color: "#60a5fa" }}
								>
									↑{" "}
									{netTxRate > 0
										? formatRate(netTxRate)
										: formatBytes(systemUsage.network?.txBytes ?? 0)}
								</span>
							</span>
						</div>
						{hasNetSpark && (
							<div className="mt-auto">
								<InlineSparkline data={sparkNet} color="#22c55e" />
							</div>
						)}
					</div>

					{/* Load */}
					<div className="helm-system-col">
						<p className="helm-metric-label">
							<ActivityIcon className="size-3.5" />
							Load Avg · 1m 5m 15m
						</p>
						<div className="helm-strip-stat">
							<span className="helm-strip-value font-mono">
								<span>{(systemUsage.load?.load1 ?? 0).toFixed(2)}</span>
								<span className="text-muted-foreground ml-2">
									{(systemUsage.load?.load5 ?? 0).toFixed(2)}
								</span>
								<span className="text-muted-foreground/60 ml-2">
									{(systemUsage.load?.load15 ?? 0).toFixed(2)}
								</span>
							</span>
						</div>
					</div>
				</CardContent>
			</Card>
		</section>
	);
}
