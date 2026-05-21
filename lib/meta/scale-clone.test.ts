import { describe, expect, it, vi } from "vitest";
import { cloneAdsForAdsetWithDiagnostics } from "./scale-clone";
import type { MetaAdCloneResult } from "./ad-clone";
import type { MetaAd } from "./types";

describe("scale ad cloning", () => {
  it("clones each source ad through the Meta ad clone diagnostics service", async () => {
    const sourceAds: MetaAd[] = [
      {
        id: "ad_1",
        name: "Winner ad",
        adset_id: "source_adset",
        campaign_id: "campaign_1",
        creative: { id: "creative_1" }
      }
    ];
    const cloneAd = vi.fn(async (): Promise<MetaAdCloneResult> => ({
      ok: true,
      method: "copies",
      copiedAdId: "copied_ad_1",
      diagnostics: { ok: true, steps: [], sourceAd: sourceAds[0] },
      calledEndpoints: ["POST /ad_1/copies"]
    }));

    const result = await cloneAdsForAdsetWithDiagnostics({
      adAccountId: "act_123",
      sourceAdsetId: "source_adset",
      targetAdsetId: "target_adset",
      accessToken: "token",
      appId: "app",
      appSecret: "secret",
      listAds: async () => sourceAds,
      cloneAd
    });

    expect(cloneAd).toHaveBeenCalledWith({
      accessToken: "token",
      appId: "app",
      appSecret: "secret",
      adAccountId: "act_123",
      sourceAdId: "ad_1",
      targetAdSetId: "target_adset"
    });
    expect(result).toEqual([
      {
        id: "copied_ad_1",
        source_ad_id: "ad_1",
        method: "copies"
      }
    ]);
  });

  it("returns the precise Meta clone error instead of hiding invalid parameters", async () => {
    const sourceAds: MetaAd[] = [
      {
        id: "ad_2",
        name: "Creative issue",
        adset_id: "source_adset",
        campaign_id: "campaign_1",
        creative: { id: "creative_2" }
      }
    ];
    const cloneAd = vi.fn(async (): Promise<MetaAdCloneResult> => ({
      ok: false,
      diagnostics: {
        ok: false,
        steps: [
          {
            key: "clone_result",
            label: "Clone",
            status: "fail",
            message: "Meta báo field adset_id không hợp lệ.",
            details: { code: 100, fbtrace_id: "trace_1" }
          }
        ],
        sourceAd: sourceAds[0]
      },
      metaError: {
        message: "Invalid parameter",
        code: 100,
        error_subcode: 1815755,
        fbtrace_id: "trace_1"
      },
      calledEndpoints: ["POST /ad_2/copies"]
    }));

    const result = await cloneAdsForAdsetWithDiagnostics({
      adAccountId: "act_123",
      sourceAdsetId: "source_adset",
      targetAdsetId: "target_adset",
      accessToken: "token",
      appId: "app",
      appSecret: "secret",
      listAds: async () => sourceAds,
      cloneAd
    });

    expect(result[0]).toMatchObject({
      source_ad_id: "ad_2",
      error: expect.stringContaining("Invalid parameter")
    });
    expect(result[0].error).toContain("code 100");
    expect(result[0].error).toContain("fbtrace_id trace_1");
  });
});
