import { format } from "date-fns";
import {
	ChevronLeftIcon,
	ChevronRightIcon,
	DownloadIcon,
	HistoryIcon,
	SearchIcon,
	ShieldAlertIcon,
	ShieldCheckIcon,
	ShieldIcon,
	Trash2Icon,
	XIcon,
} from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { exportScanHistory } from "../api/get-scan-history";
import {
	useDeleteScanHistory,
	useScanHistory,
	useScanHistoryDetail,
	useScannedImages,
} from "../hooks/use-scan-query";
import type { HistoryQueryParams } from "../types";
import { ScanResultsSummary } from "./scan-results-summary";
import { ScanResultsTable } from "./scan-results-table";

export const SEVERITY_OPTIONS = [
	"Critical",
	"High",
	"Medium",
	"Low",
	"Negligible",
	"Unknown",
] as const;
export type SeverityOption = (typeof SEVERITY_OPTIONS)[number] | "all" | "";

function toggleSort(
	setParams: Dispatch<SetStateAction<HistoryQueryParams>>,
	sortBy: NonNullable<HistoryQueryParams["sort_by"]>,
) {
	setParams((prev) => ({
		...prev,
		sort_by: sortBy,
		sort_dir: prev.sort_dir === "desc" ? "asc" : "desc",
	}));
}

function getAriaSort(
	params: HistoryQueryParams,
	sortBy: NonNullable<HistoryQueryParams["sort_by"]>,
): "none" | "ascending" | "descending" {
	if (params.sort_by !== sortBy) return "none";
	return params.sort_dir === "asc" ? "ascending" : "descending";
}

