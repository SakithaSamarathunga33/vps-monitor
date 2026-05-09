import { authenticatedFetch } from "@/lib/api-client";
import { API_BASE_URL } from "@/types/api";

export async function killProcess(pid: number): Promise<void> {
  const response = await authenticatedFetch(
    `${API_BASE_URL}/api/v1/system/processes/${pid}/kill`,
    { method: "POST" }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Failed to kill process");
  }
}
