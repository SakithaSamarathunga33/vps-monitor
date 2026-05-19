import { authenticatedFetch } from "@/lib/api-client";
import { API_BASE_URL } from "@/types/api";

import type {
  DatabaseColumn,
  DatabaseEngine,
  DatabaseInstance,
  DatabaseRowsResponse,
  DatabaseTable,
} from "./types";

const BASE_URL = `${API_BASE_URL}/api/v1/databases`;

interface DatabaseTarget {
  id: string;
  host: string;
  engine: DatabaseEngine;
}

function targetParams(target: Omit<DatabaseTarget, "id">) {
  return new URLSearchParams({
    host: target.host,
    engine: target.engine,
  });
}

async function readJson<T>(url: string): Promise<T> {
  const response = await authenticatedFetch(url);

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function getDatabaseInstances(): Promise<{
  instances: DatabaseInstance[];
  hostErrors?: { host: string; message: string }[];
}> {
  const data = await readJson<{
    instances?: DatabaseInstance[];
    hostErrors?: { host: string; message: string }[];
  }>(BASE_URL);

  return {
    instances: Array.isArray(data.instances) ? data.instances : [],
    hostErrors: Array.isArray(data.hostErrors) ? data.hostErrors : [],
  };
}

export async function getDatabaseNames(
  target: DatabaseTarget
): Promise<string[]> {
  const params = targetParams(target);
  const data = await readJson<{ databases?: string[] }>(
    `${BASE_URL}/${encodeURIComponent(target.id)}/names?${params.toString()}`
  );
  return Array.isArray(data.databases) ? data.databases : [];
}

export async function getDatabaseTables(
  target: DatabaseTarget,
  database: string
): Promise<DatabaseTable[]> {
  const params = targetParams(target);
  params.set("database", database);

  const data = await readJson<{ tables?: DatabaseTable[] }>(
    `${BASE_URL}/${encodeURIComponent(target.id)}/tables?${params.toString()}`
  );
  return Array.isArray(data.tables) ? data.tables : [];
}

export async function getDatabaseColumns(
  target: DatabaseTarget,
  database: string,
  table: DatabaseTable
): Promise<DatabaseColumn[]> {
  const params = targetParams(target);
  params.set("database", database);
  params.set("table", table.name);
  if (table.schema) {
    params.set("schema", table.schema);
  }

  const data = await readJson<{ columns?: DatabaseColumn[] }>(
    `${BASE_URL}/${encodeURIComponent(target.id)}/columns?${params.toString()}`
  );
  return Array.isArray(data.columns) ? data.columns : [];
}

export async function getDatabaseRows(
  target: DatabaseTarget,
  database: string,
  table: DatabaseTable,
  limit = 100
): Promise<DatabaseRowsResponse> {
  const params = targetParams(target);
  params.set("database", database);
  params.set("table", table.name);
  params.set("limit", String(limit));
  if (table.schema) {
    params.set("schema", table.schema);
  }

  return readJson<DatabaseRowsResponse>(
    `${BASE_URL}/${encodeURIComponent(target.id)}/rows?${params.toString()}`
  );
}
