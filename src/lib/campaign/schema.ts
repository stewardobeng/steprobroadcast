import { z } from "zod";

export const PART_TYPES = ["text", "image", "video", "audio", "document"] as const;
export type PartType = (typeof PART_TYPES)[number];

const httpUrl = z
  .string()
  .trim()
  .min(1, "A file link is required")
  .max(2000, "Link is too long")
  .refine((v) => {
    try {
      const u = new URL(v);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  }, "Link must start with http:// or https://");

const caption = z.string().max(1024, "Caption must be under 1024 characters").optional();

export const partSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), text: z.string().trim().min(1, "Text is required").max(4096, "Text must be under 4096 characters") }),
  z.object({ type: z.literal("image"), url: httpUrl, caption }),
  z.object({ type: z.literal("video"), url: httpUrl, caption }),
  z.object({ type: z.literal("audio"), url: httpUrl }),
  z.object({
    type: z.literal("document"),
    url: httpUrl,
    filename: z.string().trim().max(255, "Filename is too long").optional(),
    caption,
  }),
]);

export const campaignIdSchema = z
  .string()
  .trim()
  .min(3, "Campaign ID must be at least 3 characters")
  .max(100, "Campaign ID must be under 100 characters")
  .regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/, "Use only letters, numbers, dashes and underscores");

export const campaignSchema = z.object({
  campaignId: campaignIdSchema,
  parts: z.array(partSchema).min(1, "Add at least one message part").max(50, "At most 50 parts"),
});

export type CampaignPart = z.infer<typeof partSchema>;
export type Campaign = z.infer<typeof campaignSchema>;

/** Draft part as edited in the form (all fields strings). */
export type DraftPart = {
  key: string;
  type: PartType;
  text: string;
  url: string;
  caption: string;
  filename: string;
};

/** Convert a draft into the exact payload shape, dropping empty optional fields. */
export function toPayloadPart(d: DraftPart): unknown {
  const opt = (v: string) => (v.trim() ? v : undefined);
  switch (d.type) {
    case "text":
      return { type: "text", text: d.text };
    case "image":
    case "video":
      return { type: d.type, url: d.url.trim(), caption: opt(d.caption) };
    case "audio":
      return { type: "audio", url: d.url.trim() };
    case "document":
      return { type: "document", url: d.url.trim(), filename: opt(d.filename.trim()), caption: opt(d.caption) };
  }
}

export function suggestCampaignId(now = new Date()): string {
  const date = now.toISOString().slice(0, 10);
  const rand = Math.random().toString(36).slice(2, 6);
  return `campaign-${date}-${rand}`;
}

export function personalize(text: string, name: string): string {
  return text.split("{{name}}").join(name);
}
