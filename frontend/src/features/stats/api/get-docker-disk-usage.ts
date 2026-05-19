import { authenticatedFetch } from "@/lib/api-client";
import { API_BASE_URL } from "@/types/api";

export interface DockerDiskUsage {
  imagesBytes: number;
  containersBytes: number;
  volumesBytes: number;
  buildCacheBytes: number;
}

export async function getDockerDiskUsage(): Promise<DockerDiskUsage> {
  const response = await authenticatedFetch(
    `${API_BASE_URL}/api/v1/system/docker-disk-usage`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch Docker disk usage");
  }

  return response.json();
}
