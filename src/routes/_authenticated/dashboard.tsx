import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import {
  ArrowDown, ArrowUp, AlertTriangle, CheckCircle2, FileText, Image as ImageIcon, LogOut, Mic,
  Plus, RefreshCw, Trash2, Type, Video, XCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  campaignSchema, personalize, suggestCampaignId, toPayloadPart, type DraftPart, type PartType,
} from "@/lib/campaign/schema";
import { submitCampaign, type SubmitResult } from "@/lib/campaign/submit.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Compose campaign — Broadcast Desk" },
      { name: "description", content: "Compose and submit a WhatsApp broadcast campaign." },
      { property: "og:title", content: "Compose campaign — Broadcast Desk" },
      { property: "og:description", content: "Compose and submit a WhatsApp broadcast campaign." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

const TYPE_META: Record<PartType, { label: string; icon: typeof Type }> = {
  text: { label: "Text", icon: Type },
  image: { label: "Image", icon: ImageIcon },
  video: { label: "Video", icon: Video },
  audio: { label: "Audio", icon: Mic },
  document: { label: "Document", icon: FileText },
};

const newPart = (type: PartType): DraftPart => ({
  key: crypto.randomUUID(), type, text: "", url: "", caption: "", filename: "",
});

function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const roleQuery = useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return { email: null, admin: false };
      const { data } = await supabase.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
      return { email: u.user.email ?? null, admin: !!data };
    },
  });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  return (
    <div className="min-h-screen">
      <header className="border-b bg-card/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <div>
            <h1 className="font-display text-xl font-semibold">Broadcast Desk</h1>
            <p className="text-xs text-muted-foreground">{roleQuery.data?.email}</p>
          </div>
          <Button variant="outline" size="sm" onClick={signOut}>
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </div>
      </header>
      {roleQuery.isLoading ? (
        <p className="p-8 text-center text-muted-foreground">Checking access…</p>
      ) : !roleQuery.data?.admin ? (
        <div className="mx-auto max-w-md p-8 text-center">
          <XCircle className="mx-auto h-10 w-10 text-destructive" />
          <h2 className="mt-4 font-display text-xl font-semibold">Not authorized</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Your account is signed in but doesn't have administrator access. Ask the workspace owner to grant it.
          </p>
        </div>
      ) : (
        <Composer />
      )}
    </div>
  );
}

