import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCachedJson, getCachedState, setCachedState } from "./client-cache";

class MemoryStorage {
  private readonly data = new Map<string, string>();

  getItem(key: string) {
    return this.data.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.data.set(key, value);
  }

  removeItem(key: string) {
    this.data.delete(key);
  }

  clear() {
    this.data.clear();
  }
}

describe("client cache", () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
    vi.stubGlobal("window", { sessionStorage: storage });
    storage.clear();
  });

  it("returns cached API data on a repeated read without calling fetch again", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { value: 1 } })
      });
    vi.stubGlobal("fetch", fetchMock);

    const first = await getCachedJson<{ data: { value: number } }>("/api/meta/intelligence?account=1");
    const second = await getCachedJson<{ data: { value: number } }>("/api/meta/intelligence?account=1");

    expect(first.data.value).toBe(1);
    expect(second.data.value).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("bypasses cached API data when force is true", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { value: 1 } })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { value: 2 } })
      });
    vi.stubGlobal("fetch", fetchMock);

    await getCachedJson<{ data: { value: number } }>("/api/meta/report?account=1");
    const forced = await getCachedJson<{ data: { value: number } }>("/api/meta/report?account=1", { force: true });

    expect(forced.data.value).toBe(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("persists page state in session storage", () => {
    setCachedState("dashboard", { selectedAccountId: "act_1", rows: [1, 2, 3] });

    expect(getCachedState<{ selectedAccountId: string; rows: number[] }>("dashboard")).toEqual({
      selectedAccountId: "act_1",
      rows: [1, 2, 3]
    });
  });
});
