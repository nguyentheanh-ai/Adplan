export type AdAccount = {
  id: string;
  account_id?: string;
  name?: string;
  account_status?: number;
  currency?: string;
  timezone_name?: string;
  business_name?: string;
  amount_spent?: string;
  balance?: string;
  spend_cap?: string;
  created_time?: string;
  disable_reason?: number;
  business?: {
    id?: string;
    name?: string;
  };
  funding_source_details?: {
    display_string?: string;
    type?: string;
  };
  user_tasks?: string[];
};

export type Campaign = {
  id: string;
  name: string;
  status?: string;
  objective?: string;
  created_time?: string;
  daily_budget?: string;
  lifetime_budget?: string;
  budget_remaining?: string;
  insight?: CampaignInsight | null;
};

export type MetaTargeting = {
  age_min?: number;
  age_max?: number;
  genders?: number[];
  geo_locations?: {
    countries?: string[];
    cities?: Array<{ name?: string; key?: string }>;
    regions?: Array<{ name?: string; key?: string }>;
  };
  flexible_spec?: Array<{
    interests?: Array<{ id?: string; name?: string }>;
    behaviors?: Array<{ id?: string; name?: string }>;
  }>;
  interests?: Array<{ id?: string; name?: string }>;
  behaviors?: Array<{ id?: string; name?: string }>;
};

export type AdSet = {
  id: string;
  name: string;
  campaign_id?: string;
  status?: string;
  daily_budget?: string;
  lifetime_budget?: string;
  optimization_goal?: string;
  optimization_sub_event?: string;
  billing_event?: string;
  bid_amount?: string;
  bid_strategy?: string;
  destination_type?: string;
  promoted_object?: Record<string, unknown>;
  attribution_spec?: Array<Record<string, unknown>>;
  pacing_type?: string[];
  start_time?: string;
  end_time?: string;
  targeting?: MetaTargeting;
  created_time?: string;
};

