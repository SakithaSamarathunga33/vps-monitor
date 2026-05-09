import { authenticatedFetch } from "@/lib/api-client";
import { API_BASE_URL } from "@/types/api";

export interface ProcessInfo {
  pid: number;
  name: string;
  cpu_percent: number;
}

export interface ProcessesResponse {
  processes: ProcessInfo[];
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
