import { Link } from "@tanstack/react-router";
import {
	DownloadIcon,
	FileCheck2Icon,
	FileTextIcon,
	HardDriveIcon,
	ImageIcon,
	LayersIcon,
	PackageIcon,
	RefreshCcwIcon,
	SearchIcon,
	ShieldAlertIcon,
	ShieldCheckIcon,
	Trash2Icon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { BulkScanDialog } from "@/features/scanner/components/bulk-scan-dialog";
import { SBOMDialog } from "@/features/scanner/components/sbom-dialog";
import { ScanDialog } from "@/features/scanner/components/scan-dialog";
import {
	useObservedSBOMJobs,
	useSBOMedImages,
	useScannedImages,
} from "@/features/scanner/hooks/use-scan-query";

import {
	useImagesQuery,
	useRemoveImageMutation,
} from "../hooks/use-images-query";
import type { ImageInfo } from "../types";
import { ImagePullDialog } from "./image-pull-dialog";

function formatBytes(bytes: number): string {
	if (bytes === 0) return "0 B";
	const k = 1024;
	const sizes = ["B", "KB", "MB", "GB", "TB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${(bytes / k ** i).toFixed(1)} ${sizes[i]}`;
}

function formatBytesCompact(bytes: number): string {
	if (bytes === 0) return "0 B";
	const gb = bytes / 1024 ** 3;
	if (gb >= 1) return `${gb.toFixed(gb >= 10 ? 0 : 1)} GB`;
	const mb = bytes / 1024 ** 2;
	return `${Math.round(mb)} MB`;
}

function formatDate(timestamp: number): string {
	const date = new Date(timestamp * 1000);
	return date.toLocaleDateString("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
}

function getImageRepo(image: ImageInfo): string {
	if (!image.repo_tags || image.repo_tags.length === 0) {
		return image.id.replace("sha256:", "").slice(0, 12);
	}
	const tag = image.repo_tags[0];
	const colonIdx = tag.lastIndexOf(":");
	return colonIdx > 0 ? tag.slice(0, colonIdx) : tag;
}

function getImageTag(image: ImageInfo): string {
	if (!image.repo_tags || image.repo_tags.length === 0) return "<none>";
	const tag = image.repo_tags[0];
	const colonIdx = tag.lastIndexOf(":");
	return colonIdx > 0 ? tag.slice(colonIdx + 1) : "latest";
}

function getImageDisplayName(image: ImageInfo): string {
	if (image.repo_tags && image.repo_tags.length > 0) {
		return image.repo_tags[0];
	}
	return image.id.replace("sha256:", "").slice(0, 12);
}

function getShortDigest(image: ImageInfo): string {
	return image.id.replace("sha256:", "").slice(0, 19);
}

export function ImagesTable() {
	const { data, isLoading, error, refetch, isRefetching } = useImagesQuery();
	const removeImageMutation = useRemoveImageMutation();
	const { data: scannedImages } = useScannedImages();
	const { data: sbomedImages } = useSBOMedImages();

	const scannedSet = useMemo(() => {
		const set = new Set<string>();
		for (const img of scannedImages ?? []) {
			set.add(`${img.image_ref}::${img.host}`);
		}
		return set;
	}, [scannedImages]);

	const sbomedSet = useMemo(() => {
		const set = new Set<string>();
		for (const img of sbomedImages ?? []) {
			set.add(`${img.image_ref}::${img.host}`);
		}
		return set;
	}, [sbomedImages]);

	const [searchText, setSearchText] = useState("");
	const [isPullDialogOpen, setIsPullDialogOpen] = useState(false);
	const [selectedHosts, setSelectedHosts] = useState<string[]>([]);
	const [imageToDelete, setImageToDelete] = useState<{
		image: ImageInfo;
		host: string;
	} | null>(null);
	const [scanImage, setScanImage] = useState<ImageInfo | null>(null);
	const [sbomImage, setSbomImage] = useState<ImageInfo | null>(null);
	const [activeSBOMJobIds, setActiveSBOMJobIds] = useState<string[]>([]);
	const [bulkScanOpen, setBulkScanOpen] = useState(false);

	useObservedSBOMJobs(activeSBOMJobIds, (jobId) => {
		setActiveSBOMJobIds((prev) =>
			prev.filter((activeJobId) => activeJobId !== jobId),
		);
	});

	const allImages = useMemo(() => data?.images ?? [], [data?.images]);

	const hosts = useMemo(() => {
		if (!data?.images) return [];
		const uniqueHosts = new Set(data.images.map((img) => img.host));
		return Array.from(uniqueHosts);
	}, [data?.images]);

	const totalBytes = useMemo(
		() => allImages.reduce((a, img) => a + img.size, 0),
		[allImages],
	);

	const unusedCount = useMemo(
		() =>
			allImages.filter((img) => !img.repo_tags || img.repo_tags.length === 0)
				.length,
		[allImages],
	);

	const avgSize = allImages.length > 0 ? totalBytes / allImages.length : 0;

	const filteredImages = useMemo(() => {
		if (!searchText) return allImages;
		const search = searchText.toLowerCase();
		return allImages.filter((img) => {
			const name = getImageDisplayName(img).toLowerCase();
			const id = img.id.toLowerCase();
			return name.includes(search) || id.includes(search);
		});
	}, [allImages, searchText]);

	const handleDelete = async () => {
		if (!imageToDelete) return;

		try {
			await removeImageMutation.mutateAsync({
				imageId: imageToDelete.image.id,
				host: imageToDelete.host,
				force: false,
			});
			toast.success("Image removed successfully");
		} catch (err) {
			toast.error(
				`Failed to remove image: ${err instanceof Error ? err.message : "Unknown error"}`,
			);
		} finally {
			setImageToDelete(null);
		}
	};

	const openPullDialog = () => {
		setSelectedHosts(hosts.length > 0 ? [hosts[0]] : []);
		setIsPullDialogOpen(true);
	};

	if (isLoading) {
		return (
			<Card>
				<CardContent className="flex items-center justify-center py-8">
					<Spinner className="mr-2 size-4" />
					Loading images...
				</CardContent>
			</Card>
		);
	}

	if (error) {
		return (
			<Card>
				<CardContent className="py-8 text-center text-destructive">
					Failed to load images: {error.message}
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="helm-dashboard w-full space-y-5">
			{/* Page header */}
			<header className="helm-page-head">
				<div>
					<h1>Images</h1>
					<p>
						{allImages.length} images · {formatBytesCompact(totalBytes)} total ·{" "}
						{unusedCount} unused
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
					</Button>
					{!data?.readOnly && (
						<>
							<Button
								variant="outline"
								size="sm"
								onClick={() => setBulkScanOpen(true)}
							>
								<ShieldCheckIcon className="mr-1.5 size-3.5" />
								Re-scan all
							</Button>
							<Button variant="default" size="sm" onClick={openPullDialog}>
								<DownloadIcon className="mr-1.5 size-3.5" />
								Pull image
							</Button>
						</>
					)}
				</div>
			</header>

			{/* KPI cards */}
			<section className="helm-metrics-grid">
				<Card className="helm-metric-card">
					<CardContent>
						<p className="helm-metric-label">
							<ImageIcon className="size-3.5" />
							Total Images
						</p>
						<div className="helm-metric-value">
							<span>{allImages.length}</span>
						</div>
						<div className="helm-chip-row">
							<span>{unusedCount} unused</span>
							<span>{allImages.length - unusedCount} tagged</span>
						</div>
					</CardContent>
				</Card>

				<Card className="helm-metric-card">
					<CardContent>
						<p className="helm-metric-label">
							<HardDriveIcon className="size-3.5" />
							Disk Used
						</p>
						<div className="helm-metric-value">
							<span style={{ fontSize: "clamp(18px,1.8vw,24px)" }}>
								{formatBytesCompact(totalBytes)}
							</span>
						</div>
						<div className="helm-chip-row">
							<span>across {allImages.length} images</span>
						</div>
					</CardContent>
				</Card>

				<Card className="helm-metric-card">
					<CardContent>
						<p className="helm-metric-label">
							<LayersIcon className="size-3.5" />
							Avg Size
						</p>
						<div className="helm-metric-value">
							<span style={{ fontSize: "clamp(18px,1.8vw,24px)" }}>
								{formatBytesCompact(avgSize)}
							</span>
						</div>
						<div className="helm-chip-row">
							<span>per image</span>
						</div>
					</CardContent>
				</Card>

				<Card className="helm-metric-card">
					<CardContent>
						<p className="helm-metric-label">
							<ShieldAlertIcon className="size-3.5" />
							Scanned
						</p>
						<div className="helm-metric-value">
							<span>{scannedImages?.length ?? 0}</span>
							<span className="helm-metric-unit">/ {allImages.length}</span>
						</div>
						<div className="helm-chip-row">
							<span>{sbomedImages?.length ?? 0} SBOMs</span>
						</div>
					</CardContent>
				</Card>
			</section>

			{/* Search + table */}
			<Card>
				<div className="flex items-center gap-3 border-b border-border px-4 py-3">
					<SearchIcon className="size-3.5 shrink-0 text-muted-foreground" />
					<Input
						placeholder="Filter by repository, tag, or digest…"
						value={searchText}
						onChange={(e) => setSearchText(e.target.value)}
						className="h-7 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 text-sm"
					/>
					<span className="shrink-0 font-mono text-[11px] text-muted-foreground">
						{filteredImages.length} / {allImages.length}
					</span>
				</div>
				<CardContent className="p-0">
					{filteredImages.length === 0 ? (
						<div className="py-10 text-center text-sm text-muted-foreground">
							{searchText ? "No images match your search" : "No images found"}
						</div>
					) : (
						<Table>
							<TableHeader>
								<TableRow className="hover:bg-transparent">
									<TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
										Repository
									</TableHead>
									<TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
										Tag
									</TableHead>
									<TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
										Digest
									</TableHead>
									<TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
										Size
									</TableHead>
									<TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
										Created
									</TableHead>
									{!data?.readOnly && (
										<TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
											Actions
										</TableHead>
									)}
								</TableRow>
							</TableHeader>
							<TableBody>
								{filteredImages.map((image) => (
									<TableRow key={`${image.host}-${image.id}`}>
										<TableCell>
											<div className="flex items-center gap-2">
												<div
													className="flex size-7 shrink-0 items-center justify-center rounded-md text-primary"
													style={{
														background:
															"color-mix(in oklch, var(--primary) 12%, transparent)",
													}}
												>
													<PackageIcon className="size-3.5" />
												</div>
												<div className="min-w-0">
													<div className="max-w-[220px] truncate font-medium text-sm">
														{getImageRepo(image)}
													</div>
													<div className="font-mono text-[10px] text-muted-foreground">
														{image.host}
													</div>
												</div>
											</div>
										</TableCell>
										<TableCell>
											<span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
												{getImageTag(image)}
											</span>
										</TableCell>
										<TableCell>
											<Tooltip>
												<TooltipTrigger asChild>
													<span className="cursor-help font-mono text-xs text-muted-foreground">
														{getShortDigest(image)}…
													</span>
												</TooltipTrigger>
												<TooltipContent className="max-w-md">
													{image.id}
												</TooltipContent>
											</Tooltip>
										</TableCell>
										<TableCell className="text-right font-mono text-xs tabular-nums">
											{formatBytes(image.size)}
										</TableCell>
										<TableCell className="font-mono text-xs text-muted-foreground">
											{formatDate(image.created)}
										</TableCell>
										{!data?.readOnly && (
											<TableCell>
												<div className="flex items-center justify-end gap-1">
													{scannedSet.has(
														`${getImageDisplayName(image)}::${image.host}`,
													) ? (
														<Tooltip>
															<TooltipTrigger asChild>
																<Button variant="ghost" size="icon-sm" asChild>
																	<Link to="/scan-history">
																		<ShieldCheckIcon className="size-4 text-green-500" />
																	</Link>
																</Button>
															</TooltipTrigger>
															<TooltipContent>View scan results</TooltipContent>
														</Tooltip>
													) : (
														<Tooltip>
															<TooltipTrigger asChild>
																<Button
																	variant="ghost"
																	size="icon-sm"
																	onClick={() => setScanImage(image)}
																>
																	<ShieldAlertIcon className="size-4" />
																</Button>
															</TooltipTrigger>
															<TooltipContent>Scan image</TooltipContent>
														</Tooltip>
													)}
													{sbomedSet.has(
														`${getImageDisplayName(image)}::${image.host}`,
													) ? (
														<Tooltip>
															<TooltipTrigger asChild>
																<Button variant="ghost" size="icon-sm" asChild>
																	<Link to="/sbom-history">
																		<FileCheck2Icon className="size-4 text-green-500" />
																	</Link>
																</Button>
															</TooltipTrigger>
															<TooltipContent>View SBOM</TooltipContent>
														</Tooltip>
													) : (
														<Tooltip>
															<TooltipTrigger asChild>
																<Button
																	variant="ghost"
																	size="icon-sm"
																	onClick={() => setSbomImage(image)}
																>
																	<FileTextIcon className="size-4" />
																</Button>
															</TooltipTrigger>
															<TooltipContent>Generate SBOM</TooltipContent>
														</Tooltip>
													)}
													<Tooltip>
														<TooltipTrigger asChild>
															<Button
																variant="ghost"
																size="icon-sm"
																onClick={() =>
																	setImageToDelete({ image, host: image.host })
																}
															>
																<Trash2Icon className="size-4 text-destructive" />
															</Button>
														</TooltipTrigger>
														<TooltipContent>Remove image</TooltipContent>
													</Tooltip>
												</div>
											</TableCell>
										)}
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>

			<ImagePullDialog
				isOpen={isPullDialogOpen}
				onOpenChange={setIsPullDialogOpen}
				hosts={hosts}
				selectedHosts={selectedHosts}
				onSelectedHostsChange={setSelectedHosts}
			/>

			<BulkScanDialog isOpen={bulkScanOpen} onOpenChange={setBulkScanOpen} />

			{scanImage && (
				<ScanDialog
					isOpen={!!scanImage}
					onOpenChange={(open) => {
						if (!open) setScanImage(null);
					}}
					imageRef={getImageDisplayName(scanImage)}
					host={scanImage.host}
				/>
			)}

			{sbomImage && (
				<SBOMDialog
					isOpen={!!sbomImage}
					onOpenChange={(open) => {
						if (!open) setSbomImage(null);
					}}
					imageRef={getImageDisplayName(sbomImage)}
					host={sbomImage.host}
					onJobCreated={(jobId) => {
						setActiveSBOMJobIds((prev) =>
							prev.includes(jobId) ? prev : [...prev, jobId],
						);
					}}
				/>
			)}

			<AlertDialog
				open={!!imageToDelete}
				onOpenChange={(open) => !open && setImageToDelete(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Remove Image</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to remove{" "}
							<span className="font-medium">
								{imageToDelete && getImageDisplayName(imageToDelete.image)}
							</span>{" "}
							from <span className="font-medium">{imageToDelete?.host}</span>?
							This action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDelete}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{removeImageMutation.isPending ? (
								<>
									<Spinner className="mr-2 size-4" />
									Removing...
								</>
							) : (
								"Remove"
							)}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
