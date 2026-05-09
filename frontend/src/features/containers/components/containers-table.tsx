import {
	ActivityIcon,
	ChevronDownIcon,
	ChevronRightIcon,
	FileTextIcon,
	PlayIcon,
	RotateCwIcon,
	SquareIcon,
	TerminalIcon,
	Trash2Icon,
} from "lucide-react";
import { Fragment } from "react";

import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
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
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ContainerInfo } from "../types";
import type {
	ContainerActionType,
	GroupByOption,
	GroupedContainers,
	StatsInterval,
} from "./container-utils";
import {
	formatContainerName,
	formatCreatedDate,
	formatUptime,
	getHistoricalValue,
} from "./container-utils";

interface ContainersTableProps {
	isLoading: boolean;
	isError: boolean;
	error: unknown;
	groupBy: GroupByOption;
	filteredContainers: ContainerInfo[];
	groupedItems: GroupedContainers[] | null;
	pageItems: ContainerInfo[];
	pendingAction: { id: string; type: ContainerActionType } | null;
	isReadOnly: boolean;
	expandedGroups: string[];
	selectedIds: string[];
	statsInterval: StatsInterval;
	onToggleSelect: (id: string) => void;
	onSelectAll: () => void;
	onToggleGroup: (project: string) => void;
	onStart: (container: ContainerInfo) => void;
	onStop: (container: ContainerInfo) => void;
	onRestart: (container: ContainerInfo) => void;
	onDelete: (container: ContainerInfo) => void;
	onViewLogs: (container: ContainerInfo) => void;
	onViewStats: (container: ContainerInfo) => void;
	onRetry: () => void;
}

