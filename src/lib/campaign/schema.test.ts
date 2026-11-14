import { describe, expect, it } from "vitest";
import { campaignSchema, personalize, toPayloadPart, type DraftPart } from "./schema";

const draft = (p: Partial<DraftPart>): DraftPart => ({ key: "k", type: "text", text: "", url: "", caption: "", filename: "", ...p });

describe("campaign validation", () => {
  it("requires text for text parts", () => {
    expect(campaignSchema.safeParse({ campaignId: "abc", parts: [{ type: "text", text: "  " }] }).success).toBe(false);
  });
  it("requires an http(s) link for media", () => {
    for (const type of ["image", "video", "audio", "document"]) {
      expect(campaignSchema.safeParse({ campaignId: "abc", parts: [{ type, url: "ftp://x/y" }] }).success).toBe(false);
      expect(campaignSchema.safeParse({ campaignId: "abc", parts: [{ type, url: "https://x.com/y" }] }).success).toBe(true);
    }
  });
  it("rejects unknown part types like sticker", () => {
    expect(campaignSchema.safeParse({ campaignId: "abc", parts: [{ type: "sticker", url: "https://x.com/s" }] }).success).toBe(false);
  });
  it("rejects bad campaign IDs", () => {
    expect(campaignSchema.safeParse({ campaignId: "a b", parts: [{ type: "text", text: "hi" }] }).success).toBe(false);
  });
  it("keeps {{name}} unchanged in payload while preview substitutes it", () => {
    const p = toPayloadPart(draft({ text: "Hello {{name}}" })) as { text: string };
    expect(p.text).toBe("Hello {{name}}");
    expect(personalize(p.text, "Ama")).toBe("Hello Ama");
  });
  it("submits parts as an array", () => {
    const r = campaignSchema.parse({ campaignId: "abc", parts: [toPayloadPart(draft({ text: "x" }))] });
    expect(Array.isArray(r.parts)).toBe(true);
  });
});
