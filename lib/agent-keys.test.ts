import { describe, expect, it } from "vitest";
import {
  evaluateAgentKeyAccess,
  generateAgentIngestKeyValue,
  hashAgentIngestKey,
  normalizeAgentKeyPermissions,
  type AgentKeyAccessRule
} from "./agent-keys-shared";

describe("agent ingest key helpers", () => {
  it("generates a raw key with the expected production prefix", () => {
    const value = generateAgentIngestKeyValue();

    expect(value.startsWith("aik_live_")).toBe(true);
    expect(value.length).toBeGreaterThan(24);
  });

  it("hashes the same key deterministically", () => {
    const key = "aik_live_demo_key";

    expect(hashAgentIngestKey(key)).toBe(hashAgentIngestKey(key));
    expect(hashAgentIngestKey(key)).toMatch(/^[a-f0-9]{64}$/);
  });

  it("normalizes default permissions as draft-only", () => {
    expect(normalizeAgentKeyPermissions({})).toEqual({
      canIngestDraft: true,
      canPublishDirect: false,
      canSchedule: false
    });
  });
});

describe("evaluateAgentKeyAccess", () => {
  const baseRule: AgentKeyAccessRule = {
    revokedAt: null,
    expiresAt: null,
    permissions: {
      canIngestDraft: true,
      canPublishDirect: true,
      canSchedule: true
    },
    allowedPageIds: ["page_a", "page_b"],
    dailyPostLimit: 2,
    allowedWindow: {
      startHour: 8,
      endHour: 20
    }
  };

  it("allows draft ingest on an approved page", () => {
    expect(
      evaluateAgentKeyAccess(baseRule, {
        action: "draft_ingest",
        pageId: "page_a",
        now: "2026-05-22T03:00:00.000Z",
        dailyUsageCount: 0
      })
    ).toEqual({ ok: true });
  });

  it("blocks direct publish when the key cannot publish", () => {
    expect(
      evaluateAgentKeyAccess(
        {
          ...baseRule,
          permissions: {
            ...baseRule.permissions,
            canPublishDirect: false
          }
        },
        {
          action: "direct_publish",
          pageId: "page_a",
          now: "2026-05-22T03:00:00.000Z",
          dailyUsageCount: 0
        }
      )
    ).toEqual({
      ok: false,
      reason: "Key này chỉ được nạp nháp chờ duyệt, chưa được phép đăng trực tiếp."
    });
  });

  it("blocks scheduled publish when the key has no schedule permission", () => {
    expect(
      evaluateAgentKeyAccess(
        {
          ...baseRule,
          permissions: {
            ...baseRule.permissions,
            canSchedule: false
          }
        },
        {
          action: "direct_publish",
          pageId: "page_a",
          scheduledPublishTime: "2026-05-22T05:00:00.000Z",
          now: "2026-05-22T03:00:00.000Z",
          dailyUsageCount: 0
        }
      )
    ).toEqual({
      ok: false,
      reason: "Key này chưa được phép lên lịch đăng bài."
    });
  });

  it("blocks pages outside the allow-list", () => {
    expect(
      evaluateAgentKeyAccess(baseRule, {
        action: "direct_publish",
        pageId: "page_c",
        now: "2026-05-22T03:00:00.000Z",
        dailyUsageCount: 0
      })
    ).toEqual({
      ok: false,
      reason: "Key này không được phép thao tác với Fanpage đã chọn."
    });
  });

  it("blocks usage outside the allowed hours", () => {
    expect(
      evaluateAgentKeyAccess(baseRule, {
        action: "direct_publish",
        pageId: "page_a",
        now: "2026-05-22T22:00:00.000Z",
        dailyUsageCount: 0
      })
    ).toEqual({
      ok: false,
      reason: "Key này chỉ được phép đăng trong khung giờ đã cấu hình."
    });
  });

  it("blocks direct publish once the daily limit is reached", () => {
    expect(
      evaluateAgentKeyAccess(baseRule, {
        action: "direct_publish",
        pageId: "page_a",
        now: "2026-05-22T03:00:00.000Z",
        dailyUsageCount: 2
      })
    ).toEqual({
      ok: false,
      reason: "Key này đã chạm giới hạn số bài trong ngày."
    });
  });

  it("blocks revoked or expired keys", () => {
    expect(
      evaluateAgentKeyAccess(
        {
          ...baseRule,
          revokedAt: "2026-05-20T00:00:00.000Z"
        },
        {
          action: "draft_ingest",
          pageId: "page_a",
          now: "2026-05-22T03:00:00.000Z",
          dailyUsageCount: 0
        }
      )
    ).toEqual({
      ok: false,
      reason: "Key này đã bị thu hồi."
    });

    expect(
      evaluateAgentKeyAccess(
        {
          ...baseRule,
          expiresAt: "2026-05-21T00:00:00.000Z"
        },
        {
          action: "draft_ingest",
          pageId: "page_a",
          now: "2026-05-22T03:00:00.000Z",
          dailyUsageCount: 0
        }
      )
    ).toEqual({
      ok: false,
      reason: "Key này đã hết hạn."
    });
  });
});