export type MetaAd = {
  id: string;
  name?: string;
  status?: string;
  campaign_id?: string;
  adset_id?: string;
  creative?: MetaCreative;
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

export type AccountInsight = CampaignInsight;

export type DailyInsight = {
  date_start: string;
  date_stop?: string;
  hourly_stats_aggregated_by_advertiser_time_zone?: string;
  campaign_id?: string;
  campaign_name?: string;
  spend?: string;
  impressions?: string;
  reach?: string;
  ctr?: string;
  cpc?: string;
  cpm?: string;
  clicks?: string;
  actions?: Array<{ action_type: string; value: string }>;
  cost_per_action_type?: Array<{ action_type: string; value: string }>;
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
  engagements: number;
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

export type NormalizedActions = {
  leads: number;
  messages: number;
  engagements: number;
  purchases: number;
  linkClicks: number;
  results: number;
  costPerLead: number;
  costPerMessage: number;
};

export type MetaCreative = {
  id?: string;
  name?: string;
  title?: string;
  body?: string;
  description?: string;
  thumbnail_url?: string;
  image_url?: string;
  video_id?: string;
  call_to_action_type?: string;
  effective_object_story_id?: string;
  object_story_spec?: {
    page_id?: string;
    link_data?: {
      message?: string;
      name?: string;
      description?: string;
      link?: string;
      call_to_action?: {
        type?: string;
        value?: {
          link?: string;
        };
      };
      child_attachments?: Array<{
        link?: string;
        name?: string;
        description?: string;
        picture?: string;
      }>;
    };
    video_data?: {
      message?: string;
      title?: string;
      call_to_action?: {
        type?: string;
        value?: {
          link?: string;
        };
      };
    };
  };
  asset_feed_spec?: unknown;
};

export type MetaAdWithCreative = {
  id: string;
  name?: string;
  status?: string;
  campaign_id?: string;
  campaign?: {
    id?: string;
    name?: string;
    status?: string;
    objective?: string;
  };
  adset_id?: string;
  adset?: {
    id?: string;
    name?: string;
    targeting?: MetaTargeting;
  };
  creative?: MetaCreative;
  insights?: {
    data?: CampaignInsight[];
  };
};

export type CreativePerformance = {
  adId: string;
  adName: string;
  adStatus?: string;
  campaignId?: string;
  campaignName: string;
  adsetId?: string;
  adsetName: string;
  creativeId: string;
  creativeName: string;
  thumbnailUrl?: string;
  body: string;
  headline: string;
  description: string;
  cta: string;
  landingUrl: string;
  postId: string;
  postUrl: string;
  audienceAgeRange: string;
  audienceGender: string;
  audienceLocations: string;
  audienceInterests: string;
  audienceBehaviors: string;
  format: "image" | "video" | "carousel" | "dynamic" | "unknown";
  spend: number;
  impressions: number;
  reach: number;
  frequency: number;
  ctr: number;
  cpc: number;
  cpm: number;
  leads: number;
  messages: number;
  engagements: number;
  cpl: number | null;
  costPerMessage: number | null;
};

export type AccountOverviewRow = AdAccount & {
  periodSpend: number;
  periodLeads: number;
  periodMessages: number;
  dataStatus?: string;
};

export type ComparisonDelta = {
  spend: number;
  leads: number;
  messages: number;
  cpl: number;
};

export type IntelligenceInsight = {
  title: string;
  type: "scale" | "check" | "winner" | "warning" | "neutral";
  reason: string;
};

export type MetaIntelligenceDashboardData = {
  accounts: AccountOverviewRow[];
  selectedAccount: AccountOverviewRow | null;
  report: AdsReport | null;
  creatives: CreativePerformance[];
  creativeAccessWarning?: string;
  comparison: ComparisonDelta;
  intelligence: IntelligenceInsight[];
};

export type AudienceSuggestion = {
  id: string;
  name: string;
  audience_size?: number;
  source: "facebook" | "internal";
};

export type FacebookPage = {
  id: string;
  name: string;
  category?: string;
  access_token?: string;
};

export type FacebookPagePost = {
  id: string;
  message?: string;
  created_time?: string;
  permalink_url?: string;
  like_count?: number;
  comment_count?: number;
  share_count?: number;
  reach?: number;
  impressions?: number;
  engaged_users?: number;
  clicks?: number;
  reactions_by_type?: Record<string, number>;
};

export type CreativeAsset = {
  id: string;
  type: "image" | "video" | "placeholder";
  name: string;
  url?: string;
};

export type CampaignBuilderInput = {
  adAccountId?: string;
  campaignCode?: string;
  pageId?: string;
  pageName?: string;
  postId?: string;
  postMessage?: string;
  productName: string;
  industry: string;
  objective: "Tin nhắn" | "Tương tác" | "Lead" | "Chuyển đổi" | "Traffic" | "Sales";
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
  mediaFiles?: string[];
  structureMode?: "1-1-1" | "1-3-3" | "custom";
  adsetCount?: number;
  adsPerAdset?: number;
  ageRange?: string;
  gender?: string;
};

export type CampaignBuilderMode = "scale_existing" | "new_campaign" | "ab_test";

export type ScaleAction = "clone_adset" | "clone_campaign" | "increase_budget";

export type ScaleCampaignInput = {
  adAccountId: string;
  action: ScaleAction;
  dateRange: DateRange;
  sourceCampaignId?: string;
  sourceAdsetId?: string;
  quantity: number;
  newBudget?: string;
};

export type ABTestVariantDraft = {
  id: string;
  name: string;
  variable: "creative" | "audience" | "placement" | "copy";
  payload: Record<string, unknown>;
};

export type ABTestDraft = {
  name: string;
  hypothesis: string;
  testVariable: "creative" | "audience" | "placement" | "copy";
  budgetSplit: Record<string, number>;
  schedule: DateRange;
  winnerRule: {
    metric: "cpl" | "cost_per_message" | "ctr" | "cpc" | "results";
    minimumSpend: string;
  };
  variants: ABTestVariantDraft[];
};

export type CampaignPlannerDraft = {
  mode: CampaignBuilderMode;
  accountId: string;
  title: string;
  campaignDraft?: CampaignDraft;
  scale?: ScaleCampaignInput;
  abTest?: ABTestDraft;
  warnings: string[];
  metaPayload: Record<string, unknown>;
};

export type CampaignDraft = {
  campaign: {
    code?: string;
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
  adsets: Array<CampaignDraft["adSet"] & { ads: CampaignDraft["ads"][] }>;
  naming: {
    campaignNameFormat: string;
    adsetNameFormat: string;
    adNameFormat: string;
  };
};

export type CampaignValidationItem = {
  key: string;
  label: string;
  ok: boolean;
  note?: string;
};

export type SavedAudience = {
  id: string;
  user_id: string;
  account_id?: string | null;
  code: string;
  name: string;
  payload: {
    ageRange?: string;
    gender?: string;
    locations?: string;
    interests?: string;
    behaviors?: string;
  };
  created_at: string;
  updated_at: string;
};

export type CampaignTemplate = {
  id: string;
  user_id: string;
  account_id?: string | null;
  name: string;
  objective: CampaignBuilderInput["objective"];
  payload: CampaignBuilderInput;
  created_at: string;
  updated_at: string;
};

export type UserRole = "owner" | "manager" | "member" | "viewer";

export type AdminUserPermission = {
  id: string;
  user_id: string;
  facebook_id?: string | null;
  facebook_user_id?: string | null;
  facebook_name?: string | null;
  facebook_email?: string | null;
  role: UserRole | "viewer";
  permissions?: Record<string, unknown>;
  ad_account_ids?: string[] | null;
  page_ids?: string[] | null;
  locked_sections: string[];
  created_at: string;
  updated_at: string;
};

