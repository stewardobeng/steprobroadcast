import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { partSchema } from "./schema";
import { CAMPAIGN_STATUSES, type CampaignRecord } from "./history-types";

export const listCampaigns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CampaignRecord[]> => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden: administrator access required");

    const { data, error } = await context.supabase
      .from("campaigns")
      .select("id, campaign_id, parts, status, response_status, error_message, created_at, updated_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error("Campaign history couldn't be loaded.");

    return data.map((row) => ({
      id: row.id,
      campaignId: row.campaign_id,
      parts: z.array(partSchema).parse(row.parts),
      status: z.enum(CAMPAIGN_STATUSES).parse(row.status),
      responseStatus: row.response_status,
      errorMessage: row.error_message,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  });
