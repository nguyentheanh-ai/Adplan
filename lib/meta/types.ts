export type AdAccount = {
  id: string;
  account_id?: string;
  name?: string;
  account_status?: number;
  currency?: string;
  timezone_name?: string;
  business_name?: string;
};

export type Campaign = {
  id: string;
  name: string;
  status?: string;
  objective?: string;
  created_time?: string;
};

export type DateRange = {
  startDate: string;
  endDate: string;
};

export type CampaignInsight = {
  campaign_id?: string;
  campaign_name?: string;
  objective?: string;
  spend?: string;
  impressions?: string;
  reach?: string;
  frequency?: string;
  cpm?: string;
  ctr?: string;
  cpc?: string;
  clicks?: string;
  actions?: Array<{ action_type: string; value: string }>;
  cost_per_action_type?: Array<{ action_type: string; value: string }>;
  purchase_roas?: Array<{ action_type: string; value: string }>;
  website_purchase_roas?: Array<{ action_type: string; value: string }>;
  action_values?: Array<{ action_type: string; value: string }>;
  date_start?: string;
  date_stop?: string;
};

export type DailyInsight = {
  date_start: string;
  date_stop?: string;
  spend?: string;
  impressions?: string;
  reach?: string;
  ctr?: string;
  cpc?: string;
  cpm?: string;
  clicks?: string;
};

export type BreakdownType = "age" | "gender" | "placement";

export type BreakdownRow = CampaignInsight & {
  age?: string;
  gender?: string;
  publisher_platform?: string;
  platform_position?: string;
};

export type ReportSummary = {
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  averageCtr: number;
  averageCpc: number;
  averageCpm: number;
  totalResults: number;
  costPerResult: number;
  roas: number | null;
  conversionValue: number;
};

export type NormalizedCampaignPerformance = {
  campaignId: string;
  campaignName: string;
  status?: string;
  objective?: string;
  spend: number;
  impressions: number;
  reach: number;
  frequency: number;
  cpm: number;
  ctr: number;
  cpc: number;
  clicks: number;
  leads: number;
  messages: number;
  purchases: number;
  results: number;
  costPerResult: number;
  roas: number | null;
  conversionValue: number;
};

export type AdsReport = {
  account: AdAccount | null;
  dateRange: DateRange;
  summary: ReportSummary;
  campaigns: NormalizedCampaignPerformance[];
  daily: DailyInsight[];
  insights: string[];
};

export type AudienceSuggestion = {
  id: string;
  name: string;
  audience_size?: number;
  source: "facebook" | "internal";
};

export type CreativeAsset = {
  id: string;
  type: "image" | "video" | "placeholder";
  name: string;
  url?: string;
};

export type CampaignBuilderInput = {
  productName: string;
  industry: string;
  objective: "Tin nhắn" | "Lead" | "Traffic" | "Engagement" | "Sales";
  dailyBudget: string;
  startDate: string;
  endDate?: string;
  runContinuously: boolean;
  fanpage: string;
  website?: string;
  location: string;
  targetCustomer: string;
  offer: string;
  notes?: string;
  mediaNote?: string;
};

export type CampaignDraft = {
  campaign: {
    name: string;
    objective: string;
    budget: string;
    schedule: string;
    status: "PAUSED";
  };
  adSet: {
    name: string;
    ageRange: string;
    gender: string;
    location: string;
    interests: AudienceSuggestion[];
    behaviors: string[];
    placement: string;
    optimizationGoal: string;
    billingEvent: string;
  };
  ads: {
    name: string;
    fanpage: string;
    media: CreativeAsset;
    primaryText: string;
    headline: string;
    description: string;
    cta: string;
    url?: string;
  };
  naming: {
    campaignNameFormat: string;
    adsetNameFormat: string;
    adNameFormat: string;
  };
};
