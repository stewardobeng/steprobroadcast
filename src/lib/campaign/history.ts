import { queryOptions } from "@tanstack/react-query";
import { listCampaigns } from "./history.functions";
import type { CampaignStatus } from "./history-types";

export type { CampaignRecord, CampaignStatus } from "./history-types";
export { CAMPAIGN_STATUSES } from "./history-types";

export const campaignsQueryOptions = queryOptions({
  queryKey: ["campaigns"],
  queryFn: () => listCampaigns(),
});

export const STATUS_META: Record<CampaignStatus, { label: string; className: string }> = {
  submitted: { label: "Received", className: "border-success/20 bg-success/10 text-success" },
  sending: { label: "Sending", className: "border-info/20 bg-info/10 text-info" },
  rejected: { label: "Rejected", className: "border-destructive/20 bg-destructive/10 text-destructive" },
  unconfirmed: { label: "Unconfirmed", className: "border-warning-foreground/20 bg-warning text-warning-foreground" },
  not_configured: { label: "Not configured", className: "border-destructive/20 bg-destructive/10 text-destructive" },
};

export function formatCampaignDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
