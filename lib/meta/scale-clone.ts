import { cloneMetaAdWithFallback, type MetaAdCloneInput, type MetaAdCloneResult, type MetaErrorDetails } from "./ad-clone";
import { getMetaAds, metaErrorResponse } from "./facebook";
import type { MetaAd } from "./types";

type CloneAdFunction = (input: MetaAdCloneInput) => Promise<MetaAdCloneResult>;
type ListAdsFunction = (adAccountId: string, accessToken: string, adsetId?: string) => Promise<MetaAd[]>;

export type ScaleCloneAdResult = {
  id?: string;
  source_ad_id: string;
  method?: MetaAdCloneResult["method"];
  error?: string;
};

export type CloneAdsForAdsetParams = {
  adAccountId: string;
  sourceAdsetId: string;
  targetAdsetId: string;
  accessToken: string;
  appId: string;
  appSecret: string;
  listAds?: ListAdsFunction;
  cloneAd?: CloneAdFunction;
};

function formatMetaCloneError(error?: MetaErrorDetails) {
  if (!error) return "";
  const parts = [
    error.error_user_title,
    error.error_user_msg,
    error.message,
    error.code ? `code ${error.code}` : "",
    error.error_subcode ? `subcode ${error.error_subcode}` : "",
    error.fbtrace_id ? `fbtrace_id ${error.fbtrace_id}` : ""
  ].filter(Boolean);
  return parts.join(" | ");
}

function explainCloneFailure(result: MetaAdCloneResult) {
  const failedStep = result.diagnostics.steps.find((step) => step.status === "fail");
  const metaError = formatMetaCloneError(result.fallbackError) || formatMetaCloneError(result.metaError);
  return [
    failedStep?.message,
    metaError,
    result.calledEndpoints.length ? `Endpoint đã thử: ${result.calledEndpoints.join(", ")}` : ""
  ]
    .filter(Boolean)
    .join(" | ") || "Không nhân bản được quảng cáo nguồn qua Meta /copies hoặc fallback.";
}

export async function cloneAdsForAdsetWithDiagnostics({
  adAccountId,
  sourceAdsetId,
  targetAdsetId,
  accessToken,
  appId,
  appSecret,
  listAds = getMetaAds,
  cloneAd = cloneMetaAdWithFallback
}: CloneAdsForAdsetParams): Promise<ScaleCloneAdResult[]> {
  let sourceAds: MetaAd[];
  try {
    sourceAds = await listAds(adAccountId, accessToken, sourceAdsetId);
  } catch (error) {
    const response = metaErrorResponse(error);
    return [
      {
        source_ad_id: "unknown",
        error:
          response.body.error ||
          "Không đọc được quảng cáo nguồn. Có thể thiếu ads_read/pages_read_engagement hoặc không có quyền với Page."
      }
    ];
  }

  if (!sourceAds.length) {
    return [
      {
        source_ad_id: "none",
        error: "Nhóm quảng cáo nguồn không có quảng cáo để nhân bản hoặc token chưa đọc được danh sách quảng cáo."
      }
    ];
  }

  const results: ScaleCloneAdResult[] = [];
  for (const sourceAd of sourceAds) {
    if (!sourceAd.id) {
      results.push({
        source_ad_id: "unknown",
        error: "Meta không trả về ad_id hợp lệ cho một quảng cáo nguồn."
      });
      continue;
    }

    try {
      const cloneResult = await cloneAd({
        accessToken,
        appId,
        appSecret,
        adAccountId,
        sourceAdId: sourceAd.id,
        targetAdSetId: targetAdsetId
      });

      if (cloneResult.ok && cloneResult.copiedAdId) {
        results.push({
          id: cloneResult.copiedAdId,
          source_ad_id: sourceAd.id,
          method: cloneResult.method
        });
      } else {
        results.push({
          source_ad_id: sourceAd.id,
          error: explainCloneFailure(cloneResult)
        });
      }
    } catch (error) {
      const response = metaErrorResponse(error);
      results.push({
        source_ad_id: sourceAd.id,
        error: response.body.error || "Meta từ chối nhân bản quảng cáo nguồn."
      });
    }
  }

  return results;
}
