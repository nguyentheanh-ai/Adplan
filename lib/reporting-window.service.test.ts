import { describe, expect, it } from "vitest";
import { getMetaFetchWindowsForVietnamDay, getVietnamCalendarWindow, getVietnamHoursForDateRange } from "./reporting-window.service";

describe("reporting window service", () => {
  it("builds a Vietnam calendar day window without using server timezone", () => {
    expect(getVietnamCalendarWindow("2026-06-08")).toEqual({
      startAt: "2026-06-08T00:00:00+07:00",
      endAt: "2026-06-08T23:59:59+07:00",
      timezone: "Asia/Ho_Chi_Minh"
    });
  });

  it("expands Meta fetch windows for an ad account that resets at 14:00 Vietnam time", () => {
    expect(getMetaFetchWindowsForVietnamDay("2026-06-08", 14)).toEqual({
      metaDates: ["2026-06-07", "2026-06-08"],
      dateRange: { startDate: "2026-06-07", endDate: "2026-06-08" },
      timezone: "Asia/Ho_Chi_Minh",
      resetHourVN: 14
    });
  });

  it("enumerates local hours for a Vietnam date range", () => {
    const hours = getVietnamHoursForDateRange({ startDate: "2026-06-08", endDate: "2026-06-08" });

    expect(hours).toHaveLength(24);
    expect(hours[0]).toMatchObject({
      localDate: "2026-06-08",
      localHour: 0,
      localStartAt: "2026-06-08T00:00:00+07:00",
      localEndAt: "2026-06-08T00:59:59+07:00"
    });
    expect(hours[23]).toMatchObject({
      localDate: "2026-06-08",
      localHour: 23,
      localStartAt: "2026-06-08T23:00:00+07:00",
      localEndAt: "2026-06-08T23:59:59+07:00"
    });
  });
});
