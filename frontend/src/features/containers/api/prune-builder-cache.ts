import { authenticatedFetch } from "@/lib/api-client";
import { API_BASE_URL } from "@/types/api";

export interface BuilderPruneHostResult {
  host: string;
  caches_deleted: string[];
  space_reclaimed: number;
  error?: string;
}

export interface BuilderPruneResult {
  results: BuilderPruneHostResult[];
  space_reclaimed: number;
}

export async function pruneBuilderCache(): Promise<BuilderPruneResult> {
  const response = await authenticatedFetch(
    `${API_BASE_URL}/api/v1/system/docker-builder-prune`,
    { method: "POST" }
  );

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with status ${response.status}`);
  }

  return response.json();
}
