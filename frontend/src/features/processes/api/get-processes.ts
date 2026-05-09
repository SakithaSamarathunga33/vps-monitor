import { authenticatedFetch } from "@/lib/api-client";
import { API_BASE_URL } from "@/types/api";

export interface ProcessInfo {
  pid: number;
  name: string;
  cpu_percent: number;
  suspicious: boolean;
  suspicious_reason?: string;
  process_type: string;
}

export interface ProcessesResponse {
  processes: ProcessInfo[];
  auto_killed?: string[];
}

export async function getProcesses(): Promise<ProcessesResponse> {
  const response = await authenticatedFetch(
    `${API_BASE_URL}/api/v1/system/processes`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch processes");
  }

  return response.json();
}
