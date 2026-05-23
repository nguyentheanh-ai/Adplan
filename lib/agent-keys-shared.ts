import crypto from "crypto";

export type AgentKeyPermissions = {
  canIngestDraft: boolean;
  canPublishDirect: boolean;
  canSchedule: boolean;
};

export type AgentKeyAllowedWindow = {
  startHour?: number | null;
  endHour?: number | null;
};

export type AgentKeyAccessRule = {
  revokedAt?: string | null;
  expiresAt?: string | null;
  permissions: AgentKeyPermissions;
  allowedPageIds?: string[] | null;
  dailyPostLimit?: number | null;
  allowedWindow?: AgentKeyAllowedWindow | null;
};

export type AgentKeyAction = "draft_ingest" | "direct_publish";

export function generateAgentIngestKeyValue() {
  return `aik_live_${crypto.randomBytes(24).toString("base64url")}`;
}

export function hashAgentIngestKey(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function normalizeAgentKeyPermissions(input: Partial<AgentKeyPermissions> | null | undefined): AgentKeyPermissions {
  return {
    canIngestDraft: input?.canIngestDraft ?? true,
    canPublishDirect: input?.canPublishDirect ?? false,
    canSchedule: input?.canSchedule ?? false
  };
}

export function evaluateAgentKeyAccess(
  rule: AgentKeyAccessRule,
  input: {
    action: AgentKeyAction;
    pageId?: string | null;
    scheduledPublishTime?: string | null;
    now?: string | Date;
    dailyUsageCount?: number;
  }
): { ok: true } | { ok: false; reason: string } {
  const now = toDate(input.now);
  const permissions = normalizeAgentKeyPermissions(rule.permissions);

  if (rule.revokedAt) return { ok: false, reason: "Key này đã bị thu hồi." };
  if (rule.expiresAt && new Date(rule.expiresAt).getTime() <= now.getTime()) {
    return { ok: false, reason: "Key này đã hết hạn." };
  }

  if (input.action === "direct_publish" && !permissions.canPublishDirect) {
    return { ok: false, reason: "Key này chỉ được nạp nháp chờ duyệt, chưa được phép đăng trực tiếp." };
  }

  if (input.scheduledPublishTime && !permissions.canSchedule) {
    return { ok: false, reason: "Key này chưa được phép lên lịch đăng bài." };
  }

  const allowedPageIds = (rule.allowedPageIds ?? []).filter(Boolean);
  if (input.pageId && allowedPageIds.length > 0 && !allowedPageIds.includes(input.pageId)) {
    return { ok: false, reason: "Key này không được phép thao tác với Fanpage đã chọn." };
  }

  const targetTime = input.scheduledPublishTime ? new Date(input.scheduledPublishTime) : now;
  const { startHour, endHour } = rule.allowedWindow ?? {};
  if (typeof startHour === "number" || typeof endHour === "number") {
    const hour = Number(
      new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit",
        hour12: false,
        timeZone: "Asia/Ho_Chi_Minh"
      }).format(targetTime)
    );

    if (isOutsideWindow(hour, startHour, endHour)) {
      return { ok: false, reason: "Key này chỉ được phép đăng trong khung giờ đã cấu hình." };
    }
  }

  if (input.action === "direct_publish" && rule.dailyPostLimit && (input.dailyUsageCount ?? 0) >= rule.dailyPostLimit) {
    return { ok: false, reason: "Key này đã chạm giới hạn số bài trong ngày." };
  }

  return { ok: true };
}

function toDate(value?: string | Date) {
  if (value instanceof Date) return value;
  return value ? new Date(value) : new Date();
}

function isOutsideWindow(hour: number, startHour?: number | null, endHour?: number | null) {
  if (typeof startHour !== "number" || typeof endHour !== "number") return false;
  if (startHour === endHour) return false;
  if (startHour < endHour) return hour < startHour || hour >= endHour;
  return hour < startHour && hour >= endHour;
}
