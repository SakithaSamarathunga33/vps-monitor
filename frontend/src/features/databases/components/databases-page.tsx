import { useQuery } from "@tanstack/react-query";
import {
	ActivityIcon,
	DatabaseIcon,
	DownloadIcon,
	HardDriveIcon,
	RefreshCcwIcon,
	Rows3Icon,
	ServerIcon,
	Table2Icon,
	TerminalIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

import {
	getDatabaseColumns,
	getDatabaseInstances,
	getDatabaseNames,
	getDatabaseRows,
	getDatabaseTables,
} from "../api";
import type { DatabaseInstance, DatabaseTable } from "../types";

const ENGINE_COLORS: Record<string, string> = {
	postgres: "#336791",
	postgresql: "#336791",
	mysql: "#00758f",
	mariadb: "#003545",
	redis: "#dc382d",
	mongodb: "#47a248",
};

function engineColor(engine: string): string {
	return ENGINE_COLORS[engine.toLowerCase()] ?? "#8b7cff";
}

function versionFromImage(image: string): string {
	const tag = image.split(":")[1] ?? "";
	return tag.split("-")[0] ?? "";
}

function stateTone(state: string): "ok" | "warn" | "bad" {
	const s = state.toLowerCase();
	if (s === "running") return "ok";
	if (s === "exited" || s === "stopped" || s === "dead") return "bad";
	return "warn";
}

function instanceKey(instance: DatabaseInstance) {
	return `${instance.host}:${instance.id}`;
}

function tableKey(table: DatabaseTable) {
	return `${table.schema ?? ""}.${table.name}`;
}

function StatePill({ state, status }: { state: string; status: string }) {
	const tone = stateTone(state);
	const isUnhealthy = status.toLowerCase().includes("unhealthy");

	const label = isUnhealthy
		? "warn"
		: tone === "ok"
			? "ok"
			: tone === "bad"
				? "down"
				: "warn";
	const colorMap = {
		ok: { bg: "rgba(34,197,94,0.14)", color: "#22c55e" },
		warn: { bg: "rgba(245,158,11,0.14)", color: "#f59e0b" },
		bad: { bg: "rgba(239,68,68,0.14)", color: "#ef4444" },
	} as const;
	const c = isUnhealthy ? colorMap.warn : colorMap[tone];

	return (
		<span
			style={{
				display: "inline-flex",
				alignItems: "center",
				gap: 5,
				padding: "2px 8px",
				borderRadius: 999,
				fontSize: 11,
				fontWeight: 500,
				fontFamily: "JetBrains Mono, monospace",
				background: c.bg,
				color: c.color,
				whiteSpace: "nowrap",
			}}
		>
			<span
				style={{
					width: 6,
					height: 6,
					borderRadius: "50%",
					background: c.color,
				}}
			/>
			{label}
		</span>
	);
}

function InstanceCard({
	instance,
	isSelected,
	onSelect,
	onQuery,
}: {
	instance: DatabaseInstance;
	isSelected: boolean;
	onSelect: () => void;
	onQuery: () => void;
}) {
	const color = engineColor(instance.engine);
	const version = versionFromImage(instance.image);

	return (
		<Card
			style={{
				borderRadius: 12,
				overflow: "hidden",
				cursor: "pointer",
				borderColor: isSelected ? `${color}60` : undefined,
				transition: "border-color 200ms ease",
			}}
			onClick={onSelect}
		>
			{/* Header */}
			<div
				style={{
					padding: "14px 16px 12px",
					display: "flex",
					alignItems: "center",
					gap: 10,
				}}
			>
				<div
					style={{
						width: 34,
						height: 34,
						borderRadius: 8,
						background: `${color}25`,
						display: "grid",
						placeItems: "center",
						border: `1px solid ${color}40`,
						flexShrink: 0,
					}}
				>
					<DatabaseIcon size={16} style={{ color }} />
				</div>
				<div style={{ flex: 1, minWidth: 0 }}>
					<div
						style={{
							fontWeight: 600,
							fontSize: 14,
							overflow: "hidden",
							textOverflow: "ellipsis",
							whiteSpace: "nowrap",
						}}
					>
						{instance.name || instance.id.slice(0, 12)}
					</div>
					<div
						style={{
							fontSize: 11,
							color: "var(--muted-foreground)",
							fontFamily: "JetBrains Mono, monospace",
						}}
					>
						{instance.engine} {version}
					</div>
				</div>
				<StatePill state={instance.state} status={instance.status} />
			</div>

			{/* Divider */}
			<div style={{ height: 1, background: "var(--border)" }} />

			{/* Info */}
			<div style={{ padding: "12px 16px" }}>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						marginBottom: 10,
						fontSize: 11,
						color: "var(--muted-foreground)",
						fontFamily: "JetBrains Mono, monospace",
					}}
				>
					<span>{instance.host}</span>
					{instance.status && (
						<span
							style={{
								overflow: "hidden",
								textOverflow: "ellipsis",
								whiteSpace: "nowrap",
								maxWidth: 140,
								textAlign: "right",
							}}
						>
							{instance.status}
						</span>
					)}
				</div>

				{/* Connection bar placeholder */}
				<Progress
					value={stateTone(instance.state) === "ok" ? 100 : 0}
					className="h-1"
					style={{ height: 3 }}
				/>
			</div>

			{/* Divider */}
			<div style={{ height: 1, background: "var(--border)" }} />

			{/* Actions */}
			<div
				style={{
					padding: "8px 12px",
					display: "flex",
					gap: 4,
				}}
				onClick={(e) => e.stopPropagation()}
			>
				<Button
					variant="ghost"
					size="sm"
					style={{
						flex: 1,
						justifyContent: "center",
						fontSize: 12,
						height: 30,
					}}
					onClick={(e) => {
						e.stopPropagation();
						onQuery();
					}}
				>
					<TerminalIcon className="size-3.5" />
					Query
				</Button>
				<Button
					variant="ghost"
					size="sm"
					style={{
						flex: 1,
						justifyContent: "center",
						fontSize: 12,
						height: 30,
					}}
					onClick={(e) => {
						e.stopPropagation();
						onSelect();
					}}
				>
					<ActivityIcon className="size-3.5" />
					Browse
				</Button>
				<Button
					variant="ghost"
					size="sm"
					style={{
						flex: 1,
						justifyContent: "center",
						fontSize: 12,
						height: 30,
					}}
				>
					<DownloadIcon className="size-3.5" />
					Backup
				</Button>
			</div>
		</Card>
	);
}

