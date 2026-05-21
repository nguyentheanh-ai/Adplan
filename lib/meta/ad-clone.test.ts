import { describe, expect, it, vi } from "vitest";
import { buildAdCopyBody, cloneMetaAdWithFallback, isSourceAdShapeValid, metaAdsCloneDiagnostics } from "./ad-clone";

describe("Meta ads clone diagnostics", () => {
  it("builds a paused direct copy body for the ads copies endpoint", () => {
    const body = buildAdCopyBody({ targetAdSetId: "120_adset" });

    expect(body.get("status_option")).toBe("PAUSED");
    expect(body.get("adset_id")).toBe("120_adset");
    expect(body.has("campaign_id")).toBe(false);
    expect(body.has("creative_id")).toBe(false);
    expect(body.has("post_id")).toBe(false);
  });

  it("rejects a source object that is not shaped like an ad", () => {
    expect(isSourceAdShapeValid({ id: "123", name: "Campaign only" })).toBe(false);
    expect(isSourceAdShapeValid({ id: "ad_1", adset_id: "adset_1", campaign_id: "camp_1", creative: { id: "creative_1" } })).toBe(true);
  });

  it("marks diagnostics failed when source id does not resolve to a valid ad", async () => {
    const graph = vi.fn(async (path: string) => {
      if (path === "debug_token") return { data: { is_valid: true, app_id: "app", user_id: "user", scopes: ["ads_read", "ads_management"] } };
      if (path === "me/adaccounts") return { data: [{ id: "act_123", account_id: "123", name: "Shop", account_status: 1, user_tasks: ["ADVERTISE"] }] };
      if (path === "act_123") return { id: "act_123", name: "Shop", account_status: 1 };
      if (path === "999") return { id: "999", name: "Not an ad" };
      throw new Error(`unexpected path ${path}`);
    });

    const result = await metaAdsCloneDiagnostics({
      accessToken: "token",
      appId: "app",
      appSecret: "secret",
      adAccountId: "act_123",
      sourceAdId: "999",
      graph
    });

    expect(result.ok).toBe(false);
    expect(result.steps.find((step) => step.key === "source_ad")?.status).toBe("fail");
    expect(result.steps.find((step) => step.key === "source_ad")?.message).toContain("không giống một ad_id");
  });
  it("marks diagnostics failed when source ad belongs to another ad account", async () => {
    const graph = vi.fn(async (path: string) => {
      if (path === "debug_token") return { data: { is_valid: true, app_id: "app", user_id: "user", scopes: ["ads_read", "ads_management"] } };
      if (path === "me/adaccounts") return { data: [{ id: "act_123", account_id: "123", name: "Shop", account_status: 1, user_tasks: ["ADVERTISE"] }] };
      if (path === "act_123") return { id: "act_123", name: "Shop", account_status: 1 };
      if (path === "ad_1") return { id: "ad_1", name: "Ad", adset_id: "adset_1", campaign_id: "camp_1", creative: { id: "creative_1" } };
      if (path === "adset_1") return { id: "adset_1", account_id: "999", campaign_id: "camp_1" };
      throw new Error(`unexpected path ${path}`);
    });

    const result = await metaAdsCloneDiagnostics({
      accessToken: "token",
      appId: "app",
      appSecret: "secret",
      adAccountId: "act_123",
      sourceAdId: "ad_1",
      graph
    });

    expect(result.ok).toBe(false);
    expect(result.steps.find((step) => step.key === "source_ad_account_match")?.status).toBe("fail");
  });

  it("passes the source adset_id to the ad copies endpoint when target adset is not selected", async () => {
    const copyBodies: Array<Record<string, unknown>> = [];
    const graph = vi.fn(async (path: string, init?: { method?: string; json?: Record<string, unknown> }) => {
      if (path === "debug_token") return { data: { is_valid: true, app_id: "app", user_id: "user", scopes: ["ads_read", "ads_management"] } };
      if (path === "me/adaccounts") return { data: [{ id: "act_123", account_id: "123", name: "Shop", account_status: 1, user_tasks: ["ADVERTISE"] }] };
      if (path === "act_123") return { id: "act_123", name: "Shop", account_status: 1 };
      if (path === "ad_1") return { id: "ad_1", name: "Ad", adset_id: "adset_1", campaign_id: "camp_1", creative: { id: "creative_1" } };
      if (path === "adset_1") return { id: "adset_1", account_id: "123", campaign_id: "camp_1" };
      if (path === "creative_1") return { id: "creative_1", object_story_id: "page_1_post_1" };
      if (path === "ad_1/copies" && init?.method === "POST" && init.json) {
        copyBodies.push(init.json);
        return { copied_ad_id: "copied_ad_1" };
      }
      if (path === "copied_ad_1") return { id: "copied_ad_1", adset_id: "adset_1", campaign_id: "camp_1", creative: { id: "creative_1" }, status: "PAUSED" };
      throw new Error(`unexpected path ${path}`);
    });

    const result = await cloneMetaAdWithFallback({
      accessToken: "token",
      appId: "app",
      appSecret: "secret",
      adAccountId: "act_123",
      sourceAdId: "ad_1",
      graph
    });

    expect(result.ok).toBe(true);
    expect(copyBodies[0]).toEqual({ adset_id: "adset_1", status_option: "PAUSED" });
  });

  it("sends the direct ad copy request as JSON with adset_id and PAUSED status first", async () => {
    const copyJsonBodies: Array<Record<string, unknown>> = [];
    const graph = vi.fn(async (path: string, init?: { method?: string; json?: Record<string, unknown> }) => {
      if (path === "debug_token") return { data: { is_valid: true, app_id: "app", user_id: "user", scopes: ["ads_read", "ads_management"] } };
      if (path === "me/adaccounts") return { data: [{ id: "act_123", account_id: "123", name: "Shop", account_status: 1, user_tasks: ["ADVERTISE"] }] };
      if (path === "act_123") return { id: "act_123", name: "Shop", account_status: 1 };
      if (path === "ad_1") return { id: "ad_1", name: "Ad", adset_id: "adset_1", campaign_id: "camp_1", creative: { id: "creative_1" } };
      if (path === "adset_1") return { id: "adset_1", account_id: "123", campaign_id: "camp_1" };
      if (path === "creative_1") return { id: "creative_1", object_story_id: "page_1_post_1" };
      if (path === "target_adset") return { id: "target_adset", account_id: "123", campaign_id: "camp_2" };
      if (path === "ad_1/copies" && init?.method === "POST" && init.json) {
        copyJsonBodies.push(init.json);
        return { copied_ad_id: "copied_ad_1" };
      }
      if (path === "copied_ad_1") return { id: "copied_ad_1", adset_id: "target_adset", campaign_id: "camp_2", creative: { id: "creative_1" }, status: "PAUSED" };
      throw new Error(`unexpected path ${path}`);
    });

    const result = await cloneMetaAdWithFallback({
      accessToken: "token",
      appId: "app",
      appSecret: "secret",
      adAccountId: "act_123",
      sourceAdId: "ad_1",
      targetAdSetId: "target_adset",
      graph
    });

    expect(result.ok).toBe(true);
    expect(copyJsonBodies[0]).toEqual({
      adset_id: "target_adset",
      status_option: "PAUSED"
    });
  });

  it("falls back to form encoding when Meta rejects the JSON copy body as invalid parameter", async () => {
    const formBodies: URLSearchParams[] = [];
    const graph = vi.fn(async (path: string, init?: { method?: string; json?: Record<string, unknown>; body?: URLSearchParams }) => {
      if (path === "debug_token") return { data: { is_valid: true, app_id: "app", user_id: "user", scopes: ["ads_read", "ads_management"] } };
      if (path === "me/adaccounts") return { data: [{ id: "act_123", account_id: "123", name: "Shop", account_status: 1, user_tasks: ["ADVERTISE"] }] };
      if (path === "act_123") return { id: "act_123", name: "Shop", account_status: 1 };
      if (path === "ad_1") return { id: "ad_1", name: "Ad", adset_id: "adset_1", campaign_id: "camp_1", creative: { id: "creative_1" } };
      if (path === "adset_1") return { id: "adset_1", account_id: "123", campaign_id: "camp_1" };
      if (path === "creative_1") return { id: "creative_1", object_story_id: "page_1_post_1" };
      if (path === "target_adset") return { id: "target_adset", account_id: "123", campaign_id: "camp_2" };
      if (path === "ad_1/copies" && init?.json) {
        throw { error: { message: "Invalid parameter", code: 100, fbtrace_id: "trace_json" } };
      }
      if (path === "ad_1/copies" && init?.body instanceof URLSearchParams) {
        formBodies.push(init.body);
        return { copied_ad_id: "copied_ad_1" };
      }
      if (path === "copied_ad_1") return { id: "copied_ad_1", adset_id: "target_adset", campaign_id: "camp_2", creative: { id: "creative_1" }, status: "PAUSED" };
      throw new Error(`unexpected path ${path}`);
    });

    const result = await cloneMetaAdWithFallback({
      accessToken: "token",
      appId: "app",
      appSecret: "secret",
      adAccountId: "act_123",
      sourceAdId: "ad_1",
      targetAdSetId: "target_adset",
      graph
    });

    expect(result.ok).toBe(true);
    expect(formBodies[0]?.get("adset_id")).toBe("target_adset");
    expect(formBodies[0]?.get("status_option")).toBe("PAUSED");
  });
});
