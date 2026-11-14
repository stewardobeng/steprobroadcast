import type { CampaignRecord, CampaignStatus } from "./history-types";

export type CampaignStatusFilter = "all" | CampaignStatus;

export function filterCampaigns(campaigns: CampaignRecord[], query: string, status: CampaignStatusFilter) {
  const q = query.trim().toLowerCase();
  return campaigns.filter((campaign) => {
    if (status !== "all" && campaign.status !== status) return false;
    if (!q) return true;
    const content = campaign.parts.map((part) => ("text" in part ? part.text : "")).join(" ");
    return `${campaign.campaignId} ${content}`.toLowerCase().includes(q);
  });
}

export function getCampaignStats(campaigns: CampaignRecord[], now = new Date()) {
  const weekAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
  return {
    total: campaigns.length,
    received: campaigns.filter((campaign) => campaign.status === "submitted").length,
    thisWeek: campaigns.filter((campaign) => new Date(campaign.createdAt).getTime() >= weekAgo).length,
    attention: campaigns.filter((campaign) => ["rejected", "unconfirmed", "not_configured"].includes(campaign.status)).length,
  };
}
