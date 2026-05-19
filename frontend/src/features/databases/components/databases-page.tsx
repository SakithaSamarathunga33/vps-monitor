import { useQuery } from "@tanstack/react-query";
import {
	DatabaseIcon,
	HardDriveIcon,
	RefreshCcwIcon,
	Rows3Icon,
	Table2Icon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

function instanceKey(instance: DatabaseInstance) {
	return `${instance.host}:${instance.id}`;
}

function tableKey(table: DatabaseTable) {
	return `${table.schema ?? ""}.${table.name}`;
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
			instances.find(
				(instance) => instanceKey(instance) === selectedInstanceKey,
			) ?? instances[0],
		[instances, selectedInstanceKey],
	);

	useEffect(() => {
		if (!selectedInstance && selectedInstanceKey) {
			setSelectedInstanceKey("");
		}
		if (selectedInstance && !selectedInstanceKey) {
			setSelectedInstanceKey(instanceKey(selectedInstance));
		}
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
		() =>
			tables.find((table) => tableKey(table) === selectedTableKey) ?? tables[0],
		[tables, selectedTableKey],
	);

	useEffect(() => {
		if (!selectedTable && selectedTableKey) {
			setSelectedTableKey("");
		}
		if (selectedTable && !selectedTableKey) {
			setSelectedTableKey(tableKey(selectedTable));
		}
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

	const refreshSelected = () => {
		void instancesQuery.refetch();
		void databasesQuery.refetch();
		void tablesQuery.refetch();
		void columnsQuery.refetch();
		void rowsQuery.refetch();
	};

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

	const isAnyRefetching =
		instancesQuery.isRefetching ||
		databasesQuery.isRefetching ||
		tablesQuery.isRefetching ||
		rowsQuery.isRefetching;

	return (
		<div className="helm-dashboard w-full space-y-5">
			<header className="helm-page-head">
				<div>
					<h1>Databases</h1>
					<p>
						{instances.length} database{" "}
						{instances.length === 1 ? "instance" : "instances"}
					</p>
				</div>
				<div className="helm-page-actions">
					<Button
						variant="outline"
						size="sm"
						onClick={refreshSelected}
						disabled={isAnyRefetching}
					>
						<RefreshCcwIcon
							className={cn("size-4", isAnyRefetching && "animate-spin")}
						/>
						Refresh
					</Button>
				</div>
			</header>

			{instances.length === 0 ? (
				<Card>
					<CardContent className="py-10 text-center text-muted-foreground">
						No Postgres, MySQL, or MariaDB containers found.
					</CardContent>
				</Card>
			) : (
				<div className="grid gap-4 xl:grid-cols-[320px_320px_minmax(0,1fr)]">
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2 text-base">
								<HardDriveIcon className="size-4" />
								Instances
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-2">
							{instances.map((instance) => {
								const key = instanceKey(instance);
								const selected = key === selectedInstanceKey;
								return (
									<button
										key={key}
										type="button"
										onClick={() => {
											setSelectedInstanceKey(key);
											setSelectedDatabase("");
											setSelectedTableKey("");
										}}
										className={cn(
											"w-full rounded-md border p-3 text-left transition-colors hover:bg-muted/50",
											selected && "border-primary bg-primary/10",
										)}
									>
										<div className="flex items-start justify-between gap-2">
											<div className="min-w-0">
												<div className="truncate font-medium">
													{instance.name || instance.id.slice(0, 12)}
												</div>
												<div className="truncate text-xs text-muted-foreground">
													{instance.host} - {instance.image}
												</div>
											</div>
											<Badge variant="outline">{instance.engine}</Badge>
										</div>
										<div className="mt-2 text-xs text-muted-foreground">
											{instance.status || instance.state}
										</div>
									</button>
								);
							})}
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2 text-base">
								<DatabaseIcon className="size-4" />
								Databases
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							{databasesQuery.isLoading ? (
								<LoadingLine label="Loading databases..." />
							) : databasesQuery.error ? (
								<ErrorLine message={databasesQuery.error.message} />
							) : databases.length === 0 ? (
								<EmptyLine label="No databases visible" />
							) : (
								<div className="space-y-2">
									{databases.map((database) => (
										<button
											key={database}
											type="button"
											onClick={() => {
												setSelectedDatabase(database);
												setSelectedTableKey("");
											}}
											className={cn(
												"flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-muted/50",
												selectedDatabase === database &&
													"bg-primary/10 text-primary",
											)}
										>
											<DatabaseIcon className="size-4 shrink-0" />
											<span className="truncate">{database}</span>
										</button>
									))}
								</div>
							)}

							<div className="border-t pt-4">
								<div className="mb-2 flex items-center gap-2 text-sm font-medium">
									<Table2Icon className="size-4" />
									Tables
								</div>
								{tablesQuery.isLoading ? (
									<LoadingLine label="Loading tables..." />
								) : tablesQuery.error ? (
									<ErrorLine message={tablesQuery.error.message} />
								) : tables.length === 0 ? (
									<EmptyLine label="No tables visible" />
								) : (
									<div className="max-h-[420px] space-y-1 overflow-auto pr-1">
										{tables.map((table) => {
											const key = tableKey(table);
											return (
												<button
													key={key}
													type="button"
													onClick={() => setSelectedTableKey(key)}
													className={cn(
														"w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted/50",
														selectedTableKey === key &&
															"bg-primary/10 text-primary",
													)}
												>
													<div className="truncate font-medium">
														{table.name}
													</div>
													{table.schema && (
														<div className="truncate text-xs text-muted-foreground">
															{table.schema}
														</div>
													)}
												</button>
											);
										})}
									</div>
								)}
							</div>
						</CardContent>
					</Card>

					<div className="space-y-4">
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2 text-base">
									<Rows3Icon className="size-4" />
									{selectedTable ? selectedTable.name : "Table Preview"}
								</CardTitle>
							</CardHeader>
							<CardContent>
								{columnsQuery.isLoading ? (
									<LoadingLine label="Loading columns..." />
								) : columnsQuery.error ? (
									<ErrorLine message={columnsQuery.error.message} />
								) : (columnsQuery.data ?? []).length === 0 ? (
									<EmptyLine label="Select a table to inspect columns" />
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
													<TableCell className="font-mono text-xs">
														{column.name}
													</TableCell>
													<TableCell>{column.type}</TableCell>
													<TableCell>
														{column.nullable ? "YES" : "NO"}
													</TableCell>
													<TableCell className="max-w-[220px] truncate text-muted-foreground">
														{column.default || ""}
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								)}
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle className="text-base">Rows</CardTitle>
							</CardHeader>
							<CardContent>
								{rowsQuery.isLoading ? (
									<LoadingLine label="Loading rows..." />
								) : rowsQuery.error ? (
									<ErrorLine message={rowsQuery.error.message} />
								) : !rowsQuery.data || rowsQuery.data.rows.length === 0 ? (
									<EmptyLine label="No rows returned" />
								) : (
									<Table>
										<TableHeader>
											<TableRow className="hover:bg-transparent">
												{rowsQuery.data.columns.map((column) => (
													<TableHead key={column}>{column}</TableHead>
												))}
											</TableRow>
										</TableHeader>
										<TableBody>
											{rowsQuery.data.rows.map((row, index) => (
												<TableRow key={index}>
													{rowsQuery.data.columns.map((column) => (
														<TableCell
															key={column}
															className="max-w-[260px] truncate font-mono text-xs"
														>
															{row[column]}
														</TableCell>
													))}
												</TableRow>
											))}
										</TableBody>
									</Table>
								)}
							</CardContent>
						</Card>
					</div>
				</div>
			)}
		</div>
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
