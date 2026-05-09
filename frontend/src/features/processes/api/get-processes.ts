import { authenticatedFetch } from "@/lib/api-client";
import { API_BASE_URL } from "@/types/api";

export interface ProcessInfo {
  pid: number;
  ppid?: number;
  name: string;
  parent_name?: string;
  cpu_percent: number;
  suspicious: boolean;
  suspicious_reason?: string;
  process_type: string;
  kill_error?: string;
  suggested_kill_on_sight_name?: string;
  exe_path?: string;
  cmdline?: string;
  source_hint?: string;
}

export interface ProcessKillFailure {
  pid: number;
  name: string;
  error: string;
}

export interface ProcessesResponse {
  processes: ProcessInfo[];
  auto_killed?: string[];
  auto_kill_failed?: ProcessKillFailure[];
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
