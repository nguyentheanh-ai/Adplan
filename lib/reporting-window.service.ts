import { DateTime } from "luxon";
import type { RevenueReportDateRange } from "@/lib/revenue-report";

export const vietnamReportTimezone = "Asia/Ho_Chi_Minh";

export type VietnamCalendarWindow = {
  startAt: string;
  endAt: string;
  timezone: typeof vietnamReportTimezone;
};

export type MetaFetchWindow = {
  metaDates: string[];
  dateRange: RevenueReportDateRange;
  timezone: typeof vietnamReportTimezone;
  resetHourVN: number;
};

export type VietnamHourWindow = {
  localDate: string;
  localHour: number;
  localStartAt: string;
  localEndAt: string;
};

function toVietnamDate(date: string) {
  return DateTime.fromISO(date, { zone: vietnamReportTimezone });
}

function formatWithOffset(date: DateTime) {
  return date.toISO({ suppressMilliseconds: true, includeOffset: true });
}

export function getVietnamCalendarWindow(date: string): VietnamCalendarWindow {
  const local = toVietnamDate(date);
  return {
    startAt: formatWithOffset(local.startOf("day")) ?? `${date}T00:00:00+07:00`,
    endAt: formatWithOffset(local.endOf("day").set({ millisecond: 0 })) ?? `${date}T23:59:59+07:00`,
    timezone: vietnamReportTimezone
  };
}

export function getMetaFetchWindowsForVietnamDay(date: string, resetHourVN: number): MetaFetchWindow {
  const local = toVietnamDate(date);
  const previousMetaDate = local.minus({ days: 1 }).toISODate() ?? date;
  const currentMetaDate = local.toISODate() ?? date;

  return {
    metaDates: [previousMetaDate, currentMetaDate],
    dateRange: {
      startDate: previousMetaDate,
      endDate: currentMetaDate
    },
    timezone: vietnamReportTimezone,
    resetHourVN
  };
}

export function getExpandedMetaDateRangeForVietnamRange(range: RevenueReportDateRange, resetHourVN: number): MetaFetchWindow {
  const start = getMetaFetchWindowsForVietnamDay(range.startDate, resetHourVN);
  const end = getMetaFetchWindowsForVietnamDay(range.endDate, resetHourVN);
  const metaDates = Array.from(new Set([...start.metaDates, ...end.metaDates])).sort();

  return {
    metaDates,
    dateRange: {
      startDate: metaDates[0] ?? range.startDate,
      endDate: metaDates[metaDates.length - 1] ?? range.endDate
    },
    timezone: vietnamReportTimezone,
    resetHourVN
  };
}

export function getVietnamHoursForDateRange(range: RevenueReportDateRange): VietnamHourWindow[] {
  const output: VietnamHourWindow[] = [];
  let cursor = toVietnamDate(range.startDate).startOf("day");
  const end = toVietnamDate(range.endDate).endOf("day");

  while (cursor <= end) {
    const hourEnd = cursor.endOf("hour").set({ millisecond: 0 });
    output.push({
      localDate: cursor.toISODate() ?? "",
      localHour: cursor.hour,
      localStartAt: formatWithOffset(cursor) ?? "",
      localEndAt: formatWithOffset(hourEnd) ?? ""
    });
    cursor = cursor.plus({ hours: 1 });
  }

  return output;
}

export function metaDateHourToVietnamHour({ metaDate, metaHour, resetHourVN }: { metaDate: string; metaHour: number; resetHourVN: number }) {
  const localStart = toVietnamDate(metaDate).set({ hour: resetHourVN, minute: 0, second: 0, millisecond: 0 }).plus({ hours: metaHour });
  const localEnd = localStart.endOf("hour").set({ millisecond: 0 });

  return {
    localDate: localStart.toISODate() ?? "",
    localHour: localStart.hour,
    localStartAt: formatWithOffset(localStart) ?? "",
    localEndAt: formatWithOffset(localEnd) ?? ""
  };
}
