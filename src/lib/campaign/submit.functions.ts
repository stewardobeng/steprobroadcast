import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { campaignSchema } from "./schema";

export type SubmitResult =
  | { ok: true; status: number }
  | { ok: false; kind: "rejected"; status: number; message: string }
  | { ok: false; kind: "network" | "config"; message: string };

export const submitCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => campaignSchema.parse(input))
  .handler(async ({ data, context }): Promise<SubmitResult> => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden: administrator access required");

    const url = process.env["N8N_WEBHOOK_URL"];
    if (!url) return { ok: false, kind: "config", message: "The campaign webhook is not configured." };

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
      return {
        ok: false,
        kind: "network",
        message:
          "We couldn't confirm whether the request reached the workflow. Check with the workflow owner before trying again.",
      };
    }
    if (!res.ok) {
      const body = (await res.text()).slice(0, 500);
      console.error(`Webhook rejected [${res.status}]: ${body}`);
      return { ok: false, kind: "rejected", status: res.status, message: body || res.statusText };
    }
    return { ok: true, status: res.status };
  });