export function ContainersTable({
	isLoading,
	isError,
	error,
	groupBy,
	filteredContainers,
	groupedItems,
	pageItems,
	pendingAction,
	isReadOnly,
	expandedGroups,
	selectedIds,
	statsInterval,
	onToggleSelect,
	onSelectAll,
	onToggleGroup,
	onStart,
	onStop,
	onRestart,
	onDelete,
	onViewLogs,
	onViewStats,
	onRetry,
}: ContainersTableProps) {
	const isContainerActionPending = (
		action: ContainerActionType,
		containerId: string,
	) => pendingAction?.id === containerId && pendingAction.type === action;

	const isContainerBusy = (containerId: string) =>
		pendingAction?.id === containerId;

	const formatHistoricalMetric = (value: number | null) =>
		value === null ? "Collecting" : `${value.toFixed(1)}%`;

	const formatBytes = (bytes: number) => {
		if (!Number.isFinite(bytes) || bytes <= 0) {
			return "0 B";
		}
		const units = ["B", "KB", "MB", "GB"];
		let value = bytes;
		let unitIndex = 0;
		while (value >= 1024 && unitIndex < units.length - 1) {
			value /= 1024;
			unitIndex++;
		}
		return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
	};

	const renderContainerRow = (container: ContainerInfo) => {
		const state = container.state.toLowerCase();
		const isPM2 = container.runtime === "pm2";
		const busy = isContainerBusy(container.id);
		const startPending = isContainerActionPending("start", container.id);
		const stopPending = isContainerActionPending("stop", container.id);
		const restartPending = isContainerActionPending("restart", container.id);
		const removePending = isContainerActionPending("remove", container.id);
		const cpuAverage = getHistoricalValue(container, statsInterval, "cpu");
		const memoryAverage = getHistoricalValue(
			container,
			statsInterval,
			"memory",
		);
		const runtimeLabel = isPM2 ? "PM2" : "Docker";
		const runtimeDetails =
			isPM2 && container.pm2
				? [
						container.pm2.namespace
							? `namespace: ${container.pm2.namespace}`
							: null,
						container.pm2.pid ? `PID ${container.pm2.pid}` : null,
						`restarts: ${container.pm2.restart_count}`,
					]
						.filter(Boolean)
						.join(" - ")
				: container.image;

		return (
			<TableRow key={container.id} className="hover:bg-muted/50">
				<TableCell className="w-10 px-4">
					<input
						type="checkbox"
						checked={selectedIds.includes(container.id)}
						onChange={() => onToggleSelect(container.id)}
						aria-label={`Select ${formatContainerName(container.names)}`}
					/>
				</TableCell>
				<TableCell className="h-16 px-4 font-medium">
					<div className="flex min-w-0 flex-col gap-1">
						<span className="truncate">{formatContainerName(container.names)}</span>
						<span className="inline-flex w-fit items-center rounded-md border px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
							{runtimeLabel}
						</span>
					</div>
				</TableCell>
				<TableCell className="h-16 px-4 text-sm text-muted-foreground">
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<button
									type="button"
									className="block max-w-[260px] cursor-pointer truncate"
									onClick={() => {
										navigator.clipboard?.writeText(
											isPM2
												? container.pm2?.script_path || container.command
												: container.image,
										);
									}}
									title="Click to copy source"
									aria-label={`Copy ${runtimeDetails}`}
								>
									{runtimeDetails}
								</button>
							</TooltipTrigger>
							<TooltipContent className="max-w-md break-all">
								{isPM2
									? container.pm2?.script_path || container.command || runtimeDetails
									: container.image}
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				</TableCell>
				<TableCell className="h-16 px-4">
					<StatusBadge status={container.state} />
				</TableCell>
				<TableCell className="h-16 px-4 text-sm text-muted-foreground">
					{formatUptime(container.created)}
				</TableCell>
				<TableCell className="h-16 px-4 text-sm text-muted-foreground">
					{formatCreatedDate(container.created)}
				</TableCell>
				<TableCell className="h-16 px-4 text-sm text-muted-foreground">
					{formatHistoricalMetric(cpuAverage)}
				</TableCell>
				<TableCell className="h-16 px-4 text-sm text-muted-foreground">
					{isPM2 && container.pm2
						? formatBytes(container.pm2.memory_bytes)
						: formatHistoricalMetric(memoryAverage)}
				</TableCell>
				<TableCell className="h-16 px-4">
					<TooltipProvider>
						<div className="flex items-center gap-1">
							{state === "exited" && !isPM2 && (
								<Tooltip>
									<TooltipTrigger asChild>
										<span className="inline-block">
											<Button
												variant="outline"
												size="icon"
												className="h-8 w-8"
												onClick={() => onStart(container)}
												disabled={busy || isReadOnly}
												aria-label={`Start container ${formatContainerName(container.names)}`}
											>
												{startPending ? (
													<Spinner className="size-4" />
												) : (
													<PlayIcon className="size-4" />
												)}
											</Button>
										</span>
									</TooltipTrigger>
									<TooltipContent>
										{isReadOnly ? "Start (Read-only mode)" : "Start"}
									</TooltipContent>
								</Tooltip>
							)}
							{state === "running" && !isPM2 && (
								<Tooltip>
									<TooltipTrigger asChild>
										<span className="inline-block">
											<Button
												variant="outline"
												size="icon"
												className="h-8 w-8"
												onClick={() => onStop(container)}
												disabled={busy || isReadOnly}
												aria-label={`Stop container ${formatContainerName(container.names)}`}
											>
												{stopPending ? (
													<Spinner className="size-4" />
												) : (
													<SquareIcon className="size-4" />
												)}
											</Button>
										</span>
									</TooltipTrigger>
									<TooltipContent>
										{isReadOnly ? "Stop (Read-only mode)" : "Stop"}
									</TooltipContent>
								</Tooltip>
							)}
							<Tooltip>
								<TooltipTrigger asChild>
									<span className="inline-block">
										<Button
											variant="outline"
											size="icon"
											className="h-8 w-8"
											onClick={() => onRestart(container)}
											disabled={busy || isReadOnly || isPM2}
											aria-label={`Restart container ${formatContainerName(container.names)}`}
										>
											{restartPending ? (
												<Spinner className="size-4" />
											) : (
												<RotateCwIcon className="size-4" />
											)}
										</Button>
									</span>
								</TooltipTrigger>
								<TooltipContent>
									{isPM2
										? "PM2 actions are not wired yet"
										: isReadOnly
											? "Restart (Read-only mode)"
											: "Restart"}
								</TooltipContent>
							</Tooltip>
							<Tooltip>
								<TooltipTrigger asChild>
									<span className="inline-block">
										<Button
											variant="outline"
											size="icon"
											className="h-8 w-8 text-destructive hover:bg-destructive hover:text-white"
											onClick={() => onDelete(container)}
											disabled={busy || isReadOnly || isPM2}
											aria-label={`Delete container ${formatContainerName(container.names)}`}
										>
											{removePending ? (
												<Spinner className="size-4" />
											) : (
												<Trash2Icon className="size-4" />
											)}
										</Button>
									</span>
								</TooltipTrigger>
								<TooltipContent>
									{isPM2
										? "PM2 actions are not wired yet"
										: isReadOnly
											? "Delete (Read-only mode)"
											: "Delete"}
								</TooltipContent>
							</Tooltip>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										variant="outline"
										size="icon"
										className="h-8 w-8"
										onClick={() => onViewLogs(container)}
										disabled={busy || isPM2}
										aria-label={`View logs for container ${formatContainerName(container.names)}`}
									>
										<FileTextIcon className="size-4" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>
									{isPM2 ? "PM2 logs are not wired yet" : "View Logs"}
								</TooltipContent>
							</Tooltip>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										variant="outline"
										size="icon"
										className="h-8 w-8"
										onClick={() => {
											navigator.clipboard?.writeText(container.command);
										}}
										disabled={busy || !container.command}
										aria-label={`Copy command for container ${formatContainerName(container.names)}`}
									>
										<TerminalIcon className="size-4" />
									</Button>
								</TooltipTrigger>
								<TooltipContent className="max-w-md break-all">
									{container.command || "No command"}
								</TooltipContent>
							</Tooltip>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										variant="outline"
										size="icon"
										className="h-8 w-8"
										onClick={() => onViewStats(container)}
										disabled={busy || isPM2}
										aria-label={`View stats for container ${formatContainerName(container.names)}`}
									>
										<ActivityIcon className="size-4" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>
									{isPM2 ? "PM2 stats are shown in the row" : "View Stats"}
								</TooltipContent>
							</Tooltip>
						</div>
					</TooltipProvider>
				</TableCell>
			</TableRow>
		);
	};

	return (
		<div className="overflow-x-auto rounded-lg border bg-card">
			<Table className="min-w-[980px]">
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
						<TableHead className="h-12 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[200px]">Actions</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{isLoading ? (
						<TableRow>
							<TableCell colSpan={9} className="h-32">
								<div className="flex items-center justify-center text-sm text-muted-foreground">
									<Spinner className="mr-2" />
									Loading containers…
								</div>
							</TableCell>
						</TableRow>
					) : isError ? (
						<TableRow>
							<TableCell colSpan={9} className="h-32">
								<div className="flex flex-col items-center gap-3 text-center">
									<p className="text-sm text-muted-foreground">
										{(error as Error)?.message || "Unable to load containers."}
									</p>
									<Button size="sm" variant="outline" onClick={onRetry}>
										Try again
									</Button>
								</div>
							</TableCell>
						</TableRow>
					) : filteredContainers.length === 0 ? (
						<TableRow>
							<TableCell colSpan={9} className="h-32">
								<div className="text-center text-sm text-muted-foreground">
									No containers found.
								</div>
							</TableCell>
						</TableRow>
					) : groupBy === "compose" && groupedItems ? (
						groupedItems.map((group) => (
							<Fragment key={group.project}>
								<TableRow className="bg-muted/30 hover:bg-muted/30">
									<TableCell
										colSpan={9}
										className="h-10 px-4 text-xs font-medium text-muted-foreground"
									>
										<button
											type="button"
											className="inline-flex max-w-full items-center gap-2 truncate"
											onClick={() => onToggleGroup(group.project)}
										>
											{expandedGroups.includes(group.project) ? (
												<ChevronDownIcon className="size-4" />
											) : (
												<ChevronRightIcon className="size-4" />
											)}
											<span className="truncate">
												{group.project} · {group.items.length}{" "}
												{group.items.length === 1 ? "container" : "containers"}
											</span>
										</button>
									</TableCell>
								</TableRow>
								{expandedGroups.includes(group.project)
									? group.items.map(renderContainerRow)
									: null}
							</Fragment>
						))
					) : (
						pageItems.map(renderContainerRow)
					)}
				</TableBody>
			</Table>
		</div>
	);
}