export function ScanHistoryPage() {
	const [params, setParams] = useState<HistoryQueryParams>({
		page: 1,
		page_size: 20,
		sort_by: "completed_at",
		sort_dir: "desc",
	});
	const [imageFilter, setImageFilter] = useState("");
	const [hostFilter, setHostFilter] = useState<string>("");
	const [severityFilter, setSeverityFilter] = useState<SeverityOption>("");
	const [selectedScanId, setSelectedScanId] = useState<string | null>(null);

	const { data: historyData, isLoading } = useScanHistory({
		...params,
		image: imageFilter || undefined,
		host: hostFilter || undefined,
		min_severity:
			severityFilter === "all" || severityFilter === ""
				? undefined
				: severityFilter,
	});
	const { data: scannedImages } = useScannedImages();
	const { data: detailResult, isLoading: isDetailLoading } =
		useScanHistoryDetail(selectedScanId);
	const deleteMutation = useDeleteScanHistory();

	const uniqueHosts = Array.from(
		new Set(scannedImages?.map((img) => img.host) ?? []),
	);

	const totalCritical = useMemo(
		() =>
			(historyData?.results ?? []).reduce((a, r) => a + r.summary.critical, 0),
		[historyData],
	);
	const totalHigh = useMemo(
		() => (historyData?.results ?? []).reduce((a, r) => a + r.summary.high, 0),
		[historyData],
	);

	const clearFilters = () => {
		setImageFilter("");
		setHostFilter("");
		setSeverityFilter("");
		setParams((prev) => ({ ...prev, page: 1 }));
	};

	const hasFilters = imageFilter || hostFilter || severityFilter;

	return (
		<div className="helm-dashboard w-full space-y-5">
			{/* Page header */}
			<header className="helm-page-head">
				<div>
					<h1>Scan History</h1>
					<p>
						{historyData?.total ?? 0} total scans · {scannedImages?.length ?? 0}{" "}
						images scanned
					</p>
				</div>
			</header>

			{/* KPI cards */}
			<section className="helm-metrics-grid">
				<Card className="helm-metric-card">
					<CardContent>
						<p className="helm-metric-label">
							<HistoryIcon className="size-3.5" />
							Total Scans
						</p>
						<div className="helm-metric-value">
							<span>{historyData?.total ?? 0}</span>
						</div>
						<div className="helm-chip-row">
							<span>{historyData?.total_pages ?? 0} pages</span>
						</div>
					</CardContent>
				</Card>

				<Card className="helm-metric-card">
					<CardContent>
						<p className="helm-metric-label">
							<ShieldCheckIcon className="size-3.5" />
							Images Scanned
						</p>
						<div className="helm-metric-value">
							<span>{scannedImages?.length ?? 0}</span>
						</div>
						<div className="helm-chip-row">
							<span>{uniqueHosts.length} hosts</span>
						</div>
					</CardContent>
				</Card>

				<Card className="helm-metric-card">
					<CardContent>
						<p className="helm-metric-label">
							<ShieldAlertIcon className="size-3.5" />
							Critical
						</p>
						<div className="helm-metric-value">
							<span
								style={{ color: totalCritical > 0 ? "#ef4444" : undefined }}
							>
								{totalCritical}
							</span>
						</div>
						<div className="helm-chip-row">
							<span>this page</span>
						</div>
					</CardContent>
				</Card>

				<Card className="helm-metric-card">
					<CardContent>
						<p className="helm-metric-label">
							<ShieldIcon className="size-3.5" />
							High
						</p>
						<div className="helm-metric-value">
							<span style={{ color: totalHigh > 0 ? "#f59e0b" : undefined }}>
								{totalHigh}
							</span>
						</div>
						<div className="helm-chip-row">
							<span>this page</span>
						</div>
					</CardContent>
				</Card>
			</section>

			{/* Filters + Table */}
			<Card>
				<div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
					<div className="relative min-w-[180px] flex-1 max-w-[260px]">
						<SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
						<Input
							placeholder="Filter by image..."
							value={imageFilter}
							onChange={(e) => {
								setImageFilter(e.target.value);
								setParams((prev) => ({ ...prev, page: 1 }));
							}}
							className="pl-8 h-8 text-sm"
						/>
					</div>

					<Select
						value={hostFilter || "all"}
						onValueChange={(v) => {
							setHostFilter(v === "all" ? "" : v);
							setParams((prev) => ({ ...prev, page: 1 }));
						}}
					>
						<SelectTrigger className="h-8 w-[150px] text-sm">
							<SelectValue placeholder="All hosts" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All hosts</SelectItem>
							{uniqueHosts.map((host) => (
								<SelectItem key={host} value={host}>
									{host}
								</SelectItem>
							))}
						</SelectContent>
					</Select>

					<Select
						value={severityFilter || "all"}
						onValueChange={(v: SeverityOption) => {
							setSeverityFilter(v === "all" ? "" : v);
							setParams((prev) => ({ ...prev, page: 1 }));
						}}
					>
						<SelectTrigger className="h-8 w-[150px] text-sm">
							<SelectValue placeholder="Any severity" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">Any severity</SelectItem>
							<SelectItem value="Critical">Critical</SelectItem>
							<SelectItem value="High">High+</SelectItem>
							<SelectItem value="Medium">Medium+</SelectItem>
							<SelectItem value="Low">Low+</SelectItem>
						</SelectContent>
					</Select>

					{hasFilters && (
						<Button
							variant="ghost"
							size="sm"
							onClick={clearFilters}
							className="h-8"
						>
							<XIcon className="mr-1 size-3.5" />
							Clear
						</Button>
					)}
				</div>

				<CardContent className="p-0">
					<Table>
						<TableHeader>
							<TableRow className="hover:bg-transparent">
								<TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
									Image
								</TableHead>
								<TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
									Host
								</TableHead>
								<TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
									Scanner
								</TableHead>
								<TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
									Vulnerabilities
								</TableHead>
								<TableHead
									className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
									aria-sort={getAriaSort(params, "completed_at")}
								>
									<button
										type="button"
										className="inline-flex items-center gap-1"
										onClick={() => toggleSort(setParams, "completed_at")}
									>
										Date
										{params.sort_by === "completed_at" &&
											(params.sort_dir === "desc" ? " ↓" : " ↑")}
									</button>
								</TableHead>
								<TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
									Duration
								</TableHead>
								<TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
									Actions
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{isLoading ? (
								<TableRow>
									<TableCell
										colSpan={7}
										className="py-10 text-center text-sm text-muted-foreground"
									>
										Loading scan history...
									</TableCell>
								</TableRow>
							) : !historyData?.results.length ? (
								<TableRow>
									<TableCell
										colSpan={7}
										className="py-10 text-center text-sm text-muted-foreground"
									>
										No scan history found
									</TableCell>
								</TableRow>
							) : (
								historyData.results.map((result) => (
									<TableRow key={result.id}>
										<TableCell className="max-w-[240px] font-mono text-xs">
											<button
												type="button"
												className="max-w-full truncate text-left underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
												onClick={() => setSelectedScanId(result.id)}
											>
												{result.image_ref}
											</button>
										</TableCell>
										<TableCell>
											<Badge variant="outline" className="font-mono text-xs">
												{result.host}
											</Badge>
										</TableCell>
										<TableCell className="font-mono text-xs capitalize text-muted-foreground">
											{result.scanner}
										</TableCell>
										<TableCell>
											<ScanResultsSummary summary={result.summary} />
										</TableCell>
										<TableCell className="font-mono text-xs text-muted-foreground">
											{format(
												new Date(result.completed_at * 1000),
												"MMM d, yyyy HH:mm",
											)}
										</TableCell>
										<TableCell className="font-mono text-xs text-muted-foreground">
											{(result.duration_ms / 1000).toFixed(1)}s
										</TableCell>
										<TableCell className="text-right">
											<div className="flex items-center justify-end gap-1">
												<Button
													variant="ghost"
													size="icon-sm"
													title="Export CSV"
													onClick={() => {
														exportScanHistory(result.id).catch((err) => {
															console.error("Failed to export:", err);
														});
													}}
												>
													<DownloadIcon className="size-4" />
												</Button>
												<Button
													variant="ghost"
													size="icon-sm"
													title="Delete"
													disabled={deleteMutation.isPending}
													onClick={() => {
														if (
															confirm(
																"Are you sure you want to delete this scan result?",
															)
														) {
															deleteMutation.mutate(result.id);
														}
													}}
												>
													<Trash2Icon className="size-4 text-destructive" />
												</Button>
											</div>
										</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>
				</CardContent>

				{/* Pagination */}
				{historyData && historyData.total_pages > 1 && (
					<div className="flex items-center justify-between border-t border-border px-4 py-3">
						<p className="font-mono text-xs text-muted-foreground">
							Page {historyData.page} of {historyData.total_pages}
						</p>
						<div className="flex items-center gap-2">
							<Button
								variant="outline"
								size="sm"
								disabled={historyData.page <= 1}
								onClick={() =>
									setParams((prev) => ({ ...prev, page: (prev.page ?? 1) - 1 }))
								}
							>
								<ChevronLeftIcon className="size-4" />
								Previous
							</Button>
							<Button
								variant="outline"
								size="sm"
								disabled={historyData.page >= historyData.total_pages}
								onClick={() =>
									setParams((prev) => ({ ...prev, page: (prev.page ?? 1) + 1 }))
								}
							>
								Next
								<ChevronRightIcon className="size-4" />
							</Button>
						</div>
					</div>
				)}
			</Card>

			{/* Detail Dialog */}
			<Dialog
				open={!!selectedScanId}
				onOpenChange={(open) => !open && setSelectedScanId(null)}
			>
				<DialogContent className="max-h-[80vh] max-w-4xl overflow-y-auto">
					<DialogHeader>
						<DialogTitle>
							{detailResult ? (
								<span className="flex items-center gap-2">
									Scan:{" "}
									<code className="text-sm">{detailResult.image_ref}</code>
									<Badge variant="outline">{detailResult.host}</Badge>
								</span>
							) : (
								"Scan Details"
							)}
						</DialogTitle>
					</DialogHeader>

					{isDetailLoading ? (
						<div className="py-8 text-center text-muted-foreground">
							Loading scan details...
						</div>
					) : detailResult ? (
						<div className="space-y-4">
							<div className="grid grid-cols-2 gap-4 text-sm">
								<div>
									<span className="text-muted-foreground">Scanner:</span>{" "}
									<span className="capitalize">{detailResult.scanner}</span>
								</div>
								<div>
									<span className="text-muted-foreground">Duration:</span>{" "}
									{(detailResult.duration_ms / 1000).toFixed(1)}s
								</div>
								<div>
									<span className="text-muted-foreground">Completed:</span>{" "}
									{format(
										new Date(detailResult.completed_at * 1000),
										"MMM d, yyyy HH:mm:ss",
									)}
								</div>
								<div>
									<span className="text-muted-foreground">
										Total vulnerabilities:
									</span>{" "}
									{detailResult.summary.total}
								</div>
							</div>

							<ScanResultsSummary summary={detailResult.summary} />

							{detailResult.vulnerabilities &&
								detailResult.vulnerabilities.length > 0 && (
									<ScanResultsTable
										vulnerabilities={detailResult.vulnerabilities}
									/>
								)}
						</div>
					) : null}
				</DialogContent>
			</Dialog>
		</div>
	);
}
