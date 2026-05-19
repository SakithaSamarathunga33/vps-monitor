import { authenticatedFetch } from "@/lib/api-client";
import { API_BASE_URL } from "@/types/api";

export interface HostStatPoint {
  ts: number;
  cpu: number;
  mem: number;
  disk: number;
  rx: number;
  tx: number;
}

export async function getSystemStatsHistory(): Promise<HostStatPoint[]> {
  const response = await authenticatedFetch(
    `${API_BASE_URL}/api/v1/system/stats/history`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch system stats history");
  }

  const data = await response.json();
  return data.points ?? [];
}
