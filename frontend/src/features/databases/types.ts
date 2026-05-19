import type { ContainerInfo } from "@/features/containers/types";

export type DatabaseEngine = "postgres" | "mysql";

export interface DatabaseInstance {
  id: string;
  host: string;
  name: string;
  image: string;
  state: string;
  status: string;
  engine: DatabaseEngine;
  container: ContainerInfo;
}

export interface DatabaseTable {
  schema?: string;
  name: string;
  type?: string;
}

export interface DatabaseColumn {
  name: string;
  type: string;
  nullable: boolean;
  default?: string;
  ordinalPosition: number;
}

export interface DatabaseRowsResponse {
  columns: string[];
  rows: Record<string, string>[];
  limit: number;
}
