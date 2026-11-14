import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, History, Layers3, LockKeyhole, MessageSquareText, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sign in — Broadcast Desk" },
      { name: "description", content: "Administrator sign-in for preparing and reviewing WhatsApp broadcast campaigns." },
      { property: "og:title", content: "Sign in — Broadcast Desk" },
      { property: "og:description", content: "Administrator sign-in for preparing and reviewing WhatsApp broadcast campaigns." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SignIn,
});

function SignIn() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) return setError(error.message);
    navigate({ to: "/dashboard" });
  }

  return (
    <main className="grid min-h-screen bg-card lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden overflow-hidden bg-sidebar p-12 text-sidebar-foreground lg:flex lg:flex-col xl:p-16">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground"><MessageSquareText className="h-5 w-5" /></div>
          <div><p className="font-display text-lg font-semibold">Broadcast Desk</p><p className="text-xs text-sidebar-foreground/50">Campaign operations</p></div>
        </div>
        <div className="my-auto max-w-xl py-16">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-sidebar-border bg-sidebar-accent/50 px-3 py-1.5 text-xs text-sidebar-foreground/75"><Send className="h-3.5 w-3.5 text-sidebar-primary" /> WhatsApp campaign management</div>
          <h1 className="font-display text-4xl font-semibold leading-[1.15] tracking-tight xl:text-5xl">Every broadcast,<br />clearly organised.</h1>
          <p className="mt-6 max-w-md text-base leading-relaxed text-sidebar-foreground/60">Compose thoughtful campaigns, preview every message, and keep a reliable record of each submission in one focused workspace.</p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            <Feature icon={Layers3} title="Ordered message parts" detail="Text, media, audio, and documents" />
            <Feature icon={History} title="Complete history" detail="Search content and review outcomes" />
          </div>
        </div>
        <p className="text-xs text-sidebar-foreground/40">A private workspace for authorised administrators.</p>
        <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full border-[70px] border-sidebar-accent/30" />
      </section>

      <section className="flex items-center justify-center bg-background px-5 py-12 sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground"><MessageSquareText className="h-5 w-5" /></div>
            <div><p className="font-display text-xl font-semibold">Broadcast Desk</p><p className="text-xs text-muted-foreground">Campaign operations</p></div>
          </div>
          <div className="mb-8">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-primary">Administrator portal</p>
            <h2 className="font-display text-3xl font-semibold tracking-tight">Welcome back</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Sign in to create campaigns and review your submission history.</p>
          </div>
          <form onSubmit={onSubmit} className="space-y-5">
            <div className="space-y-2"><Label htmlFor="email">Email address</Label><Input id="email" type="email" autoComplete="email" placeholder="you@company.com" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-11" /></div>
            <div className="space-y-2"><div className="flex items-center justify-between"><Label htmlFor="password">Password</Label><LockKeyhole className="h-3.5 w-3.5 text-muted-foreground" /></div><Input id="password" type="password" autoComplete="current-password" placeholder="Enter your password" required value={password} onChange={(e) => setPassword(e.target.value)} className="h-11" /></div>
            {error && <div role="alert" className="rounded-lg border border-destructive/20 bg-destructive/5 px-3.5 py-3 text-sm text-destructive">{error}</div>}
            <Button type="submit" className="h-11 w-full" disabled={busy}>{busy ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />Signing in…</> : <>Sign in to workspace<CheckCircle2 /></>}</Button>
          </form>
          <div className="mt-8 border-t pt-6 text-center text-xs leading-relaxed text-muted-foreground">Accounts are created by the workspace owner.<br />There is no public sign-up.</div>
        </div>
      </section>
    </main>
  );
}

function Feature({ icon: Icon, title, detail }: { icon: typeof Layers3; title: string; detail: string }) {
  return <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/35 p-4"><Icon className="h-5 w-5 text-sidebar-primary" /><p className="mt-3 text-sm font-medium">{title}</p><p className="mt-1 text-xs leading-relaxed text-sidebar-foreground/50">{detail}</p></div>;
}
