import { describe, expect, it } from "vitest";
import { contactSchema, groupSchema } from "./schema";

describe("contact validation", () => {
  const contact = { name: "Ama", phone: "+233241234567", email: "", notes: "", groupIds: [] };
  it("normalizes phone formatting", () => {
    expect(contactSchema.parse({ ...contact, phone: "+233 (24) 123-4567" }).phone).toBe("+233241234567");
  });
  it("requires an international number", () => {
    expect(contactSchema.safeParse({ ...contact, phone: "0241234567" }).success).toBe(false);
  });
  it("requires a contact name", () => {
    expect(contactSchema.safeParse({ ...contact, name: " " }).success).toBe(false);
  });
  it("keeps multiple unique group memberships", () => {
    const a = "00000000-0000-4000-8000-000000000001";
    const b = "00000000-0000-4000-8000-000000000002";
    expect(contactSchema.parse({ ...contact, groupIds: [a, b, a] }).groupIds).toEqual([a, b]);
  });
  it("requires a group name", () => {
    expect(groupSchema.safeParse({ name: "", description: "", contactIds: [] }).success).toBe(false);
  });
});