function Composer() {
  const submit = useServerFn(submitCampaign);
  const [campaignId, setCampaignId] = useState(() => suggestCampaignId());
  const [parts, setParts] = useState<DraftPart[]>([newPart("text")]);
  const [sampleName, setSampleName] = useState("Ama");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const inFlight = useRef(false);
  const locked = submitting || result?.ok === true || (result?.ok === false && result.kind === "network");

  const update = (key: string, patch: Partial<DraftPart>) =>
    setParts((ps) => ps.map((p) => (p.key === key ? { ...p, ...patch } : p)));
  const move = (i: number, d: -1 | 1) =>
    setParts((ps) => {
      const n = [...ps];
      const j = i + d;
      if (j < 0 || j >= n.length) return ps;
      const a = n[i]!; n[i] = n[j]!; n[j] = a;
      return n;
    });

  const payload = useMemo(() => ({ campaignId: campaignId.trim(), parts: parts.map(toPayloadPart) }), [campaignId, parts]);

  function validate() {
    const r = campaignSchema.safeParse(payload);
    if (r.success) { setErrors({}); return true; }
    const e: Record<string, string> = {};
    for (const issue of r.error.issues) {
      const [root, idx, field] = issue.path;
      let k = String(root);
      if (root === "parts" && typeof idx === "number") k = `${parts[idx]?.key}.${String(field ?? "")}`;
      if (!e[k]) e[k] = issue.message;
    }
    setErrors(e);
    return false;
  }

  async function doSubmit() {
    if (inFlight.current) return;
    inFlight.current = true;
    setSubmitting(true);
    setConfirmOpen(false);
    try {
      setResult(await submit({ data: payload }));
    } catch (e) {
      setResult({ ok: false, kind: "network", message: e instanceof Error ? e.message : "Something went wrong. We couldn't confirm whether the request was received." });
    } finally {
      setSubmitting(false);
      inFlight.current = false;
    }
  }

  function startNew() {
    setCampaignId(suggestCampaignId());
    setParts([newPart("text")]);
    setResult(null);
    setErrors({});
  }

  const err = (k: string) => errors[k] && <p className="text-xs text-destructive">{errors[k]}</p>;

  return (
    <main className="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[1fr_380px]">
      <div className="space-y-6">
        <div className="flex gap-3 rounded-xl border border-warning-foreground/20 bg-warning p-4 text-sm text-warning-foreground">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            <strong>Not production-ready.</strong> The receiving workflow's webhook isn't secured or published yet.
            Coordinate access controls with the workflow owner before sending real broadcasts.
          </p>
        </div>

        {result && <ResultPanel result={result} onNew={startNew} onDismiss={() => setResult(null)} />}

        <section className="space-y-2 rounded-2xl border bg-card p-5 shadow-card">
          <Label htmlFor="cid" className="font-display text-base">Campaign ID</Label>
          <div className="flex gap-2">
            <Input id="cid" value={campaignId} disabled={locked} onChange={(e) => setCampaignId(e.target.value)} />
            <Button variant="outline" size="icon" disabled={locked} onClick={() => setCampaignId(suggestCampaignId())} aria-label="Suggest a new ID">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          {err("campaignId")}
          <p className="text-xs text-muted-foreground">
            A unique ID is suggested for you. Reusing an earlier ID may cause message parts to be treated as duplicates and skipped.
          </p>
        </section>

        <section className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-lg font-semibold">Message parts</h2>
            <span className="text-xs text-muted-foreground">Sent in this order</span>
          </div>
          {errors["parts"] && <p className="text-sm text-destructive">{errors["parts"]}</p>}
          {parts.map((p, i) => {
            const M = TYPE_META[p.type];
            return (
              <div key={p.key} className="space-y-3 rounded-2xl border bg-card p-4 shadow-card">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-xs font-semibold">{i + 1}</span>
                  <M.icon className="h-4 w-4 text-primary" />
                  <span className="font-medium">{M.label}</span>
                  <div className="ml-auto flex gap-1">
                    <Button variant="ghost" size="icon" disabled={locked || i === 0} onClick={() => move(i, -1)} aria-label="Move up"><ArrowUp className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" disabled={locked || i === parts.length - 1} onClick={() => move(i, 1)} aria-label="Move down"><ArrowDown className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" disabled={locked} onClick={() => setParts((ps) => ps.filter((x) => x.key !== p.key))} aria-label="Remove"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
                {p.type === "text" ? (
                  <TokenField label="Message" multiline value={p.text} disabled={locked} onChange={(v) => update(p.key, { text: v })} error={errors[`${p.key}.text`]} />
                ) : (
                  <>
                    <div className="space-y-1">
                      <Label>File link</Label>
                      <Input placeholder="https://…" value={p.url} disabled={locked} onChange={(e) => update(p.key, { url: e.target.value })} />
                      {err(`${p.key}.url`)}
                      <p className="text-xs text-muted-foreground">Must be a public http(s) link the WhatsApp sender can open. Uploading isn't supported.</p>
                    </div>
                    {p.type === "document" && (
                      <div className="space-y-1">
                        <Label>Filename (optional)</Label>
                        <Input placeholder="agenda.pdf" value={p.filename} disabled={locked} onChange={(e) => update(p.key, { filename: e.target.value })} />
                        {err(`${p.key}.filename`)}
                      </div>
                    )}
                    {p.type !== "audio" && (
                      <TokenField label="Caption (optional)" value={p.caption} disabled={locked} onChange={(v) => update(p.key, { caption: v })} error={errors[`${p.key}.caption`]} />
                    )}
                  </>
                )}
              </div>
            );
          })}
          <div className="flex flex-wrap gap-2">
            {(Object.keys(TYPE_META) as PartType[]).map((t) => {
              const M = TYPE_META[t];
              return (
                <Button key={t} variant="outline" size="sm" disabled={locked} onClick={() => setParts((ps) => [...ps, newPart(t)])}>
                  <Plus className="h-3.5 w-3.5" /> <M.icon className="h-3.5 w-3.5" /> {M.label}
                </Button>
              );
            })}
          </div>
        </section>

        <Button size="lg" className="w-full" disabled={locked} onClick={() => validate() && setConfirmOpen(true)}>
          {submitting ? "Submitting…" : "Review & submit campaign"}
        </Button>
      </div>

      <aside className="space-y-3 lg:sticky lg:top-6 lg:self-start">
        <div className="flex items-end gap-2">
          <div className="flex-1 space-y-1">
            <Label htmlFor="sample">Preview as</Label>
            <Input id="sample" value={sampleName} onChange={(e) => setSampleName(e.target.value)} />
          </div>
        </div>
        <Preview parts={parts} name={sampleName || "Ama"} />
        <p className="text-xs text-muted-foreground">
          Each part is a separate WhatsApp send, so recipients may see them as separate messages. The preview fills in a sample name; the real{" "}
          <code>{"{{name}}"}</code> token is sent unchanged for the workflow to personalise.
        </p>
      </aside>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit this campaign?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>
                  Campaign <strong>{payload.campaignId}</strong> with <strong>{parts.length}</strong> message part{parts.length === 1 ? "" : "s"} will be sent to the
                  workflow, which delivers it to the eligible contacts in its existing contact sheet.
                </p>
                <p>This dashboard can't show or choose those contacts, so please confirm the contact sheet is correct with the workflow owner.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Go back</AlertDialogCancel>
            <AlertDialogAction disabled={submitting} onClick={(e) => { e.preventDefault(); doSubmit(); }}>
              Submit campaign
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}

function TokenField(props: { label: string; value: string; onChange: (v: string) => void; disabled?: boolean; multiline?: boolean; error?: string | undefined }) {
  const insert = () => props.onChange(`${props.value}{{name}}`);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <Label>{props.label}</Label>
        <button type="button" disabled={props.disabled} onClick={insert} className="text-xs font-medium text-primary hover:underline disabled:opacity-50">
          + Insert {"{{name}}"}
        </button>
      </div>
      {props.multiline ? (
        <Textarea rows={4} value={props.value} disabled={props.disabled} onChange={(e) => props.onChange(e.target.value)} />
      ) : (
        <Input value={props.value} disabled={props.disabled} onChange={(e) => props.onChange(e.target.value)} />
      )}
      {props.error && <p className="text-xs text-destructive">{props.error}</p>}
    </div>
  );
}

