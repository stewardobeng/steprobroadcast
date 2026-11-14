# WhatsApp Broadcast Campaign Dashboard

## What you get
- **Sign-in page** (email + password). Only accounts marked as administrators can open the dashboard; others see "not authorized".
- **Campaign composer** (one page):
  - Campaign ID with an auto-suggested unique value (e.g. `campaign-2026-11-14-x7k2`), editable, with a note that reusing an ID may cause parts to be skipped as duplicates.
  - Ordered list of message parts: add (text, image, video, audio, document), remove, move up/down.
  - Per-type fields: text (required); image/video (link + optional caption); audio (link); document (link + optional filename + caption). Links must start with http(s).
  - `{{name}}` hint and an "Insert name" button for text/captions.
- **Live preview** in WhatsApp-style bubbles, in sending order, using a sample name (editable, default "Ama"). Note: each part is a separate WhatsApp send.
- **Confirm dialog** before sending: states it goes to eligible contacts in the workflow's existing contact sheet — no invented count or recipient list.
- **Submission result**: "Request received; delivery status is not yet available." Errors shown clearly with no auto-retry; send button locks while submitting and after success (start a new campaign to send again).
- **Warning banner**: webhook is not yet secured/published — not production ready.

## Technical details
- Enable Lovable Cloud: auth (email/password), `user_roles` table + `has_role()` function per standard roles pattern. First admin is granted by you via a one-line SQL I'll provide (no self-promotion).
- Protected route `/_authenticated/dashboard`; `/` is a sign-in landing redirecting to dashboard when signed in.
- Server function `submitCampaign` with `requireSupabaseAuth` + admin role check, zod validation (campaignId slug 3–100 chars, discriminated union of part types, 1–50 parts), POSTs `{ campaignId, parts }` (parts as real array) to `process.env.N8N_WEBHOOK_URL`; optional `N8N_WEBHOOK_SECRET` sent as a header if configured (to be agreed with workflow owner). Returns only status, never claims delivery. `{{name}}` submitted unchanged.
- Secret `N8N_WEBHOOK_URL` set to `https://marlow.steprotech.com/webhook/whatsapp-broadcast-campaign`.
- Unit tests for validation rules (required fields per type, URL scheme, ID format, `{{name}}` preserved).
- Not included: uploads, scheduling, contact selection, stickers, delivery status.
