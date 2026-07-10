import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyDefaultAdAccount,
  applyDefaultPage,
  getDefaultAdAccountId,
  getDefaultPageId,
  setDefaultAdAccountId,
  setDefaultPageId
} from "./default-account";

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
}

describe("default account and page selection", () => {
  beforeEach(() => {
    vi.stubGlobal("window", { localStorage: new MemoryStorage() });
  });

  it("persists the selected ad account", () => {
    setDefaultAdAccountId("act_123");

    expect(getDefaultAdAccountId()).toBe("act_123");
  });

  it("persists the selected Page", () => {
    setDefaultPageId("page_1");

    expect(getDefaultPageId()).toBe("page_1");
  });

  it("uses a saved ad account only when it still exists", () => {
    setDefaultAdAccountId("act_missing");

    const selected = applyDefaultAdAccount([{ id: "act_1" }, { id: "act_2" }]);

    expect(selected).toBe("act_1");
    expect(getDefaultAdAccountId()).toBe("act_1");
  });

  it("uses a saved Page only when it still exists", () => {
    setDefaultPageId("page_2");

    const selected = applyDefaultPage([{ id: "page_1" }, { id: "page_2" }]);

    expect(selected).toBe("page_2");
    expect(getDefaultPageId()).toBe("page_2");
  });
});
