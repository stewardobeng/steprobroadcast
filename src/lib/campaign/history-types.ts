import type { CampaignPart } from "./schema";

export const CAMPAIGN_STATUSES = ["sending", "submitted", "rejected", "unconfirmed", "not_configured"] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

export type CampaignRecord = {
  id: string;
  campaignId: string;
  parts: CampaignPart[];
  status: CampaignStatus;
  responseStatus: number | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
};
