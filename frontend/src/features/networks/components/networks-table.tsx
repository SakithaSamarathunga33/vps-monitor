import {
	InfoIcon,
	LinkIcon,
	LockIcon,
	NetworkIcon,
	RefreshCcwIcon,
	SearchIcon,
	WifiIcon,
} from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
	TooltipTrigger,
} from "@/components/ui/tooltip";

import { useNetworksQuery } from "../hooks/use-networks-query";
import type { NetworkInfo } from "../types";
import { NetworkDetailsSheet } from "./network-details-sheet";

const driverColor: Record<string, string> = {
	bridge: "var(--primary)",
	host: "#f59e0b",
	overlay: "#06b6d4",
	macvlan: "#a855f7",
	none: "var(--muted-foreground)",
};

function DriverDot({ driver }: { driver: string }) {
	const color = driverColor[driver] ?? "var(--muted-foreground)";
	return (
		<span
			style={{
				display: "inline-block",
				width: 8,
				height: 8,
				borderRadius: 2,
				background: color,
				flexShrink: 0,
			}}
		/>
	);
}

export function NetworksTable() {
	const { data, isLoading, error, refetch, isRefetching } = useNetworksQuery();

	const [searchText, setSearchText] = useState("");
	const [selectedNetwork, setSelectedNetwork] = useState<{
		network: NetworkInfo;
		host: string;
	} | null>(null);

	const allNetworks = useMemo(() => {
		if (!data?.networks) return [];
		return data.networks;
	}, [data?.networks]);

	const filteredNetworks = useMemo(() => {
		if (!searchText) return allNetworks;
		const search = searchText.toLowerCase();
		return allNetworks.filter((net) => {
			const name = net.name.toLowerCase();
			const driver = net.driver.toLowerCase();
			return name.includes(search) || driver.includes(search);
		});
	}, [allNetworks, searchText]);

	const bridgeCount = useMemo(
		() => allNetworks.filter((n) => n.driver === "bridge").length,
		[allNetworks],
	);
	const hostCount = useMemo(
		() => allNetworks.filter((n) => n.driver === "host").length,
		[allNetworks],
	);
	const internalCount = useMemo(
		() => allNetworks.filter((n) => n.internal).length,
		[allNetworks],
	);
	const totalAttachments = useMemo(
		() => allNetworks.reduce((a, n) => a + (n.containers ?? 0), 0),
		[allNetworks],
	);

	if (isLoading) {
		return (
			<Card>
				<CardContent className="flex items-center justify-center py-8">
					<Spinner className="mr-2 size-4" />
					Loading networks...
				</CardContent>
			</Card>
		);
	}

	if (error) {
		return (
			<Card>
				<CardContent className="py-8 text-center text-destructive">
					Failed to load networks: {error.message}
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="helm-dashboard w-full space-y-5">
			{/* Page header */}
			<header className="helm-page-head">
				<div>
					<h1>Networks</h1>
					<p>
						{allNetworks.length} networks · {totalAttachments} attachments
					</p>
				</div>
				<div className="helm-page-actions">
					<Button
						variant="outline"
						size="sm"
						onClick={() => refetch()}
						disabled={isRefetching}
					>
						<RefreshCcwIcon
							className={`size-4 ${isRefetching ? "animate-spin" : ""}`}
						/>
						Refresh
					</Button>
				</div>
			</header>

			{/* KPI cards */}
			<section className="helm-metrics-grid">
				<Card className="helm-metric-card">
					<CardContent>
						<p className="helm-metric-label">
							<NetworkIcon className="size-3.5" />
							Networks
						</p>
						<div className="helm-metric-value">
							<span>{allNetworks.length}</span>
						</div>
						<div className="helm-chip-row">
							<span>{bridgeCount} bridge</span>
							<span>{hostCount} host</span>
						</div>
					</CardContent>
				</Card>

				<Card className="helm-metric-card">
					<CardContent>
						<p className="helm-metric-label">
							<WifiIcon className="size-3.5" />
							Bridge
						</p>
						<div className="helm-metric-value">
							<span>{bridgeCount}</span>
						</div>
						<div className="helm-chip-row">
							<span>user-defined networks</span>
						</div>
					</CardContent>
				</Card>

				<Card className="helm-metric-card">
					<CardContent>
						<p className="helm-metric-label">
							<LockIcon className="size-3.5" />
							Internal
						</p>
						<div className="helm-metric-value">
							<span>{internalCount}</span>
						</div>
						<div className="helm-chip-row">
							<span>isolated networks</span>
						</div>
					</CardContent>
				</Card>

				<Card className="helm-metric-card">
					<CardContent>
						<p className="helm-metric-label">
							<LinkIcon className="size-3.5" />
							Attachments
						</p>
						<div className="helm-metric-value">
							<span>{totalAttachments}</span>
						</div>
						<div className="helm-chip-row">
							<span>total containers</span>
						</div>
					</CardContent>
				</Card>
			</section>

			{/* Search + table */}
			<Card>
				<div className="flex items-center gap-3 border-b border-border px-4 py-3">
					<SearchIcon className="size-3.5 shrink-0 text-muted-foreground" />
					<Input
						placeholder="Search networks…"
						value={searchText}
						onChange={(e) => setSearchText(e.target.value)}
						className="h-7 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 text-sm"
					/>
					<span className="shrink-0 font-mono text-[11px] text-muted-foreground">
						{filteredNetworks.length} / {allNetworks.length}
					</span>
				</div>
				<CardContent className="p-0">
					{filteredNetworks.length === 0 ? (
						<div className="py-10 text-center text-sm text-muted-foreground">
							{searchText
								? "No networks match your search"
								: "No networks found"}
						</div>
					) : (
						<Table>
							<TableHeader>
								<TableRow className="hover:bg-transparent">
									<TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
										Name
									</TableHead>
									<TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
										Driver
									</TableHead>
									<TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
										Scope
									</TableHead>
									<TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
										Containers
									</TableHead>
									<TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
										Flags
									</TableHead>
									<TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
										Actions
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{filteredNetworks.map((network) => (
									<TableRow key={`${network.host}-${network.id}`}>
										<TableCell>
											<div className="flex items-center gap-2">
												<DriverDot driver={network.driver} />
												<div className="min-w-0">
													<div className="font-medium text-sm">
														{network.name}
													</div>
													<div className="font-mono text-[10px] text-muted-foreground">
														{network.host}
													</div>
												</div>
											</div>
										</TableCell>
										<TableCell>
											<Badge
												variant="secondary"
												style={{
													color: driverColor[network.driver] ?? undefined,
													borderColor: `color-mix(in oklch, ${driverColor[network.driver] ?? "var(--border)"} 30%, transparent)`,
												}}
												className="font-mono text-xs"
											>
												{network.driver}
											</Badge>
										</TableCell>
										<TableCell className="font-mono text-xs text-muted-foreground">
											{network.scope}
										</TableCell>
										<TableCell className="text-right font-mono text-xs tabular-nums">
											{network.containers ?? 0}
										</TableCell>
										<TableCell>
											<div className="flex gap-1.5">
												{network.internal && (
													<Tooltip>
														<TooltipTrigger asChild>
															<span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground cursor-default">
																internal
															</span>
														</TooltipTrigger>
														<TooltipContent>
															No external connectivity
														</TooltipContent>
													</Tooltip>
												)}
												{network.enable_ipv6 && (
													<span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
														ipv6
													</span>
												)}
											</div>
										</TableCell>
										<TableCell>
											<div className="flex items-center justify-end">
												<Tooltip>
													<TooltipTrigger asChild>
														<Button
															variant="ghost"
															size="icon-sm"
															onClick={() =>
																setSelectedNetwork({
																	network,
																	host: network.host,
																})
															}
														>
															<InfoIcon className="size-4" />
														</Button>
													</TooltipTrigger>
													<TooltipContent>Inspect</TooltipContent>
												</Tooltip>
											</div>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>

			<NetworkDetailsSheet
				network={selectedNetwork?.network ?? null}
				host={selectedNetwork?.host ?? ""}
				isOpen={!!selectedNetwork}
				onOpenChange={(open) => !open && setSelectedNetwork(null)}
			/>
		</div>
	);
}
