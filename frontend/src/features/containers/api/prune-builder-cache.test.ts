import { authenticatedFetch } from "@/lib/api-client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { pruneBuilderCache } from "./prune-builder-cache";

vi.mock("@/lib/api-client", () => ({
  authenticatedFetch: vi.fn(),
}));

const mockFetch = authenticatedFetch as ReturnType<typeof vi.fn>;

describe("pruneBuilderCache", () => {
  afterEach(() => vi.clearAllMocks());

  it("returns prune result on success", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          results: [
            {
              host: "local",
              caches_deleted: ["cache-1"],
              space_reclaimed: 1024,
            },
          ],
          space_reclaimed: 1024,
        }),
    } as unknown as Response);

    const result = await pruneBuilderCache();

    expect(result.space_reclaimed).toBe(1024);
    expect(result.results[0].host).toBe("local");
  });

  it("throws on non-ok response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: () => Promise.resolve("docker client unavailable"),
    } as unknown as Response);

    await expect(pruneBuilderCache()).rejects.toThrow(
      "docker client unavailable"
    );
  });
});