function Preview({ parts, name }: { parts: DraftPart[]; name: string }) {
  return (
    <div className="space-y-2 rounded-2xl bg-chat-bg p-4">
      {parts.length === 0 && <p className="text-center text-sm text-muted-foreground">No parts yet</p>}
      {parts.map((p, i) => {
        const M = TYPE_META[p.type];
        return (
          <div key={p.key} className="ml-auto max-w-[90%] rounded-xl rounded-tr-sm bg-bubble p-3 text-sm text-bubble-foreground shadow-sm">
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide opacity-60">Send {i + 1} · {M.label}</div>
            {p.type === "text" ? (
              <p className="whitespace-pre-wrap break-words">{personalize(p.text, name) || <em className="opacity-50">Empty message</em>}</p>
            ) : (
              <>
                <div className="flex items-center gap-2 rounded-lg bg-card/60 p-2">
                  <M.icon className="h-4 w-4 shrink-0" />
                  <span className="truncate text-xs">{p.type === "document" && p.filename ? p.filename : p.url || "No link yet"}</span>
                </div>
                {p.type !== "audio" && p.caption && <p className="mt-1 whitespace-pre-wrap break-words">{personalize(p.caption, name)}</p>}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ResultPanel({ result, onNew, onDismiss }: { result: SubmitResult; onNew: () => void; onDismiss: () => void }) {
  if (result.ok) {
    return (
      <div className="flex flex-col gap-3 rounded-2xl border bg-secondary p-5 sm:flex-row sm:items-center">
        <CheckCircle2 className="h-6 w-6 shrink-0 text-primary" />
        <div className="flex-1">
          <p className="font-semibold">Request received; delivery status is not yet available.</p>
          <p className="text-sm text-muted-foreground">This only confirms the workflow received the request — not that messages were delivered.</p>
        </div>
        <Button onClick={onNew}>Start new campaign</Button>
      </div>
    );
  }
  const network = result.kind === "network";
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-destructive/40 bg-card p-5 sm:flex-row sm:items-start">
      <XCircle className="h-6 w-6 shrink-0 text-destructive" />
      <div className="flex-1 text-sm">
        <p className="font-semibold">
          {network ? "We couldn't confirm the submission" : result.kind === "config" ? "Sending isn't set up" : `The workflow rejected the request (${"status" in result ? result.status : ""})`}
        </p>
        <p className="mt-1 break-words text-muted-foreground">{result.message}</p>
        {network && <p className="mt-1 text-muted-foreground">The form is locked to avoid sending twice. Check with the workflow owner, then start a new campaign if needed.</p>}
      </div>
      {network ? <Button variant="outline" onClick={onNew}>Start new campaign</Button> : <Button variant="outline" onClick={onDismiss}>Edit and retry</Button>}
    </div>
  );
}
