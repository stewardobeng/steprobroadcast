import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { AlertCircle, ArrowUpRight, CalendarDays, CheckCircle2, ChevronRight, Copy, Eye, FileText, History, Image as ImageIcon, Layers3, Mic, Plus, Search, Send, Type, Video } from "lucide-react";
import { AdminShell } from "@/components/campaign/admin-shell";
import { StatusBadge } from "@/components/campaign/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { campaignsQueryOptions, formatCampaignDate, STATUS_META, type CampaignRecord } from "@/lib/campaign/history";
import { filterCampaigns, getCampaignStats, type CampaignStatusFilter } from "@/lib/campaign/history-utils";
import type { PartType } from "@/lib/campaign/schema";

const TYPE_META: Record<PartType, { label: string; icon: typeof Type }> = {
  text: { label: "Text", icon: Type },
  image: { label: "Image", icon: ImageIcon },
  video: { label: "Video", icon: Video },
  audio: { label: "Audio", icon: Mic },
  document: { label: "Document", icon: FileText },
};

export const Route = createFileRoute("/_authenticated/campaigns")({
  validateSearch: (search: Record<string, unknown>): { q?: string; status?: CampaignStatusFilter } => ({
    q: typeof search["q"] === "string" ? search["q"] : "",
    status: ["sending", "submitted", "rejected", "unconfirmed", "not_configured"].includes(String(search["status"]))
      ? (search["status"] as CampaignStatusFilter)
      : "all",
  }),
  head: () => ({
    meta: [
      { title: "Campaign history — Broadcast Desk" },
      { name: "description", content: "Review past WhatsApp campaign submissions, outcomes, and message content." },
      { property: "og:title", content: "Campaign history — Broadcast Desk" },
      { property: "og:description", content: "Review past WhatsApp campaign submissions, outcomes, and message content." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CampaignHistory,
});

function CampaignHistory() {
  const campaignsQuery = useQuery(campaignsQueryOptions);
  const campaigns = useMemo(() => campaignsQuery.data ?? [], [campaignsQuery.data]);
  const search = Route.useSearch();
  const q = search.q ?? "";
  const status = search.status ?? "all";
  const navigate = useNavigate();
  const [selected, setSelected] = useState<CampaignRecord | null>(null);
  const filtered = useMemo(() => filterCampaigns(campaigns, q, status), [campaigns, q, status]);
  const stats = useMemo(() => getCampaignStats(campaigns), [campaigns]);

  const setSearch = (patch: { q?: string; status?: CampaignStatusFilter }) =>
    navigate({ to: "/campaigns", search: (prev) => ({ ...prev, ...patch }), replace: true });

  return (
    <AdminShell
      title="Campaign history"
      description="A complete record of your campaign submissions and their outcomes."
      actions={<Button asChild size="sm"><Link to="/dashboard"><Plus /> New campaign</Link></Button>}
    >
      <main className="mx-auto max-w-[1500px] space-y-6 p-4 sm:p-6 lg:p-8">
        <section className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
          <StatCard label="Total campaigns" value={stats.total} icon={Layers3} detail="All recorded submissions" />
          <StatCard label="Received" value={stats.received} icon={CheckCircle2} detail="Accepted by the workflow" tone="success" />
          <StatCard label="Last 7 days" value={stats.thisWeek} icon={CalendarDays} detail="Recent campaign activity" tone="info" />
          <StatCard label="Needs attention" value={stats.attention} icon={AlertCircle} detail="Rejected or unconfirmed" tone="warning" />
        </section>

        <section className="overflow-hidden rounded-2xl border bg-card shadow-card">
          <div className="flex flex-col gap-4 border-b p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="font-display text-base font-semibold">All submissions</h2>
              <p className="mt-1 text-xs text-muted-foreground">Select a campaign to review its message parts and response.</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative sm:w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={q} onChange={(e) => setSearch({ q: e.target.value })} placeholder="Search ID or message…" className="pl-9" aria-label="Search campaigns" />
              </div>
              <select
                value={status}
                onChange={(e) => setSearch({ status: e.target.value as CampaignStatusFilter })}
                className="h-10 rounded-lg border border-input bg-card px-3 text-sm text-foreground shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/15"
                aria-label="Filter by status"
              >
                <option value="all">All statuses</option>
                {Object.entries(STATUS_META).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}
              </select>
            </div>
          </div>

          {campaignsQuery.isLoading ? (
            <div className="flex h-64 items-center justify-center gap-3 text-sm text-muted-foreground"><span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" /> Loading campaign history…</div>
          ) : campaignsQuery.isError ? (
            <EmptyState icon={AlertCircle} title="History couldn’t be loaded" description="Please refresh the page and try again." />
          ) : filtered.length === 0 ? (
            campaigns.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-primary"><History className="h-6 w-6" /></div>
                <h3 className="mt-5 font-display text-lg font-semibold">Your campaign history starts here</h3>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">Submit your first campaign and its content and workflow response will appear here.</p>
                <Button asChild className="mt-6"><Link to="/dashboard"><Plus /> Create your first campaign</Link></Button>
              </div>
            ) : <EmptyState icon={Search} title="No matching campaigns" description="Try a different search or status filter." />
          ) : (
            <>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/45 hover:bg-muted/45">
                      <TableHead className="px-5 py-3 text-[11px] uppercase tracking-wider">Campaign</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider">Submitted</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider">Parts</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider">Status</TableHead>
                      <TableHead className="w-12"><span className="sr-only">View</span></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((campaign) => (
                      <TableRow key={campaign.id} className="group cursor-pointer" onClick={() => setSelected(campaign)}>
                        <TableCell className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-primary"><Send className="h-4 w-4" /></div>
                            <div className="min-w-0">
                              <p className="max-w-[280px] truncate font-medium xl:max-w-[420px]">{campaign.campaignId}</p>
                              <p className="mt-0.5 max-w-[280px] truncate text-xs text-muted-foreground xl:max-w-[420px]">{getCampaignExcerpt(campaign)}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{formatCampaignDate(campaign.createdAt)}</TableCell>
                        <TableCell><span className="inline-flex items-center gap-1.5 text-xs"><Layers3 className="h-3.5 w-3.5 text-muted-foreground" />{campaign.parts.length}</span></TableCell>
                        <TableCell><StatusBadge status={campaign.status} /></TableCell>
                        <TableCell><Button variant="ghost" size="icon" aria-label={`View ${campaign.campaignId}`}><ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" /></Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="divide-y md:hidden">
                {filtered.map((campaign) => (
                  <button key={campaign.id} onClick={() => setSelected(campaign)} className="w-full space-y-3 p-4 text-left transition-colors hover:bg-muted/40">
                    <div className="flex items-start justify-between gap-3"><p className="break-all text-sm font-medium">{campaign.campaignId}</p><StatusBadge status={campaign.status} /></div>
                    <p className="line-clamp-2 text-xs text-muted-foreground">{getCampaignExcerpt(campaign)}</p>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground"><span>{formatCampaignDate(campaign.createdAt)}</span><span>{campaign.parts.length} part{campaign.parts.length === 1 ? "" : "s"}</span></div>
                  </button>
                ))}
              </div>
              <div className="border-t bg-muted/25 px-5 py-3 text-xs text-muted-foreground">Showing {filtered.length} of {campaigns.length} campaign{campaigns.length === 1 ? "" : "s"}</div>
            </>
          )}
        </section>
      </main>

      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="w-full overflow-y-auto p-0 sm:max-w-xl">
          {selected && (
            <>
              <SheetHeader className="border-b p-6 pr-12">
                <div className="flex items-center gap-3"><StatusBadge status={selected.status} /><span className="text-xs text-muted-foreground">{selected.parts.length} message part{selected.parts.length === 1 ? "" : "s"}</span></div>
                <SheetTitle className="break-all pt-2 font-display text-xl">{selected.campaignId}</SheetTitle>
                <SheetDescription>Submitted {formatCampaignDate(selected.createdAt)}</SheetDescription>
              </SheetHeader>
              <div className="space-y-6 p-6">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border bg-muted/35 p-3"><p className="text-[11px] uppercase tracking-wide text-muted-foreground">Workflow response</p><p className="mt-1 text-sm font-semibold">{selected.responseStatus ?? "No response"}</p></div>
                  <div className="rounded-xl border bg-muted/35 p-3"><p className="text-[11px] uppercase tracking-wide text-muted-foreground">Record updated</p><p className="mt-1 text-sm font-semibold">{new Intl.DateTimeFormat("en", { hour: "2-digit", minute: "2-digit" }).format(new Date(selected.updatedAt))}</p></div>
                </div>
                {selected.errorMessage && <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm leading-relaxed text-destructive">{selected.errorMessage}</div>}
                <div>
                  <h3 className="mb-3 font-display text-sm font-semibold">Message content</h3>
                  <div className="space-y-3">
                    {selected.parts.map((part, index) => {
                      const meta = TYPE_META[part.type];
                      return (
                        <div key={index} className="rounded-xl border bg-card p-4">
                          <div className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-[10px] text-secondary-foreground">{index + 1}</span><meta.icon className="h-3.5 w-3.5" />{meta.label}</div>
                          {part.type === "text" ? <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{part.text}</p> : (
                            <div className="space-y-2">
                              <a href={part.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 break-all rounded-lg bg-secondary p-3 text-xs text-secondary-foreground hover:text-primary">{part.type === "document" && part.filename ? part.filename : part.url}<ArrowUpRight className="ml-auto h-3.5 w-3.5 shrink-0" /></a>
                              {"caption" in part && part.caption && <p className="whitespace-pre-wrap text-sm">{part.caption}</p>}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <Button className="w-full" onClick={() => navigate({ to: "/dashboard", search: { reuse: selected.id } })}><Copy /> Reuse as new campaign</Button>
                <p className="text-center text-[11px] leading-relaxed text-muted-foreground">Reusing copies the message content into the composer with a new campaign ID. It does not resend automatically.</p>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </AdminShell>
  );
}

function getCampaignExcerpt(campaign: CampaignRecord) {
  const text = campaign.parts.find((part) => part.type === "text");
  if (text?.type === "text") return text.text;
  const first = campaign.parts[0];
  return first ? `${TYPE_META[first.type].label} message` : "No message content";
}

function StatCard({ label, value, detail, icon: Icon, tone = "primary" }: { label: string; value: number; detail: string; icon: typeof Eye; tone?: "primary" | "success" | "info" | "warning" }) {
  const tones = { primary: "bg-secondary text-primary", success: "bg-success/10 text-success", info: "bg-info/10 text-info", warning: "bg-warning text-warning-foreground" };
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-card sm:p-5">
      <div className="flex items-start justify-between gap-2"><div><p className="text-[11px] font-medium text-muted-foreground sm:text-xs">{label}</p><p className="mt-2 font-display text-2xl font-semibold tracking-tight sm:text-3xl">{campaignsQuerySafeValue(value)}</p></div><div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:h-10 sm:w-10 ${tones[tone]}`}><Icon className="h-[18px] w-[18px]" /></div></div>
      <p className="mt-3 text-[10px] leading-snug text-muted-foreground sm:text-[11px]">{detail}</p>
    </div>
  );
}

function campaignsQuerySafeValue(value: number) {
  return new Intl.NumberFormat("en").format(value);
}

function EmptyState({ icon: Icon, title, description }: { icon: typeof Eye; title: string; description: string }) {
  return <div className="px-6 py-16 text-center"><Icon className="mx-auto h-7 w-7 text-muted-foreground" /><h3 className="mt-4 font-display text-base font-semibold">{title}</h3><p className="mt-2 text-sm text-muted-foreground">{description}</p></div>;
}
