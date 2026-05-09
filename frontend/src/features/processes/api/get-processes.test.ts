import { authenticatedFetch } from "@/lib/api-client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getProcesses } from "./get-processes";

vi.mock("@/lib/api-client", () => ({
  authenticatedFetch: vi.fn(),
}));

const mockFetch = authenticatedFetch as ReturnType<typeof vi.fn>;

describe("getProcesses", () => {
  afterEach(() => vi.clearAllMocks());

  it("returns process list on success", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          processes: [{ pid: 1, name: "init", cpu_percent: 0.5 }],
        }),
    } as unknown as Response);

    const result = await getProcesses();

    expect(result.processes).toHaveLength(1);
    expect(result.processes[0].pid).toBe(1);
    expect(result.processes[0].name).toBe("init");
    expect(result.processes[0].cpu_percent).toBe(0.5);
  });

  it("throws on non-ok response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
    } as unknown as Response);

    await expect(getProcesses()).rejects.toThrow("Failed to fetch processes");
  });
});
