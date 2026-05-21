import { describe, expect, it } from "vitest";
import { isWithinOptimizationWindow, normalizeOptimizationWindow } from "./authorization-window";

describe("optimization authorization window", () => {
  it("allows apply when schedule is disabled", () => {
    const status = isWithinOptimizationWindow({ enabled: false });
    expect(status.ok).toBe(true);
    expect(status.window.start).toBe("08:00");
    expect(status.window.end).toBe("22:00");
  });

  it("allows apply inside the configured time window", () => {
    const status = isWithinOptimizationWindow(
      { enabled: true, start: "08:00", end: "22:00", timezone: "Asia/Ho_Chi_Minh" },
      new Date("2026-05-21T03:00:00.000Z")
    );
    expect(status.ok).toBe(true);
    expect(status.currentTime).toBe("10:00");
  });

  it("blocks apply outside the configured time window", () => {
    const status = isWithinOptimizationWindow(
      { enabled: true, start: "08:00", end: "22:00", timezone: "Asia/Ho_Chi_Minh" },
      new Date("2026-05-21T23:00:00.000Z")
    );
    expect(status.ok).toBe(false);
    expect(status.currentTime).toBe("06:00");
  });

  it("supports overnight windows", () => {
    const status = isWithinOptimizationWindow(
      { enabled: true, start: "22:00", end: "06:00", timezone: "Asia/Ho_Chi_Minh" },
      new Date("2026-05-21T16:00:00.000Z")
    );
    expect(status.ok).toBe(true);
    expect(status.currentTime).toBe("23:00");
  });

  it("normalizes unsafe values", () => {
    const window = normalizeOptimizationWindow({ enabled: true, start: "99:99", end: null, timezone: "" });
    expect(window).toEqual({
      enabled: true,
      start: "08:00",
      end: "22:00",
      timezone: "Asia/Ho_Chi_Minh"
    });
  });
});