function LoadingLine({ label }: { label: string }) {
	return (
		<div className="flex items-center py-4 text-sm text-muted-foreground">
			<Spinner className="mr-2 size-4" />
			{label}
		</div>
	);
}

function ErrorLine({ message }: { message: string }) {
	return <div className="py-4 text-sm text-destructive">{message}</div>;
}

function EmptyLine({ label }: { label: string }) {
	return <div className="py-4 text-sm text-muted-foreground">{label}</div>;
}

export function DatabasesPage() {
	const [selectedInstanceKey, setSelectedInstanceKey] = useState<string>("");
	const [selectedDatabase, setSelectedDatabase] = useState<string>("");
	const [selectedTableKey, setSelectedTableKey] = useState<string>("");

	const instancesQuery = useQuery({
		queryKey: ["database-instances"],
		queryFn: getDatabaseInstances,
	});

	const instances = instancesQuery.data?.instances ?? [];
	const selectedInstance = useMemo(
		() =>
			instances.find((i) => instanceKey(i) === selectedInstanceKey) ??
			instances[0],
		[instances, selectedInstanceKey],
	);

	useEffect(() => {
		if (!selectedInstance && selectedInstanceKey) setSelectedInstanceKey("");
		if (selectedInstance && !selectedInstanceKey)
			setSelectedInstanceKey(instanceKey(selectedInstance));
	}, [selectedInstance, selectedInstanceKey]);

	const target = selectedInstance
		? {
				id: selectedInstance.id,
				host: selectedInstance.host,
				engine: selectedInstance.engine,
			}
		: null;

	const databasesQuery = useQuery({
		queryKey: ["database-names", target],
		queryFn: () => getDatabaseNames(target!),
		enabled: !!target,
	});

	const databases = databasesQuery.data ?? [];

	useEffect(() => {
		if (!databases.includes(selectedDatabase)) {
			setSelectedDatabase(databases[0] ?? "");
			setSelectedTableKey("");
		}
	}, [databases, selectedDatabase]);

	const tablesQuery = useQuery({
		queryKey: ["database-tables", target, selectedDatabase],
		queryFn: () => getDatabaseTables(target!, selectedDatabase),
		enabled: !!target && !!selectedDatabase,
	});

	const tables = tablesQuery.data ?? [];
	const selectedTable = useMemo(
		() => tables.find((t) => tableKey(t) === selectedTableKey) ?? tables[0],
		[tables, selectedTableKey],
	);

	useEffect(() => {
		if (!selectedTable && selectedTableKey) setSelectedTableKey("");
		if (selectedTable && !selectedTableKey)
			setSelectedTableKey(tableKey(selectedTable));
	}, [selectedTable, selectedTableKey]);

	const columnsQuery = useQuery({
		queryKey: ["database-columns", target, selectedDatabase, selectedTable],
		queryFn: () =>
			getDatabaseColumns(target!, selectedDatabase, selectedTable!),
		enabled: !!target && !!selectedDatabase && !!selectedTable,
	});

	const rowsQuery = useQuery({
		queryKey: ["database-rows", target, selectedDatabase, selectedTable],
		queryFn: () =>
			getDatabaseRows(target!, selectedDatabase, selectedTable!, 100),
		enabled: !!target && !!selectedDatabase && !!selectedTable,
	});

	const isAnyRefetching =
		instancesQuery.isRefetching ||
		databasesQuery.isRefetching ||
		tablesQuery.isRefetching ||
		rowsQuery.isRefetching;

	const refreshAll = () => {
		void instancesQuery.refetch();
		void databasesQuery.refetch();
		void tablesQuery.refetch();
		void columnsQuery.refetch();
		void rowsQuery.refetch();
	};

	// KPI counts
	const pgCount = instances.filter((i) => i.engine === "postgres").length;
	const mysqlCount = instances.filter((i) => i.engine === "mysql").length;
	const runningCount = instances.filter((i) => i.state === "running").length;

	if (instancesQuery.isLoading) {
		return (
			<Card>
				<CardContent className="flex items-center justify-center py-8 text-muted-foreground">
					<Spinner className="mr-2 size-4" />
					Loading database containers...
				</CardContent>
			</Card>
		);
	}

	if (instancesQuery.error) {
		return (
			<Card>
				<CardContent className="py-8 text-center text-destructive">
					Failed to load database containers: {instancesQuery.error.message}
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="helm-dashboard w-full space-y-5">
			{/* Page header */}
			<header className="helm-page-head">
				<div>
					<h1>Databases</h1>
					<p>
						{instances.length} database{" "}
						{instances.length === 1 ? "instance" : "instances"} · {runningCount}{" "}
						running
					</p>
				</div>
				<div className="helm-page-actions">
					<Button
						variant="outline"
						size="sm"
						onClick={refreshAll}
						disabled={isAnyRefetching}
					>
						<RefreshCcwIcon
							className={cn("size-4", isAnyRefetching && "animate-spin")}
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
							<DatabaseIcon className="size-3.5" />
							Instances
						</p>
						<div className="helm-metric-value">
							<span>{instances.length}</span>
						</div>
						<div className="helm-chip-row">
							<span>{runningCount} running</span>
							<span>{instances.length - runningCount} stopped</span>
						</div>
					</CardContent>
				</Card>

				<Card className="helm-metric-card">
					<CardContent>
						<p className="helm-metric-label">
							<ServerIcon className="size-3.5" />
							Postgres
						</p>
						<div className="helm-metric-value">
							<span>{pgCount}</span>
						</div>
						<div className="helm-chip-row">
							<span>{mysqlCount} mysql</span>
							<span>{instances.length - pgCount - mysqlCount} other</span>
						</div>
					</CardContent>
				</Card>

				<Card className="helm-metric-card">
					<CardContent>
						<p className="helm-metric-label">
							<HardDriveIcon className="size-3.5" />
							Databases
						</p>
						<div className="helm-metric-value">
							<span>{databases.length || "—"}</span>
						</div>
						<div className="helm-chip-row">
							<span>
								{selectedInstance
									? `in ${selectedInstance.name || "selected"}`
									: "select instance"}
							</span>
						</div>
					</CardContent>
				</Card>

				<Card className="helm-metric-card">
					<CardContent>
						<p className="helm-metric-label">
							<Table2Icon className="size-3.5" />
							Tables
						</p>
						<div className="helm-metric-value">
							<span>{tables.length || "—"}</span>
						</div>
						<div className="helm-chip-row">
							<span>{selectedDatabase || "select database"}</span>
						</div>
					</CardContent>
				</Card>
			</section>

			{instances.length === 0 ? (
				<Card>
					<CardContent className="py-10 text-center text-muted-foreground">
						No Postgres, MySQL, or MariaDB containers found.
					</CardContent>
				</Card>
			) : (
				<>
					{/* Instance cards */}
					<div
						style={{
							display: "grid",
							gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
							gap: 12,
						}}
					>
						{instances.map((instance) => (
							<InstanceCard
								key={instanceKey(instance)}
								instance={instance}
								isSelected={instanceKey(instance) === selectedInstanceKey}
								onSelect={() => {
									setSelectedInstanceKey(instanceKey(instance));
									setSelectedDatabase("");
									setSelectedTableKey("");
								}}
								onQuery={() => {
									setSelectedInstanceKey(instanceKey(instance));
									setSelectedDatabase("");
									setSelectedTableKey("");
								}}
							/>
						))}
					</div>

					{/* Browser panel */}
					{selectedInstance && (
						<div
							style={{
								display: "grid",
								gridTemplateColumns: "260px 260px minmax(0, 1fr)",
								gap: 12,
							}}
						>
							{/* Databases list */}
							<Card style={{ borderRadius: 12, overflow: "hidden" }}>
								<div
									style={{
										padding: "10px 16px",
										borderBottom: "1px solid var(--border)",
										display: "flex",
										alignItems: "center",
										gap: 8,
									}}
								>
									<DatabaseIcon
										size={13}
										style={{ color: "var(--muted-foreground)" }}
									/>
									<span
										style={{
											fontSize: 10,
											fontWeight: 600,
											textTransform: "uppercase",
											letterSpacing: "0.08em",
											color: "var(--muted-foreground)",
										}}
									>
										Databases · {selectedInstance.name}
									</span>
								</div>
								<CardContent style={{ padding: "8px 0" }}>
									{databasesQuery.isLoading ? (
										<div className="px-4">
											<LoadingLine label="Loading..." />
										</div>
									) : databasesQuery.error ? (
										<div className="px-4">
											<ErrorLine message={databasesQuery.error.message} />
										</div>
									) : databases.length === 0 ? (
										<div className="px-4">
											<EmptyLine label="No databases visible" />
										</div>
									) : (
										databases.map((db) => (
											<button
												key={db}
												type="button"
												onClick={() => {
													setSelectedDatabase(db);
													setSelectedTableKey("");
												}}
												style={{
													width: "100%",
													display: "flex",
													alignItems: "center",
													gap: 8,
													padding: "7px 16px",
													textAlign: "left",
													fontSize: 13,
													fontWeight: selectedDatabase === db ? 600 : 400,
													color:
														selectedDatabase === db
															? "var(--primary)"
															: "var(--foreground)",
													background:
														selectedDatabase === db
															? "color-mix(in oklch, var(--primary) 10%, transparent)"
															: "transparent",
													border: "none",
													cursor: "pointer",
													transition: "background 120ms ease",
												}}
											>
												<DatabaseIcon
													size={13}
													style={{
														color:
															selectedDatabase === db
																? "var(--primary)"
																: "var(--muted-foreground)",
														flexShrink: 0,
													}}
												/>
												<span
													style={{
														overflow: "hidden",
														textOverflow: "ellipsis",
														whiteSpace: "nowrap",
													}}
												>
													{db}
												</span>
											</button>
										))
									)}

									{selectedDatabase && (
										<>
											<div
												style={{
													height: 1,
													background: "var(--border)",
													margin: "8px 0",
												}}
											/>
											<div
												style={{
													padding: "4px 16px 6px",
													fontSize: 10,
													fontWeight: 600,
													textTransform: "uppercase",
													letterSpacing: "0.08em",
													color: "var(--muted-foreground)",
													display: "flex",
													alignItems: "center",
													gap: 6,
												}}
											>
												<Table2Icon size={11} />
												Tables
											</div>
											{tablesQuery.isLoading ? (
												<div className="px-4">
													<LoadingLine label="Loading tables..." />
												</div>
											) : tablesQuery.error ? (
												<div className="px-4">
													<ErrorLine message={tablesQuery.error.message} />
												</div>
											) : tables.length === 0 ? (
												<div className="px-4">
													<EmptyLine label="No tables" />
												</div>
											) : (
												<div
													style={{
														maxHeight: 320,
														overflowY: "auto",
														paddingRight: 2,
													}}
												>
													{tables.map((table) => {
														const key = tableKey(table);
														return (
															<button
																key={key}
																type="button"
																onClick={() => setSelectedTableKey(key)}
																style={{
																	width: "100%",
																	display: "flex",
																	flexDirection: "column",
																	padding: "5px 16px",
																	textAlign: "left",
																	fontSize: 12,
																	color:
																		selectedTableKey === key
																			? "var(--primary)"
																			: "var(--foreground)",
																	background:
																		selectedTableKey === key
																			? "color-mix(in oklch, var(--primary) 10%, transparent)"
																			: "transparent",
																	border: "none",
																	cursor: "pointer",
																	transition: "background 120ms ease",
																}}
															>
																<span
																	style={{
																		fontWeight:
																			selectedTableKey === key ? 600 : 400,
																		overflow: "hidden",
																		textOverflow: "ellipsis",
																		whiteSpace: "nowrap",
																	}}
																>
																	{table.name}
																</span>
																{table.schema && (
																	<span
																		style={{
																			fontSize: 10,
																			color: "var(--muted-foreground)",
																			fontFamily: "JetBrains Mono, monospace",
																		}}
																	>
																		{table.schema}
																	</span>
																)}
															</button>
														);
													})}
												</div>
											)}
										</>
									)}
								</CardContent>
							</Card>

							{/* Columns + Rows panel */}
							<div
								style={{
									gridColumn: "2 / -1",
									display: "flex",
									flexDirection: "column",
									gap: 12,
								}}
							>
								{/* Columns */}
								<Card style={{ borderRadius: 12, overflow: "hidden" }}>
									<div
										style={{
											padding: "10px 16px",
											borderBottom: "1px solid var(--border)",
											display: "flex",
											alignItems: "center",
											gap: 8,
										}}
									>
										<Rows3Icon
											size={13}
											style={{ color: "var(--muted-foreground)" }}
										/>
										<span
											style={{
												fontSize: 10,
												fontWeight: 600,
												textTransform: "uppercase",
												letterSpacing: "0.08em",
												color: "var(--muted-foreground)",
											}}
										>
											{selectedTable ? selectedTable.name : "Select a table"}
										</span>
									</div>
									<CardContent style={{ padding: 0 }}>
										{columnsQuery.isLoading ? (
											<div className="px-4">
												<LoadingLine label="Loading columns..." />
											</div>
										) : columnsQuery.error ? (
											<div className="px-4">
												<ErrorLine message={columnsQuery.error.message} />
											</div>
										) : (columnsQuery.data ?? []).length === 0 ? (
											<div className="px-4">
												<EmptyLine label="Select a table to inspect columns" />
											</div>
										) : (
											<Table>
												<TableHeader>
													<TableRow className="hover:bg-transparent">
														<TableHead>Name</TableHead>
														<TableHead>Type</TableHead>
														<TableHead>Null</TableHead>
														<TableHead>Default</TableHead>
													</TableRow>
												</TableHeader>
												<TableBody>
													{(columnsQuery.data ?? []).map((column) => (
														<TableRow key={column.name}>
															<TableCell className="font-mono text-xs font-medium">
																{column.name}
															</TableCell>
															<TableCell className="text-xs">
																{column.type}
															</TableCell>
															<TableCell className="text-xs">
																{column.nullable ? "YES" : "NO"}
															</TableCell>
															<TableCell className="max-w-[220px] truncate text-xs text-muted-foreground">
																{column.default || ""}
															</TableCell>
														</TableRow>
													))}
												</TableBody>
											</Table>
										)}
									</CardContent>
								</Card>

								{/* Rows */}
								<Card style={{ borderRadius: 12, overflow: "hidden" }}>
									<div
										style={{
											padding: "10px 16px",
											borderBottom: "1px solid var(--border)",
											display: "flex",
											alignItems: "center",
											gap: 8,
										}}
									>
										<span
											style={{
												fontSize: 10,
												fontWeight: 600,
												textTransform: "uppercase",
												letterSpacing: "0.08em",
												color: "var(--muted-foreground)",
											}}
										>
											Rows
										</span>
										{rowsQuery.data && (
											<span
												style={{
													marginLeft: "auto",
													fontSize: 10,
													fontFamily: "JetBrains Mono, monospace",
													color: "var(--muted-foreground)",
												}}
											>
												{rowsQuery.data.rows.length} rows
											</span>
										)}
									</div>
									<CardContent style={{ padding: 0 }}>
										{rowsQuery.isLoading ? (
											<div className="px-4">
												<LoadingLine label="Loading rows..." />
											</div>
										) : rowsQuery.error ? (
											<div className="px-4">
												<ErrorLine message={rowsQuery.error.message} />
											</div>
										) : !rowsQuery.data || rowsQuery.data.rows.length === 0 ? (
											<div className="px-4">
												<EmptyLine label="No rows returned" />
											</div>
										) : (
											<div style={{ overflowX: "auto" }}>
												<Table>
													<TableHeader>
														<TableRow className="hover:bg-transparent">
															{rowsQuery.data.columns.map((col) => (
																<TableHead key={col}>{col}</TableHead>
															))}
														</TableRow>
													</TableHeader>
													<TableBody>
														{rowsQuery.data.rows.map((row, index) => (
															// biome-ignore lint/suspicious/noArrayIndexKey: static table rows
															<TableRow key={index}>
																{rowsQuery.data.columns.map((col) => (
																	<TableCell
																		key={col}
																		className="max-w-[260px] truncate font-mono text-xs"
																	>
																		{row[col]}
																	</TableCell>
																))}
															</TableRow>
														))}
													</TableBody>
												</Table>
											</div>
										)}
									</CardContent>
								</Card>
							</div>
						</div>
					)}
				</>
			)}
		</div>
	);
}
