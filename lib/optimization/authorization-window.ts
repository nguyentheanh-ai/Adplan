export type OptimizationWindow = {
  enabled: boolean;
  start: string;
  end: string;
  timezone: string;
};

export type OptimizationWindowStatus = {
  ok: boolean;
  label: string;
  window: OptimizationWindow;
  currentTime?: string;
};

export const defaultOptimizationWindow: OptimizationWindow = {
  enabled: false,
  start: "08:00",
  end: "22:00",
  timezone: "Asia/Ho_Chi_Minh"
};

const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;

function safeTime(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return timePattern.test(trimmed) ? trimmed : fallback;
}

function minutesFromTime(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function getTimeInTimezone(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? 0);
  const label = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  return { minutes: hour * 60 + minute, label };
}

export function normalizeOptimizationWindow(value: unknown): OptimizationWindow {
  if (!value || typeof value !== "object") return { ...defaultOptimizationWindow };
  const raw = value as Partial<OptimizationWindow>;
  return {
    enabled: Boolean(raw.enabled),
    start: safeTime(raw.start, defaultOptimizationWindow.start),
    end: safeTime(raw.end, defaultOptimizationWindow.end),
    timezone: typeof raw.timezone === "string" && raw.timezone.trim() ? raw.timezone.trim() : defaultOptimizationWindow.timezone
  };
}

export function isWithinOptimizationWindow(value: unknown, now = new Date()): OptimizationWindowStatus {
  const window = normalizeOptimizationWindow(value);
  if (!window.enabled) {
    return {
      ok: true,
      label: "Không giới hạn khung giờ tối ưu.",
      window
    };
  }

  try {
    const current = getTimeInTimezone(now, window.timezone);
    const start = minutesFromTime(window.start);
    const end = minutesFromTime(window.end);
    const ok = start <= end
      ? current.minutes >= start && current.minutes <= end
      : current.minutes >= start || current.minutes <= end;

    return {
      ok,
      label: ok
        ? `Đang trong khung giờ tối ưu ${window.start}-${window.end} (${window.timezone}).`
        : `Ngoài khung giờ tối ưu ${window.start}-${window.end} (${window.timezone}).`,
      window,
      currentTime: current.label
    };
  } catch {
    const fallbackWindow = { ...window, timezone: defaultOptimizationWindow.timezone };
    return isWithinOptimizationWindow(fallbackWindow, now);
  }
}
