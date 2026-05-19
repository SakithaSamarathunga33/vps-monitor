import { format } from "date-fns";
import {
	ChevronLeftIcon,
	ChevronRightIcon,
	DownloadIcon,
	FileTextIcon,
	LayersIcon,
	PackageIcon,
	SearchIcon,
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

import { downloadSBOMHistoryFile } from "../api/get-sbom-history";
import {
	useDeleteSBOMHistory,
	useSBOMedImages,
	useSBOMHistory,
	useSBOMHistoryDetail,
} from "../hooks/use-scan-query";
import type {
	SBOMComponent,
	SBOMFormat,
	SBOMHistoryQueryParams,
} from "../types";

type FormatFilter = SBOMFormat | "";

function downloadBlob(blob: Blob, filename: string) {
	const url = window.URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	window.URL.revokeObjectURL(url);
}

function toggleSort(
	setParams: Dispatch<SetStateAction<SBOMHistoryQueryParams>>,
	sortBy: NonNullable<SBOMHistoryQueryParams["sort_by"]>,
) {
	setParams((prev) => ({
		...prev,
		sort_by: sortBy,
		sort_dir: prev.sort_dir === "desc" ? "asc" : "desc",
	}));
}

function getAriaSort(
	params: SBOMHistoryQueryParams,
	sortBy: NonNullable<SBOMHistoryQueryParams["sort_by"]>,
): "none" | "ascending" | "descending" {
	if (params.sort_by !== sortBy) return "none";
	return params.sort_dir === "asc" ? "ascending" : "descending";
}

function ComponentsTable({ components }: { components: SBOMComponent[] }) {
	return (
		<div className="overflow-hidden rounded-md border">
			<div className="max-h-[50vh] overflow-y-auto">
				<Table>
					<TableHeader className="sticky top-0 bg-muted/50">
						<TableRow>
							<TableHead>Name</TableHead>
							<TableHead>Version</TableHead>
							<TableHead>Type</TableHead>
							<TableHead>PURL</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{components.length === 0 ? (
							<TableRow>
								<TableCell
									colSpan={4}
									className="py-8 text-center text-muted-foreground"
								>
									No components found.
								</TableCell>
							</TableRow>
						) : (
							components.map((component, index) => (
								<TableRow
									key={`${component.name}-${component.version}-${index}`}
								>
									<TableCell className="font-medium">
										{component.name}
									</TableCell>
									<TableCell>{component.version || "-"}</TableCell>
									<TableCell>
										<Badge variant="outline" className="capitalize">
											{component.type || "unknown"}
										</Badge>
									</TableCell>
									<TableCell className="break-all font-mono text-xs text-muted-foreground">
										{component.purl || "-"}
									</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}

export function SBOMHistoryPage() {
	const [params, setParams] = useState<SBOMHistoryQueryParams>({
		page: 1,
		page_size: 20,
		sort_by: "completed_at",
		sort_dir: "desc",
	});
	const [imageFilter, setImageFilter] = useState("");
	const [hostFilter, setHostFilter] = useState("");
	const [formatFilter, setFormatFilter] = useState<FormatFilter>("");
	const [selectedSBOMId, setSelectedSBOMId] = useState<string | null>(null);

	const { data: historyData, isLoading } = useSBOMHistory({
		...params,
		image: imageFilter || undefined,
		host: hostFilter || undefined,
		format: formatFilter || undefined,
	});
	const { data: sbomedImages } = useSBOMedImages();
	const { data: detailResult, isLoading: isDetailLoading } =
		useSBOMHistoryDetail(selectedSBOMId);
	const deleteMutation = useDeleteSBOMHistory();

	const uniqueHosts = Array.from(
		new Set(sbomedImages?.map((img) => img.host) ?? []),
	);
	const hasFilters = imageFilter || hostFilter || formatFilter;

	const totalComponents = useMemo(
		() =>
			(historyData?.results ?? []).reduce((a, r) => a + r.component_count, 0),
		[historyData],
	);

	const formatCounts = useMemo(() => {
		const counts: Record<string, number> = {};
		for (const r of historyData?.results ?? []) {
			counts[r.format] = (counts[r.format] ?? 0) + 1;
		}
		return counts;
	}, [historyData]);

	const clearFilters = () => {
		setImageFilter("");
		setHostFilter("");
		setFormatFilter("");
		setParams((prev) => ({ ...prev, page: 1 }));
	};

	return (
		<div className="helm-dashboard w-full space-y-5">
			{/* Page header */}
			<header className="helm-page-head">
				<div>
					<h1>SBOMs</h1>
					<p>
						{historyData?.total ?? 0} total SBOMs · {sbomedImages?.length ?? 0}{" "}
						images
					</p>
				</div>
			</header>

			{/* KPI cards */}
			<section className="helm-metrics-grid">
				<Card className="helm-metric-card">
					<CardContent>
						<p className="helm-metric-label">
							<FileTextIcon className="size-3.5" />
							Total SBOMs
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
							<PackageIcon className="size-3.5" />
							Images
						</p>
						<div className="helm-metric-value">
							<span>{sbomedImages?.length ?? 0}</span>
						</div>
						<div className="helm-chip-row">
							<span>{uniqueHosts.length} hosts</span>
						</div>
					</CardContent>
				</Card>

				<Card className="helm-metric-card">
					<CardContent>
						<p className="helm-metric-label">
							<LayersIcon className="size-3.5" />
							Components
						</p>
						<div className="helm-metric-value">
							<span style={{ fontSize: "clamp(18px,1.8vw,24px)" }}>
								{totalComponents.toLocaleString()}
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
							<FileTextIcon className="size-3.5" />
							Formats
						</p>
						<div className="helm-metric-value">
							<span>{Object.keys(formatCounts).length || "—"}</span>
						</div>
						<div className="helm-chip-row">
							{Object.entries(formatCounts).map(([fmt]) => (
								<span key={fmt}>{fmt.split("-")[0]}</span>
							))}
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
							onChange={(event) => {
								setImageFilter(event.target.value);
								setParams((prev) => ({ ...prev, page: 1 }));
							}}
							className="h-8 pl-8 text-sm"
						/>
					</div>

					<Select
						value={hostFilter || "all"}
						onValueChange={(value) => {
							setHostFilter(value === "all" ? "" : value);
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
						value={formatFilter || "all"}
						onValueChange={(value) => {
							setFormatFilter(value === "all" ? "" : (value as SBOMFormat));
							setParams((prev) => ({ ...prev, page: 1 }));
						}}
					>
						<SelectTrigger className="h-8 w-[170px] text-sm">
							<SelectValue placeholder="All formats" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All formats</SelectItem>
							<SelectItem value="spdx-json">SPDX JSON</SelectItem>
							<SelectItem value="cyclonedx-json">CycloneDX JSON</SelectItem>
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
									Format
								</TableHead>
								<TableHead
									className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
									aria-sort={getAriaSort(params, "component_count")}
								>
									<button
										type="button"
										className="inline-flex items-center gap-1"
										onClick={() => toggleSort(setParams, "component_count")}
									>
										Components
										{params.sort_by === "component_count" &&
											(params.sort_dir === "desc" ? " ↓" : " ↑")}
									</button>
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
										Loading SBOM history...
									</TableCell>
								</TableRow>
							) : !historyData?.results.length ? (
								<TableRow>
									<TableCell
										colSpan={7}
										className="py-10 text-center text-sm text-muted-foreground"
									>
										No SBOM history found
									</TableCell>
								</TableRow>
							) : (
								historyData.results.map((result) => (
									<TableRow key={result.id}>
										<TableCell className="max-w-[240px] font-mono text-xs">
											<button
												type="button"
												className="max-w-full truncate text-left underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
												onClick={() => setSelectedSBOMId(result.id)}
											>
												{result.image_ref}
											</button>
										</TableCell>
										<TableCell>
											<Badge variant="outline" className="font-mono text-xs">
												{result.host}
											</Badge>
										</TableCell>
										<TableCell>
											<span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
												{result.format}
											</span>
										</TableCell>
										<TableCell className="font-mono text-xs tabular-nums">
											{result.component_count.toLocaleString()}
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
													title="Download SBOM JSON"
													onClick={() => {
														downloadSBOMHistoryFile(result.id)
															.then(({ blob, filename }) =>
																downloadBlob(blob, filename),
															)
															.catch((error) => {
																console.error(
																	"Failed to download SBOM:",
																	error,
																);
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
													onClick={(event) => {
														event.stopPropagation();
														if (
															confirm(
																"Are you sure you want to delete this SBOM result?",
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

			<Dialog
				open={!!selectedSBOMId}
				onOpenChange={(open) => !open && setSelectedSBOMId(null)}
			>
				<DialogContent className="max-h-[80vh] max-w-4xl overflow-y-auto">
					<DialogHeader>
						<DialogTitle>
							{detailResult ? (
								<span className="flex items-center gap-2">
									SBOM:{" "}
									<code className="text-sm">{detailResult.image_ref}</code>
									<Badge variant="outline">{detailResult.host}</Badge>
								</span>
							) : (
								"SBOM Details"
							)}
						</DialogTitle>
					</DialogHeader>

					{isDetailLoading ? (
						<div className="py-8 text-center text-muted-foreground">
							Loading SBOM details...
						</div>
					) : detailResult ? (
						<div className="space-y-4">
							<div className="grid grid-cols-2 gap-4 text-sm">
								<div>
									<span className="text-muted-foreground">Format:</span>{" "}
									<span className="capitalize">{detailResult.format}</span>
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
									<span className="text-muted-foreground">Components:</span>{" "}
									{detailResult.component_count}
								</div>
							</div>

							<ComponentsTable components={detailResult.components ?? []} />
						</div>
					) : null}
				</DialogContent>
			</Dialog>
		</div>
	);
}
