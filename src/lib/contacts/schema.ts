import { z } from "zod";

export const contactSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, "Enter a contact name.").max(120),
  phone: z.string().trim().transform((value) => value.replace(/[\s()-]/g, "")).pipe(z.string().regex(/^\+[1-9]\d{6,14}$/, "Use an international number, such as +233241234567.")),
  email: z.union([z.literal(""), z.string().email("Enter a valid email address.")]),
  notes: z.string().trim().max(2000),
  groupIds: z.array(z.string().uuid()).transform((ids) => [...new Set(ids)]),
});

export const groupSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, "Enter a group name.").max(120),
  description: z.string().trim().max(1000),
  contactIds: z.array(z.string().uuid()).transform((ids) => [...new Set(ids)]),
});

export type ContactInput = z.input<typeof contactSchema>;
export type GroupInput = z.input<typeof groupSchema>;