import {
	AlertTriangleIcon,
	BellIcon,
	CheckIcon,
	CpuIcon,
	MemoryStickIcon,
	RefreshCcwIcon,
	ShieldAlertIcon,
	SquareIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import {
	useAcknowledgeAlertMutation,
	useAlertConfigQuery,
	useAlertsQuery,
} from "../hooks/use-alerts-query";
import type { Alert, AlertType } from "../types";

function getAlertIcon(type: AlertType) {
	switch (type) {
		case "container_stopped":
			return SquareIcon;
		case "cpu_threshold":
			return CpuIcon;
		case "memory_threshold":
			return MemoryStickIcon;
		default:
			return AlertTriangleIcon;
	}
}

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

function formatAlertType(type: AlertType): string {
	switch (type) {
		case "container_stopped":
			return "Container Stopped";
		case "cpu_threshold":
			return "CPU Threshold";
		case "memory_threshold":
			return "Memory Threshold";
		default:
			return type;
	}
}

function formatTimestamp(timestamp: number): string {
	const date = new Date(timestamp * 1000);
	const now = new Date();
	const diff = now.getTime() - date.getTime();

	if (diff < 60000) return "Just now";
	if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
	if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

export function AlertsList() {
	const { data, isLoading, error, refetch, isRefetching } = useAlertsQuery();
	const { data: config } = useAlertConfigQuery();
	const acknowledgeMutation = useAcknowledgeAlertMutation();

	const [showAcknowledged, setShowAcknowledged] = useState(false);

	const allAlerts = useMemo(() => data?.alerts ?? [], [data?.alerts]);

	const filteredAlerts = useMemo(() => {
		if (showAcknowledged) return allAlerts;
		return allAlerts.filter((alert) => !alert.acknowledged);
	}, [allAlerts, showAcknowledged]);

	const unacknowledgedCount = useMemo(
		() => allAlerts.filter((a) => !a.acknowledged).length,
		[allAlerts],
	);
	const cpuCount = useMemo(
		() => allAlerts.filter((a) => a.type === "cpu_threshold").length,
		[allAlerts],
	);
	const memCount = useMemo(
		() => allAlerts.filter((a) => a.type === "memory_threshold").length,
		[allAlerts],
	);
	const stoppedCount = useMemo(
		() => allAlerts.filter((a) => a.type === "container_stopped").length,
		[allAlerts],
	);

	const handleAcknowledge = async (alert: Alert) => {
		try {
			await acknowledgeMutation.mutateAsync(alert.id);
			toast.success("Alert acknowledged");
		} catch (err) {
			toast.error(
				`Failed to acknowledge alert: ${err instanceof Error ? err.message : "Unknown error"}`,
			);
		}
	};

	if (isLoading) {
		return (
			<Card>
				<CardContent className="flex items-center justify-center py-8">
					<Spinner className="mr-2 size-4" />
					Loading alerts...
				</CardContent>
			</Card>
		);
	}

	if (error) {
		return (
			<Card>
				<CardContent className="py-8 text-center text-destructive">
					Failed to load alerts: {error.message}
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="helm-dashboard w-full space-y-5">
			{/* Page header */}
			<header className="helm-page-head">
				<div>
					<h1>Alerts</h1>
					<p>
						{allAlerts.length} total · {unacknowledgedCount} unacknowledged
						{config &&
							` · CPU ≥ ${config.cpu_threshold}% · Mem ≥ ${config.memory_threshold}%`}
					</p>
				</div>
				<div className="helm-page-actions">
					<Button
						variant={showAcknowledged ? "secondary" : "outline"}
						size="sm"
						onClick={() => setShowAcknowledged(!showAcknowledged)}
					>
						{showAcknowledged ? "Hide" : "Show"} acknowledged
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={() => refetch()}
						disabled={isRefetching}
					>
						<RefreshCcwIcon
							className={`size-4 ${isRefetching ? "animate-spin" : ""}`}
						/>
					</Button>
				</div>
			</header>

			{/* KPI cards */}
			<section className="helm-metrics-grid">
				<Card className="helm-metric-card">
					<CardContent>
						<p className="helm-metric-label">
							<BellIcon className="size-3.5" />
							Total Alerts
						</p>
						<div className="helm-metric-value">
							<span>{allAlerts.length}</span>
						</div>
						<div className="helm-chip-row">
							<span>{unacknowledgedCount} new</span>
							<span>{allAlerts.length - unacknowledgedCount} ack'd</span>
						</div>
					</CardContent>
				</Card>

				<Card className="helm-metric-card">
					<CardContent>
						<p className="helm-metric-label">
							<ShieldAlertIcon className="size-3.5" />
							Unacknowledged
						</p>
						<div className="helm-metric-value">
							<span
								style={{
									color: unacknowledgedCount > 0 ? "#ef4444" : undefined,
								}}
							>
								{unacknowledgedCount}
							</span>
						</div>
						<div className="helm-chip-row">
							<span>
								{unacknowledgedCount > 0 ? "needs attention" : "all clear"}
							</span>
						</div>
					</CardContent>
				</Card>

				<Card className="helm-metric-card">
					<CardContent>
						<p className="helm-metric-label">
							<CpuIcon className="size-3.5" />
							CPU / Memory
						</p>
						<div className="helm-metric-value">
							<span>{cpuCount + memCount}</span>
						</div>
						<div className="helm-chip-row">
							<span>{cpuCount} cpu</span>
							<span>{memCount} mem</span>
						</div>
					</CardContent>
				</Card>

				<Card className="helm-metric-card">
					<CardContent>
						<p className="helm-metric-label">
							<SquareIcon className="size-3.5" />
							Container Stopped
						</p>
						<div className="helm-metric-value">
							<span style={{ color: stoppedCount > 0 ? "#f59e0b" : undefined }}>
								{stoppedCount}
							</span>
						</div>
						<div className="helm-chip-row">
							<span>stopped events</span>
						</div>
					</CardContent>
				</Card>
			</section>

			{/* Alert config strip */}
			{config && (
				<Card>
					<CardContent className="flex flex-wrap items-center gap-6 py-3 px-5">
						<span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
							Config
						</span>
						<Badge
							variant={config.enabled ? "default" : "secondary"}
							className="text-xs"
						>
							{config.enabled ? "Enabled" : "Disabled"}
						</Badge>
						<span className="text-xs text-muted-foreground">
							CPU threshold:{" "}
							<span className="font-semibold text-foreground">
								{config.cpu_threshold}%
							</span>
						</span>
						<span className="text-xs text-muted-foreground">
							Memory threshold:{" "}
							<span className="font-semibold text-foreground">
								{config.memory_threshold}%
							</span>
						</span>
						<span className="text-xs text-muted-foreground">
							Check interval:{" "}
							<span className="font-semibold text-foreground">
								{config.check_interval}
							</span>
						</span>
						{config.webhook_configured && (
							<span className="text-xs text-muted-foreground">
								Webhook:{" "}
								<span className="font-semibold text-green-500">configured</span>
							</span>
						)}
					</CardContent>
				</Card>
			)}

			{/* Alert list */}
			<Card>
				<CardContent className="p-0">
					{filteredAlerts.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
							<BellIcon className="mb-4 size-10 opacity-40" />
							<p className="font-medium">No alerts</p>
							<p className="text-sm">
								{showAcknowledged
									? "No alerts have been triggered"
									: "All alerts have been acknowledged"}
							</p>
						</div>
					) : (
						<div className="divide-y divide-border">
							{filteredAlerts.map((alert) => {
								const Icon = getAlertIcon(alert.type);
								const color = getAlertColor(alert.type, alert.acknowledged);

								return (
									<div
										key={alert.id}
										className={cn(
											"flex items-start gap-4 px-5 py-4 transition-opacity",
											alert.acknowledged && "opacity-50",
										)}
									>
										<div className={cn("mt-0.5 shrink-0", color)}>
											<Icon className="size-4" />
										</div>
										<div className="min-w-0 flex-1">
											<div className="mb-1 flex flex-wrap items-center gap-2">
												<Badge
													variant={alert.acknowledged ? "outline" : "secondary"}
													className="text-xs"
												>
													{formatAlertType(alert.type)}
												</Badge>
												<span className="font-mono text-[11px] text-muted-foreground">
													{formatTimestamp(alert.timestamp)}
												</span>
												{alert.acknowledged && (
													<Badge
														variant="outline"
														className="text-xs text-muted-foreground"
													>
														Acknowledged
													</Badge>
												)}
											</div>
											<p className="text-sm font-medium">{alert.message}</p>
											<div className="mt-1 flex flex-wrap items-center gap-3 font-mono text-[11px] text-muted-foreground">
												<span>container: {alert.container_name}</span>
												<span>host: {alert.host}</span>
												{alert.value !== undefined &&
													alert.threshold !== undefined && (
														<span>
															value: {alert.value.toFixed(1)}% (threshold:{" "}
															{alert.threshold}%)
														</span>
													)}
											</div>
										</div>
										{!alert.acknowledged && (
											<Tooltip>
												<TooltipTrigger asChild>
													<Button
														variant="ghost"
														size="icon-sm"
														onClick={() => handleAcknowledge(alert)}
														disabled={acknowledgeMutation.isPending}
													>
														{acknowledgeMutation.isPending ? (
															<Spinner className="size-4" />
														) : (
															<CheckIcon className="size-4" />
														)}
													</Button>
												</TooltipTrigger>
												<TooltipContent>Acknowledge</TooltipContent>
											</Tooltip>
										)}
									</div>
								);
							})}
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
