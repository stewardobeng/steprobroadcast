import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, CalendarDays, CheckCircle2, ChevronRight, FileText, History, Image as ImageIcon, Layers3, Mic, Plus, RefreshCw, Send, Sparkles, Trash2, Type, Video, XCircle } from "lucide-react";
import { AdminShell } from "@/components/campaign/admin-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { campaignSchema, personalize, suggestCampaignId, toPayloadPart, type CampaignPart, type DraftPart, type PartType } from "@/lib/campaign/schema";
import { submitCampaign, type SubmitResult } from "@/lib/campaign/submit.functions";
import { campaignsQueryOptions } from "@/lib/campaign/history";
import { getCampaignStats } from "@/lib/campaign/history-utils";

export const Route = createFileRoute("/_authenticated/dashboard")({
  validateSearch: (search: Record<string, unknown>): { reuse?: string } => (typeof search["reuse"] === "string" ? { reuse: search["reuse"] } : {}),
  head: () => ({
    meta: [
      { title: "New campaign — Broadcast Desk" },
      { name: "description", content: "Compose, preview, and submit a WhatsApp broadcast campaign." },
      { property: "og:title", content: "New campaign — Broadcast Desk" },
      { property: "og:description", content: "Compose, preview, and submit a WhatsApp broadcast campaign." },
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

const newPart = (type: PartType): DraftPart => ({ key: crypto.randomUUID(), type, text: "", url: "", caption: "", filename: "" });

function draftFromPart(part: CampaignPart): DraftPart {
  return {
    key: crypto.randomUUID(),
    type: part.type,
    text: part.type === "text" ? part.text : "",
    url: part.type === "text" ? "" : part.url,
    caption: "caption" in part ? part.caption ?? "" : "",
    filename: part.type === "document" ? part.filename ?? "" : "",
  };
}

function Dashboard() {
  return (
    <AdminShell
      title="Create a new campaign"
      description="Build your message, review every part, then send it to your workflow."
      actions={<Button asChild variant="outline" size="sm"><Link to="/campaigns"><History /> <span className="hidden sm:inline">Campaign history</span></Link></Button>}
    >
      <Composer />
    </AdminShell>
  );
}

function Composer() {
  const submit = useServerFn(submitCampaign);
  const queryClient = useQueryClient();
  const campaignsQuery = useQuery(campaignsQueryOptions);
  const { reuse } = Route.useSearch();
  const reused = useRef(false);
  const [campaignId, setCampaignId] = useState(() => suggestCampaignId());
  const [parts, setParts] = useState<DraftPart[]>([newPart("text")]);
  const [sampleName, setSampleName] = useState("Ama");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const inFlight = useRef(false);
  const locked = submitting || result?.ok === true || (result?.ok === false && result.kind === "network");

  useEffect(() => {
    if (!reuse || reused.current || !campaignsQuery.data) return;
    const source = campaignsQuery.data.find((campaign) => campaign.id === reuse);
    if (!source) return;
    reused.current = true;
    setCampaignId(suggestCampaignId());
    setParts(source.parts.map(draftFromPart));
  }, [reuse, campaignsQuery.data]);

  const stats = useMemo(() => getCampaignStats(campaignsQuery.data ?? []), [campaignsQuery.data]);
  const update = (key: string, patch: Partial<DraftPart>) => setParts((ps) => ps.map((p) => (p.key === key ? { ...p, ...patch } : p)));
  const move = (i: number, d: -1 | 1) => setParts((ps) => {
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
      await queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    } catch (e) {
      setResult({ ok: false, kind: "network", recordId: "unavailable", message: e instanceof Error ? e.message : "Something went wrong. We couldn't confirm whether the request was received." });
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
    <main className="mx-auto max-w-[1500px] space-y-6 p-4 sm:p-6 lg:p-8">
      <section className="grid grid-cols-3 gap-2 sm:gap-3">
        <MiniStat label="Campaigns submitted" value={stats.total} icon={Layers3} />
        <MiniStat label="Active this week" value={stats.thisWeek} icon={CalendarDays} />
        <MiniStat label="Requests received" value={stats.received} icon={CheckCircle2} />
      </section>

      {result && <ResultPanel result={result} onNew={startNew} onDismiss={() => setResult(null)} />}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="space-y-5">
          <section className="rounded-2xl border bg-card p-5 shadow-card sm:p-6">
            <div className="mb-5 flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-primary"><Sparkles className="h-4 w-4" /></div>
              <div><h2 className="font-display text-base font-semibold">Campaign details</h2><p className="mt-1 text-xs text-muted-foreground">Give this submission a unique reference for your records.</p></div>
            </div>
            <Label htmlFor="cid" className="text-xs font-medium">Campaign ID</Label>
            <div className="mt-2 flex gap-2">
              <Input id="cid" value={campaignId} disabled={locked} onChange={(e) => setCampaignId(e.target.value)} className="font-mono text-xs sm:text-sm" />
              <Button variant="outline" size="icon" disabled={locked} onClick={() => setCampaignId(suggestCampaignId())} aria-label="Suggest a new ID" className="h-10 w-10 shrink-0"><RefreshCw className="h-4 w-4" /></Button>
            </div>
            {err("campaignId")}
            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">Use a fresh ID for every submission. Reusing an earlier ID may cause the workflow to skip it as a duplicate.</p>
          </section>

          <section className="rounded-2xl border bg-card shadow-card">
            <div className="flex items-center justify-between border-b p-5 sm:px-6">
              <div><h2 className="font-display text-base font-semibold">Message sequence</h2><p className="mt-1 text-xs text-muted-foreground">Parts are sent separately, in the order shown.</p></div>
              <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-secondary-foreground">{parts.length} / 50</span>
            </div>
            <div className="space-y-4 p-4 sm:p-6">
              {errors["parts"] && <p className="text-sm text-destructive">{errors["parts"]}</p>}
              {parts.length === 0 && <div className="rounded-xl border border-dashed p-10 text-center"><Type className="mx-auto h-6 w-6 text-muted-foreground" /><p className="mt-3 text-sm font-medium">Start your message sequence</p><p className="mt-1 text-xs text-muted-foreground">Add a text, media, or document part below.</p></div>}
              {parts.map((p, i) => {
                const M = TYPE_META[p.type];
                return (
                  <div key={p.key} className="rounded-xl border bg-background/60 p-4 transition-colors focus-within:border-primary/40 sm:p-5">
                    <div className="mb-5 flex items-center gap-2.5">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-xs font-semibold text-primary-foreground">{i + 1}</span>
                      <M.icon className="h-4 w-4 text-primary" />
                      <span className="text-sm font-semibold">{M.label}</span>
                      <div className="ml-auto flex gap-0.5">
                        <Button variant="ghost" size="icon" className="h-8 w-8" disabled={locked || i === 0} onClick={() => move(i, -1)} aria-label="Move up"><ArrowUp /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" disabled={locked || i === parts.length - 1} onClick={() => move(i, 1)} aria-label="Move down"><ArrowDown /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" disabled={locked} onClick={() => setParts((ps) => ps.filter((x) => x.key !== p.key))} aria-label="Remove"><Trash2 /></Button>
                      </div>
                    </div>
                    {p.type === "text" ? (
                      <TokenField label="Message" multiline value={p.text} disabled={locked} onChange={(v) => update(p.key, { text: v })} error={errors[`${p.key}.text`]} />
                    ) : (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-xs">Public file link</Label>
                          <Input placeholder="https://example.com/file" value={p.url} disabled={locked} onChange={(e) => update(p.key, { url: e.target.value })} />
                          {err(`${p.key}.url`)}
                          <p className="text-[11px] text-muted-foreground">The WhatsApp sender must be able to open this http(s) link.</p>
                        </div>
                        <div className={p.type === "document" ? "grid gap-4 sm:grid-cols-2" : ""}>
                          {p.type === "document" && <div className="space-y-2"><Label className="text-xs">Filename <span className="font-normal text-muted-foreground">(optional)</span></Label><Input placeholder="agenda.pdf" value={p.filename} disabled={locked} onChange={(e) => update(p.key, { filename: e.target.value })} />{err(`${p.key}.filename`)}</div>}
                          {p.type !== "audio" && <TokenField label="Caption (optional)" value={p.caption} disabled={locked} onChange={(v) => update(p.key, { caption: v })} error={errors[`${p.key}.caption`]} />}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              <div className="flex flex-wrap gap-2 border-t border-dashed pt-4">
                {(Object.keys(TYPE_META) as PartType[]).map((t) => {
                  const M = TYPE_META[t];
                  return <Button key={t} variant="outline" size="sm" disabled={locked} onClick={() => setParts((ps) => [...ps, newPart(t)])}><Plus className="h-3.5 w-3.5" /><M.icon className="h-3.5 w-3.5" />{M.label}</Button>;
                })}
              </div>
            </div>
          </section>

          <div className="rounded-2xl border bg-card p-4 shadow-card sm:flex sm:items-center sm:gap-5 sm:p-5">
            <div className="mb-4 flex-1 sm:mb-0"><p className="text-sm font-semibold">Ready for review?</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">You’ll confirm the campaign ID and message count before anything is sent.</p></div>
            <Button size="lg" className="w-full px-6 sm:w-auto" disabled={locked} onClick={() => validate() && setConfirmOpen(true)}>{submitting ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />Submitting…</> : <>Review & submit<ChevronRight /></>}</Button>
          </div>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-24">
          <section className="overflow-hidden rounded-2xl border bg-card shadow-card">
            <div className="flex items-center justify-between border-b p-4"><div><h2 className="font-display text-sm font-semibold">Recipient preview</h2><p className="mt-0.5 text-[11px] text-muted-foreground">A sample of each separate send</p></div><span className="flex items-center gap-1.5 text-[11px] text-success"><span className="h-1.5 w-1.5 rounded-full bg-success" />Live</span></div>
            <div className="p-4">
              <Label htmlFor="sample" className="text-[11px]">Preview name</Label>
              <Input id="sample" value={sampleName} onChange={(e) => setSampleName(e.target.value)} className="mt-1.5 h-9" />
              <Preview parts={parts} name={sampleName || "Ama"} />
            </div>
          </section>
          <div className="rounded-xl border bg-secondary/60 p-4 text-[11px] leading-relaxed text-secondary-foreground">
            <p className="font-semibold">About personalisation</p>
            <p className="mt-1 text-muted-foreground">The preview replaces <code>{"{{name}}"}</code> with your sample name. The original token is sent unchanged so the workflow can personalise each recipient’s message.</p>
          </div>
        </aside>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-primary"><Send className="h-5 w-5" /></div>
            <AlertDialogTitle className="font-display text-xl">Submit this campaign?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm leading-relaxed">
                <p>Campaign <strong className="break-all text-foreground">{payload.campaignId}</strong> with <strong className="text-foreground">{parts.length}</strong> message part{parts.length === 1 ? "" : "s"} will be sent to the workflow.</p>
                <p>The workflow delivers to eligible contacts in its existing contact sheet. Confirm that sheet with the workflow owner before submitting.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Go back</AlertDialogCancel><AlertDialogAction disabled={submitting} onClick={(e) => { e.preventDefault(); doSubmit(); }}><Send />Submit campaign</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}

function MiniStat({ label, value, icon: Icon }: { label: string; value: number; icon: typeof Type }) {
  return <div className="flex flex-col gap-3 rounded-2xl border bg-card p-3 shadow-card sm:flex-row sm:items-center sm:gap-4 sm:p-4"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-primary sm:h-10 sm:w-10"><Icon className="h-[18px] w-[18px]" /></div><div><p className="font-display text-xl font-semibold leading-none sm:text-2xl">{value}</p><p className="mt-1.5 text-[10px] leading-snug text-muted-foreground sm:text-[11px]">{label}</p></div></div>;
}

function TokenField(props: { label: string; value: string; onChange: (v: string) => void; disabled?: boolean; multiline?: boolean; error?: string | undefined }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between"><Label className="text-xs">{props.label}</Label><button type="button" disabled={props.disabled} onClick={() => props.onChange(`${props.value}{{name}}`)} className="text-[11px] font-semibold text-primary hover:underline disabled:opacity-50">+ Insert {"{{name}}"}</button></div>
      {props.multiline ? <Textarea rows={5} placeholder="Write your broadcast message…" value={props.value} disabled={props.disabled} onChange={(e) => props.onChange(e.target.value)} /> : <Input value={props.value} disabled={props.disabled} onChange={(e) => props.onChange(e.target.value)} />}
      {props.error && <p className="text-xs text-destructive">{props.error}</p>}
    </div>
  );
}

function Preview({ parts, name }: { parts: DraftPart[]; name: string }) {
  return (
    <div className="mt-4 overflow-hidden rounded-2xl border bg-chat-bg">
      <div className="flex items-center gap-2.5 border-b bg-card px-3.5 py-3"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground"><Send className="h-3.5 w-3.5" /></div><div><p className="text-xs font-semibold">Broadcast update</p><p className="text-[10px] text-muted-foreground">to {name}</p></div></div>
      <div className="max-h-[520px] min-h-64 space-y-2.5 overflow-y-auto p-3.5">
        {parts.length === 0 && <p className="py-16 text-center text-xs text-muted-foreground">Your message preview will appear here</p>}
        {parts.map((p, i) => {
          const M = TYPE_META[p.type];
          return (
            <div key={p.key} className="ml-auto max-w-[92%] rounded-xl rounded-tr-sm bg-bubble p-3 text-sm text-bubble-foreground shadow-sm">
              <div className="mb-1.5 text-[9px] font-semibold uppercase tracking-wider opacity-55">Send {i + 1} · {M.label}</div>
              {p.type === "text" ? <p className="whitespace-pre-wrap break-words text-xs leading-relaxed">{personalize(p.text, name) || <em className="opacity-50">Empty message</em>}</p> : <><div className="flex items-center gap-2 rounded-lg bg-card/65 p-2.5"><M.icon className="h-4 w-4 shrink-0" /><span className="truncate text-[11px]">{p.type === "document" && p.filename ? p.filename : p.url || "No link yet"}</span></div>{p.type !== "audio" && p.caption && <p className="mt-2 whitespace-pre-wrap break-words text-xs">{personalize(p.caption, name)}</p>}</>}
              <p className="mt-1.5 text-right text-[9px] opacity-50">Now <CheckCircle2 className="ml-0.5 inline h-2.5 w-2.5" /></p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ResultPanel({ result, onNew, onDismiss }: { result: SubmitResult; onNew: () => void; onDismiss: () => void }) {
  if (result.ok) {
    return (
      <section className="flex flex-col gap-4 rounded-2xl border border-success/20 bg-success/5 p-5 sm:flex-row sm:items-center">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success/10"><CheckCircle2 className="h-5 w-5 text-success" /></div>
        <div className="flex-1"><p className="text-sm font-semibold">The workflow received your request</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">This confirms receipt, not message delivery. The campaign is now saved in your history.</p></div>
        <div className="flex gap-2"><Button asChild variant="outline" size="sm"><Link to="/campaigns">View history</Link></Button><Button size="sm" onClick={onNew}>Start new</Button></div>
      </section>
    );
  }
  const network = result.kind === "network";
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-destructive/25 bg-card p-5 sm:flex-row sm:items-start">
      <XCircle className="h-6 w-6 shrink-0 text-destructive" />
      <div className="flex-1 text-sm"><p className="font-semibold">{network ? "We couldn't confirm the submission" : result.kind === "config" ? "Sending isn't set up" : result.kind === "save" ? "Campaign couldn't be saved" : `The workflow rejected the request (${"status" in result ? result.status : ""})`}</p><p className="mt-1 break-words text-xs leading-relaxed text-muted-foreground">{result.message}</p>{network && <p className="mt-2 text-xs text-muted-foreground">The form is locked to avoid sending twice. Check the campaign’s unconfirmed record before trying again.</p>}</div>
      {network ? <Button variant="outline" size="sm" onClick={onNew}>Start new</Button> : <Button variant="outline" size="sm" onClick={onDismiss}>Edit and retry</Button>}
    </section>
  );
}
