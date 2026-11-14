import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { campaignSchema } from "./schema";
import type { CampaignStatus } from "./history-types";

export type SubmitResult =
  | { ok: true; status: number; recordId: string }
  | { ok: false; kind: "rejected"; status: number; message: string; recordId: string }
  | { ok: false; kind: "network" | "config"; message: string; recordId: string }
  | { ok: false; kind: "save"; message: string };

export const submitCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => campaignSchema.parse(input))
  .handler(async ({ data, context }): Promise<SubmitResult> => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden: administrator access required");

    const { data: record, error: insertError } = await context.supabase
      .from("campaigns")
      .insert({ campaign_id: data.campaignId, parts: data.parts, created_by: context.userId, status: "sending" })
      .select("id")
      .single();

    if (insertError || !record) {
      console.error("Campaign history insert failed", insertError);
      return { ok: false, kind: "save", message: "We couldn't save this campaign, so nothing was sent. Please try again." };
    }

    const finalize = async (status: CampaignStatus, responseStatus: number | null, errorMessage: string | null) => {
      const { error } = await context.supabase
        .from("campaigns")
        .update({ status, response_status: responseStatus, error_message: errorMessage, updated_at: new Date().toISOString() })
        .eq("id", record.id);
      if (error) console.error("Campaign outcome update failed", error);
    };

    const url = process.env["N8N_WEBHOOK_URL"];
    if (!url) {
      const message = "The campaign webhook is not configured.";
      await finalize("not_configured", null, message);
      return { ok: false, kind: "config", message, recordId: record.id };
    }

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const secret = process.env["N8N_WEBHOOK_SECRET"];
    if (secret) headers["X-Webhook-Secret"] = secret;

    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({ campaignId: data.campaignId, parts: data.parts }),
      });
    } catch (e) {
      console.error("Webhook network error", e);
      const message = "We couldn't confirm whether the request reached the workflow. Check with the workflow owner before trying again.";
      await finalize("unconfirmed", null, message);
      return { ok: false, kind: "network", message, recordId: record.id };
    }

    if (!res.ok) {
      const body = (await res.text()).slice(0, 500);
      console.error(`Webhook rejected [${res.status}]: ${body}`);
      const message = body || res.statusText;
      await finalize("rejected", res.status, message);
      return { ok: false, kind: "rejected", status: res.status, message, recordId: record.id };
    }

    await finalize("submitted", res.status, null);
    return { ok: true, status: res.status, recordId: record.id };
  });
