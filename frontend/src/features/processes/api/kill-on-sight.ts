import { authenticatedFetch } from "@/lib/api-client";
import { API_BASE_URL } from "@/types/api";

export interface KillOnSightResponse {
  names: string[];
}

export async function getKillOnSight(): Promise<KillOnSightResponse> {
  const response = await authenticatedFetch(
    `${API_BASE_URL}/api/v1/system/processes/kill-on-sight`
  );
  if (!response.ok) throw new Error("Failed to fetch kill-on-sight list");
  return response.json();
}

export async function addKillOnSight(name: string): Promise<void> {
  const response = await authenticatedFetch(
    `${API_BASE_URL}/api/v1/system/processes/kill-on-sight`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    }
  );
  if (!response.ok) throw new Error("Failed to add to kill-on-sight");
}

export async function removeKillOnSight(name: string): Promise<void> {
  const response = await authenticatedFetch(
    `${API_BASE_URL}/api/v1/system/processes/kill-on-sight/${encodeURIComponent(name)}`,
    { method: "DELETE" }
  );
  if (!response.ok) throw new Error("Failed to remove from kill-on-sight");
}
