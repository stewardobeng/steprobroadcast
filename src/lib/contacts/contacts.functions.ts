import { createMiddleware, createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { contactSchema, groupSchema } from "./schema";

const requireAdmin = createMiddleware({ type: "function" }).middleware([requireSupabaseAuth]).server(async ({ context, next }) => {
  const { data, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (error || !data) throw new Error("Administrator access required.");
  return next();
});

export const listContactWorkspace = createServerFn({ method: "GET" }).middleware([requireAdmin]).handler(async ({ context }) => {
  const [contacts, groups, members] = await Promise.all([
    context.supabase.from("contacts").select("id, name, phone, email, notes").order("name"),
    context.supabase.from("contact_groups").select("id, name, description").order("name"),
    context.supabase.from("contact_group_members").select("contact_id, group_id"),
  ]);
  if (contacts.error || groups.error || members.error) throw new Error("Contacts and groups couldn’t be loaded.");
  return { contacts: contacts.data, groups: groups.data, members: members.data };
});

export const saveContact = createServerFn({ method: "POST" }).middleware([requireAdmin]).inputValidator(contactSchema).handler(async ({ data, context }) => {
  const { error } = await context.supabase.rpc("save_contact", {
    ...(data.id ? { _id: data.id } : {}), _name: data.name, _phone: data.phone, _email: data.email, _notes: data.notes, _groups: data.groupIds,
  });
  if (error) throw new Error(error.code === "23505" ? "A contact with this phone number already exists." : "Contact couldn’t be saved. Please try again.");
  return { ok: true };
});

export const saveGroup = createServerFn({ method: "POST" }).middleware([requireAdmin]).inputValidator(groupSchema).handler(async ({ data, context }) => {
  const { error } = await context.supabase.rpc("save_contact_group", {
    ...(data.id ? { _id: data.id } : {}), _name: data.name, _description: data.description, _contacts: data.contactIds,
  });
  if (error) throw new Error(error.code === "23505" ? "A group with this name already exists." : "Group couldn’t be saved. Please try again.");
  return { ok: true };
});

export const deleteContactItem = createServerFn({ method: "POST" }).middleware([requireAdmin])
  .inputValidator(z.object({ id: z.string().uuid(), kind: z.enum(["contact", "group"]) }))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase.from(data.kind === "contact" ? "contacts" : "contact_groups").delete().eq("id", data.id).select("id");
    if (error || !rows?.length) throw new Error("This item couldn’t be deleted. Please refresh and try again.");
    return { ok: true };
  });