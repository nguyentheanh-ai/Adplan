import { afterEach, describe, expect, it, vi } from "vitest";
import {
  classifyMetaError,
  cloneMetaObject,
  createAdsetFromSourceOnMeta,
  createPausedMetaCampaign,
  getMetaAdAccounts,
  getMetaManagedPages,
  getMetaCampaigns
} from "./facebook";

const originalFetch = globalThis.fetch;

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  globalThis.fetch = originalFetch;
});

describe("classifyMetaError", () => {
  it("maps invalid token errors to a clear Vietnamese message", () => {
    const error = classifyMetaError(400, {
      error: {
        code: 190,
        message: "Invalid OAuth access token."
      }
    });

    expect(error.userMessage).toContain("Token Meta không hợp lệ");
  });

  it("maps ads_read permission errors", () => {
    const error = classifyMetaError(400, {
      error: {
        code: 10,
        message: "Requires ads_read permission"
      }
    });

    expect(error.userMessage).toContain("ads_read");
  });

  it("maps ads_management permission errors", () => {
    const error = classifyMetaError(400, {
      error: {
        code: 10,
        message: "Requires ads_management permission"
      }
    });

    expect(error.userMessage).toContain("ads_management");
  });

  it("loads ad accounts with the Facebook OAuth provider token without requiring a default ad account id", async () => {
    vi.stubEnv("META_API_VERSION", "v23.0");
    const fetchMock = vi.fn(async () => Response.json({ data: [{ id: "act_123", name: "Shop Test" }] }));
    globalThis.fetch = fetchMock as typeof fetch;

    const accounts = await getMetaAdAccounts("facebook-provider-token");

    expect(accounts).toEqual([{ id: "act_123", name: "Shop Test" }]);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        href: expect.stringContaining("/v23.0/me/adaccounts?")
      }),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer facebook-provider-token"
        })
      })
    );
  });

  it("lists campaigns from the selected ad account id", async () => {
    vi.stubEnv("META_API_VERSION", "v23.0");
    const fetchMock = vi.fn(async () => Response.json({ data: [{ id: "cmp_1", name: "Traffic" }] }));
    globalThis.fetch = fetchMock as typeof fetch;

    await getMetaCampaigns("1295473488844957", "facebook-provider-token");

    expect(fetchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        href: expect.stringContaining("/v23.0/act_1295473488844957/campaigns?")
      }),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer facebook-provider-token"
        })
      })
    );
  });

  it("creates campaigns as paused in the selected ad account", async () => {
    vi.stubEnv("META_API_VERSION", "v23.0");
    const fetchMock = vi.fn(async () => Response.json({ id: "cmp_2" }));
    globalThis.fetch = fetchMock as typeof fetch;

    await createPausedMetaCampaign({
      adAccountId: "act_1295473488844957",
      accessToken: "facebook-provider-token",
      name: "Test campaign",
      objective: "OUTCOME_TRAFFIC"
    });

    const firstCall = fetchMock.mock.calls[0] as unknown as [URL, RequestInit];
    const requestInit = firstCall[1];
    const headers = requestInit.headers as Record<string, string>;
    expect(fetchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        href: expect.stringContaining("/v23.0/act_1295473488844957/campaigns")
      }),
      expect.objectContaining({
        method: "POST"
      })
    );
    expect(headers.Authorization).toBe("Bearer facebook-provider-token");
    expect(String(requestInit.body)).toContain("status=PAUSED");
    expect(String(requestInit.body)).toContain("buying_type=AUCTION");
  });

  it("merges pages from direct account, Business Manager and ad account promoted pages", async () => {
    vi.stubEnv("META_API_VERSION", "v23.0");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          data: [{ id: "page_direct", name: "Direct Page", category: "Education", access_token: "direct_page_token" }]
        })
      )
      .mockResolvedValueOnce(
        Response.json({
          data: [
            {
              id: "business_1",
              owned_pages: {
                data: [{ id: "page_owned", name: "Owned Page", category: "Marketing", access_token: "owned_page_token" }]
              },
              client_pages: {
                data: [{ id: "page_direct", name: "Direct Page Duplicate", access_token: "duplicate_token" }]
              }
            }
          ]
        })
      )
      .mockResolvedValueOnce(
        Response.json({
          data: [{ id: "act_123", name: "Ad Account" }]
        })
      )
      .mockResolvedValueOnce(
        Response.json({
          data: [
            { id: "page_promoted", name: "Promoted Page", category: "Business", access_token: "promoted_page_token" },
            { id: "page_owned", name: "Owned Page Duplicate", access_token: "duplicate_token" }
          ]
        })
      );
    globalThis.fetch = fetchMock as typeof fetch;

    const pages = await getMetaManagedPages("facebook-provider-token");

    expect(pages).toEqual([
      { id: "page_direct", name: "Direct Page", category: "Education", access_token: "direct_page_token" },
      { id: "page_owned", name: "Owned Page", category: "Marketing", access_token: "owned_page_token" },
      { id: "page_promoted", name: "Promoted Page", category: "Business", access_token: "promoted_page_token" }
    ]);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        href: expect.stringContaining("/v23.0/me/accounts?")
      }),
      expect.any(Object)
    );
    expect(fetchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        href: expect.stringContaining("/v23.0/me/businesses?")
      }),
      expect.any(Object)
    );
    expect(fetchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        href: expect.stringContaining("/v23.0/me/adaccounts?")
      }),
      expect.any(Object)
    );
    expect(fetchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        href: expect.stringContaining("/v23.0/act_123/promote_pages?")
      }),
      expect.any(Object)
    );
  });

  it("copies an adset through Meta copies endpoint with campaign_id and deep copy", async () => {
    vi.stubEnv("META_API_VERSION", "v23.0");
    const fetchMock = vi.fn(async () => Response.json({ copied_adset_id: "adset_copy_1" }));
    globalThis.fetch = fetchMock as typeof fetch;

    await cloneMetaObject({
      sourceId: "source_adset_1",
      sourceType: "adset",
      campaignId: "campaign_1",
      quantity: 1,
      accessToken: "facebook-provider-token"
    });

    const firstCall = fetchMock.mock.calls[0] as unknown as [URL, RequestInit];
    expect(firstCall[0].href).toContain("/v23.0/source_adset_1/copies");
    expect(firstCall[1].method).toBe("POST");
    expect(String(firstCall[1].body)).toContain("campaign_id=campaign_1");
    expect(String(firstCall[1].body)).toContain("deep_copy=true");
    expect(String(firstCall[1].body)).toContain("status_option=PAUSED");
  });

  it("rebuilds an adset from source fields required by message and engagement objectives", async () => {
    vi.stubEnv("META_API_VERSION", "v23.0");
    const fetchMock = vi.fn(async () => Response.json({ id: "adset_new_1" }));
    globalThis.fetch = fetchMock as typeof fetch;

    await createAdsetFromSourceOnMeta({
      adAccountId: "act_123",
      campaignId: "campaign_new",
      name: "Adset copy",
      accessToken: "facebook-provider-token",
      sourceAdset: {
        id: "source_adset",
        name: "Source",
        campaign_id: "campaign_old",
        daily_budget: "99000",
        billing_event: "IMPRESSIONS",
        optimization_goal: "CONVERSATIONS",
        destination_type: "MESSENGER",
        promoted_object: { page_id: "page_1" },
        attribution_spec: [{ event_type: "CLICK_THROUGH", window_days: 1 }],
        targeting: { geo_locations: { countries: ["VN"] }, age_min: 25, age_max: 44 }
      }
    });

    const firstCall = fetchMock.mock.calls[0] as unknown as [URL, RequestInit];
    const body = String(firstCall[1].body);
    expect(firstCall[0].href).toContain("/v23.0/act_123/adsets");
    expect(body).toContain("campaign_id=campaign_new");
    expect(body).toContain("optimization_goal=CONVERSATIONS");
    expect(body).toContain("destination_type=MESSENGER");
    expect(body).toContain("promoted_object=");
    expect(decodeURIComponent(body)).toContain('"page_id":"page_1"');
    expect(body).toContain("attribution_spec=");
    expect(body).toContain("status=PAUSED");
  });
});
