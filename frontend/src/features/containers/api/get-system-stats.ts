import { authenticatedFetch } from "@/lib/api-client";
import { API_BASE_URL } from "@/types/api";

export interface SystemStats {
  hostInfo: {
    hostname: string;
    platform: string;
    platformVersion: string;
    kernelVersion: string;
    arch: string;
    uptime: number;
    cpuLogical?: number;
    cpuPhysical?: number;
  };
  usage: {
    cpuPercent: number;
    memoryPercent: number;
    memoryTotal: number;
    memoryUsed: number;
    diskPercent: number;
    diskTotal: number;
    diskUsed: number;
  };
  load?: {
    load1: number;
    load5: number;
    load15: number;
  };
  network?: {
    rxBytes: number;
    txBytes: number;
  };
}

export async function getSystemStats(): Promise<SystemStats> {
  const response = await authenticatedFetch(
    `${API_BASE_URL}/api/v1/system/stats`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch system stats");
  }

  return response.json();
}
