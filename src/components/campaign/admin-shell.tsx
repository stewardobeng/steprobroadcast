import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { History, LayoutDashboard, LogOut, Menu, MessageSquareText, Plus, Users, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminSession } from "@/hooks/use-admin-session";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const NAV = [
  { to: "/dashboard", label: "New campaign", icon: LayoutDashboard },
  { to: "/campaigns", label: "Campaign history", icon: History },
  { to: "/contacts", label: "Manage contacts & groups", icon: Users },
] as const;

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground shadow-lg">
        <MessageSquareText className="h-5 w-5" />
      </div>
      <div>
        <p className="font-display text-base font-semibold tracking-tight">Broadcast Desk</p>
        <p className="text-[11px] text-sidebar-foreground/55">Campaign operations</p>
      </div>
    </div>
  );
}

function Navigation({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="mt-9 space-y-1.5">
      <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/40">Workspace</p>
      {NAV.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          activeOptions={{ exact: true }}
          activeProps={{ className: "bg-sidebar-accent text-sidebar-foreground shadow-sm" }}
          inactiveProps={{ className: "text-sidebar-foreground/65 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground" }}
          className="flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors"
        >
          <item.icon className="h-[18px] w-[18px] shrink-0" />
          <span className="min-w-0 leading-snug">{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}

function SidebarFooter({ email, onSignOut }: { email: string | null | undefined; onSignOut: () => void | Promise<void> }) {
  return (
    <div className="mt-auto pt-8">
      <div className="flex items-center gap-3 border-t border-sidebar-border pt-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-xs font-semibold uppercase">
          {email?.slice(0, 2) || "AD"}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium">Administrator</p>
          <p className="truncate text-[11px] text-sidebar-foreground/50">{email}</p>
        </div>
        <button onClick={onSignOut} className="rounded-md p-2 text-sidebar-foreground/55 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground" aria-label="Sign out">
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function AdminShell({ title, description, actions, children }: { title: string; description: string; actions?: ReactNode; children: ReactNode }) {
  const session = useAdminSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  const email = session.data?.email;

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-sidebar px-4 py-5 text-sidebar-foreground lg:flex">
        <div className="px-2"><Brand /></div>
        <Navigation />
        <Button asChild className="mt-7 w-full bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/85">
          <Link to="/dashboard"><Plus className="h-4 w-4" /> Create campaign</Link>
        </Button>
        <SidebarFooter email={email} onSignOut={signOut} />
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b bg-card/90 backdrop-blur-xl">
          <div className="flex h-[72px] items-center gap-4 px-4 sm:px-6 lg:px-8">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation"><Menu className="h-5 w-5" /></Button>
              </SheetTrigger>
              <SheetContent side="left" className="flex w-72 flex-col border-sidebar-border bg-sidebar p-5 text-sidebar-foreground">
                <Brand />
                <Navigation onNavigate={() => setMobileOpen(false)} />
                <SidebarFooter email={email} onSignOut={signOut} />
              </SheetContent>
            </Sheet>
            <div className="min-w-0 flex-1">
              <h1 className="truncate font-display text-lg font-semibold tracking-tight sm:text-xl">{title}</h1>
              <p className="hidden text-xs text-muted-foreground sm:block">{description}</p>
            </div>
            {actions}
            <div className="hidden h-9 w-9 items-center justify-center rounded-full bg-secondary text-xs font-semibold uppercase text-secondary-foreground sm:flex">
              {email?.slice(0, 2) || "AD"}
            </div>
          </div>
        </header>

        {session.isLoading ? (
          <div className="flex min-h-[60vh] items-center justify-center gap-3 text-sm text-muted-foreground">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" /> Checking workspace access…
          </div>
        ) : !session.data?.admin ? (
          <div className="mx-auto max-w-md px-6 py-20 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10"><XCircle className="h-6 w-6 text-destructive" /></div>
            <h2 className="mt-5 font-display text-xl font-semibold">Administrator access required</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Your account is signed in but doesn’t have access to this workspace. Ask the workspace owner to grant administrator access.</p>
            <Button variant="outline" className="mt-6" onClick={signOut}><LogOut className="h-4 w-4" /> Sign out</Button>
          </div>
        ) : children}
      </div>
    </div>
  );
}
