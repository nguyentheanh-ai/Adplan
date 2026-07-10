import type { AccountOverviewRow, CreativePerformance, DateRange } from "@/lib/meta/types";

export type AdsPostRankLabel = "winner" | "promising" | "average" | "weak" | "risky";

export type AdsPostScore = {
  total: number;
  efficiency: number;
  engagement: number;
  conversion: number;
  creative: number;
  stability: number;
  risk: number;
};

export type AdsPostBenchmark = {
  avgCtr: number;
  avgCpc: number;
  avgCpm: number;
  avgConversionCost: number;
  avgFrequency: number;
  avgSpend: number;
  minSpendToRank: number;
  minImpressionsToRank: number;
};

export type RankedAdsPost = CreativePerformance & {
  rank: number;
  rankLabel: AdsPostRankLabel;
  score: AdsPostScore;
  conversionCount: number;
  conversionCost: number | null;
  scoreReasons: string[];
  recommendations: string[];
  dataQuality: "strong" | "medium" | "thin";
};

export type AdsPostAnalysis = {
  post: RankedAdsPost;
  benchmark: AdsPostBenchmark;
  diagnosis: string[];
  strengths: string[];
  weaknesses: string[];
  recommendedActions: string[];
  creativeNotes: {
    hook: string;
    headline: string;
    cta: string;
    messageLength: number;
    hasLandingUrl: boolean;
  };
};

export type AdsPostImprovement = {
  title: string;
  primaryText: string;
  headline: string;
  cta: string;
  rationale: string;
};

export type AdsPostRankingResponse = {
  data: {
    accounts: AccountOverviewRow[];
    selectedAccount: AccountOverviewRow | null;
    dateRange: DateRange;
    benchmark: AdsPostBenchmark;
    posts: RankedAdsPost[];
    warning?: string;
  };
};
