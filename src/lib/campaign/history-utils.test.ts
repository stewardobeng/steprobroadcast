import { describe, expect, it } from "vitest";
import type { CampaignRecord } from "./history-types";
import { filterCampaigns, getCampaignStats } from "./history-utils";

const campaign = (patch: Partial<CampaignRecord>): CampaignRecord => ({
  id: "row-1",
  campaignId: "campaign-2026-11-14-launch",
  parts: [{ type: "text", text: "Hello {{name}}" }],
  status: "submitted",
  responseStatus: 200,
  errorMessage: null,
  createdAt: "2026-11-14T12:00:00.000Z",
  updatedAt: "2026-11-14T12:00:00.000Z",
  ...patch,
});

describe("campaign history", () => {
  it("finds a past campaign by its exact ID", () => {
    const rows = [campaign({}), campaign({ id: "row-2", campaignId: "campaign-other" })];
    expect(filterCampaigns(rows, "2026-11-14-launch", "all").map((row) => row.id)).toEqual(["row-1"]);
  });

  it("shows only rejected campaigns when that filter is selected", () => {
    const rows = [campaign({}), campaign({ id: "row-2", status: "rejected" })];
    expect(filterCampaigns(rows, "", "rejected").map((row) => row.id)).toEqual(["row-2"]);
  });

  it("counts requests received and submissions from the last seven days", () => {
    const rows = [campaign({}), campaign({ id: "row-2", status: "rejected", createdAt: "2026-11-01T12:00:00.000Z" })];
    expect(getCampaignStats(rows, new Date("2026-11-14T13:00:00.000Z"))).toEqual({ total: 2, received: 1, thisWeek: 1, attention: 1 });
  });
});
