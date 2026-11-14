import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { FolderOpen, Pencil, Plus, Search, Trash2, Users, UserRound, X } from "lucide-react";
import { AdminShell } from "@/components/campaign/admin-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ContactEditor, DeleteContactDialog, type EditorState, type DeleteState } from "@/components/contacts/editors";
import { contactsQueryOptions } from "@/lib/contacts/queries";

export const Route = createFileRoute("/_authenticated/contacts")({
  loader: ({ context }) => context.queryClient.ensureQueryData(contactsQueryOptions),
  head: () => ({ meta: [
    { title: "Contacts & groups — Broadcast Desk" },
    { name: "description", content: "Manage WhatsApp contacts and organize contact groups in Broadcast Desk." },
    { property: "og:title", content: "Contacts & groups — Broadcast Desk" },
    { property: "og:description", content: "Manage WhatsApp contacts and organize contact groups in Broadcast Desk." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  pendingComponent: () => <AdminShell title="Contacts & groups" description=""><div className="p-8 text-sm text-muted-foreground">Loading contacts & groups…</div></AdminShell>,
  errorComponent: ({ reset }) => <AdminShell title="Contacts & groups" description=""><div className="p-8"><p className="mb-4 text-sm text-destructive">Contacts and groups couldn’t be loaded.</p><Button variant="outline" onClick={reset}>Try again</Button></div></AdminShell>,
  component: ContactsPage,
});

function ContactsPage() {
  const { data: workspace } = useSuspenseQuery(contactsQueryOptions);
  const [tab, setTab] = useState("contacts");
  const [q, setQ] = useState("");
  const [groupFilter, setGroupFilter] = useState("all");
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [deleting, setDeleting] = useState<DeleteState | null>(null);
  const [notice, setNotice] = useState("");
  const { contacts, groups, members } = workspace;
  const term = q.trim().toLowerCase();
  const filteredContacts = contacts.filter((c) => `${c.name} ${c.phone} ${c.email}`.toLowerCase().includes(term) && (groupFilter === "all" || (groupFilter === "ungrouped" ? !members.some((m) => m.contact_id === c.id) : members.some((m) => m.contact_id === c.id && m.group_id === groupFilter))));
  const filteredGroups = groups.filter((g) => `${g.name} ${g.description}`.toLowerCase().includes(term));
  const newContact = () => setEditor({ kind: "contact", value: { name: "", phone: "", email: "", notes: "", groupIds: groupFilter !== "all" && groupFilter !== "ungrouped" ? [groupFilter] : [] } });
  const newGroup = () => setEditor({ kind: "group", value: { name: "", description: "", contactIds: [] } });
  const ungrouped = contacts.filter((c) => !members.some((m) => m.contact_id === c.id)).length;

  return <AdminShell title="Contacts & groups" description="Your contact directory and audience groups.">
    <main className="mx-auto max-w-[1500px] p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-6">
        <div><p className="text-xs font-semibold uppercase tracking-wider text-primary">Address book</p><h2 className="mt-2 font-display text-2xl font-semibold">Manage your contacts</h2></div>
        <div className="flex gap-2"><Button variant="outline" onClick={newGroup}><FolderOpen className="h-4 w-4" /> New group</Button><Button onClick={newContact}><Plus className="h-4 w-4" /> Add contact</Button></div>
      </div>
      <div className="grid grid-cols-3 gap-3 border-b py-6">
        {[{ label: "Contacts", value: contacts.length, icon: UserRound, tone: "text-primary" }, { label: "Groups", value: groups.length, icon: Users, tone: "text-success" }, { label: "Ungrouped", value: ungrouped, icon: FolderOpen, tone: "text-info" }].map((s) => <div key={s.label} className="flex items-center gap-3"><s.icon className={`hidden h-5 w-5 sm:block ${s.tone}`} /><div><p className="text-xs text-muted-foreground">{s.label}</p><p className="mt-1 font-display text-2xl font-semibold">{s.value}</p></div></div>)}
      </div>
      {notice && <div role="status" className="mt-4 flex items-center justify-between gap-3 rounded-lg bg-success/10 px-4 py-3 text-sm text-success">{notice}<Button variant="ghost" size="icon" aria-label="Dismiss notification" onClick={() => setNotice("")}><X className="h-4 w-4" /></Button></div>}
      <div className="flex flex-wrap items-center justify-between gap-4 py-6">
        <Tabs value={tab} onValueChange={(v) => { setTab(v); setQ(""); }}><TabsList><TabsTrigger value="contacts"><UserRound className="mr-2 h-4 w-4" />Contacts</TabsTrigger><TabsTrigger value="groups"><Users className="mr-2 h-4 w-4" />Groups</TabsTrigger></TabsList></Tabs>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <div className="relative min-w-0 flex-1 sm:w-64"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label={`Search ${tab}`} placeholder={`Search ${tab}…`} className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          {tab === "contacts" && <select aria-label="Filter contacts by group" className="h-10 max-w-full rounded-lg border bg-card px-3 text-sm" value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)}><option value="all">All groups</option><option value="ungrouped">Ungrouped</option>{groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select>}
        </div>
      </div>
      {tab === "contacts" ? <>
        {!filteredContacts.length ? <Empty title={contacts.length ? "No matching contacts" : "No contacts yet"} action={contacts.length ? undefined : newContact} label="Add contact" /> : <div className="overflow-hidden rounded-lg border bg-card">
          <Table><TableHeader><TableRow className="bg-muted/50"><TableHead className="pl-4">Contact</TableHead><TableHead className="hidden sm:table-cell">WhatsApp number</TableHead><TableHead className="hidden xl:table-cell">Groups</TableHead><TableHead className="w-24 text-right pr-4">Actions</TableHead></TableRow></TableHeader>
            <TableBody>{filteredContacts.map((c) => {
              const contactGroups = groups.filter((g) => members.some((m) => m.contact_id === c.id && m.group_id === g.id));
              return <TableRow key={c.id}><TableCell className="max-w-0 py-4 pl-4"><div className="flex items-center gap-3"><div className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-primary sm:flex">{c.name.slice(0, 2).toUpperCase()}</div><div className="min-w-0"><p className="break-words font-semibold">{c.name}</p>{c.email && <p className="break-all text-xs text-muted-foreground">{c.email}</p>}<p className="mt-1 text-xs text-muted-foreground sm:hidden">{c.phone}</p><p className="mt-1 break-words text-xs text-muted-foreground xl:hidden">{contactGroups.map((g) => g.name).join(", ") || "Ungrouped"}</p></div></div></TableCell><TableCell className="hidden whitespace-nowrap text-sm sm:table-cell">{c.phone}</TableCell><TableCell className="hidden max-w-64 xl:table-cell"><div className="flex flex-wrap gap-1">{contactGroups.length ? contactGroups.map((g) => <span key={g.id} className="max-w-full break-words rounded-md bg-secondary px-2 py-1 text-xs text-secondary-foreground">{g.name}</span>) : <span className="text-xs text-muted-foreground">Ungrouped</span>}</div></TableCell><TableCell className="pr-3"><div className="flex justify-end"><Button variant="ghost" size="icon" title="Edit contact" aria-label={`Edit ${c.name}`} onClick={() => setEditor({ kind: "contact", value: { ...c, groupIds: contactGroups.map((g) => g.id) } })}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" title="Delete contact" aria-label={`Delete ${c.name}`} className="text-destructive" onClick={() => setDeleting({ kind: "contact", id: c.id, name: c.name })}><Trash2 className="h-4 w-4" /></Button></div></TableCell></TableRow>;
            })}</TableBody></Table>
          <div className="border-t px-4 py-3 text-xs text-muted-foreground">{filteredContacts.length} of {contacts.length} contacts</div>
        </div>}
      </> : <>
        {!filteredGroups.length ? <Empty title={groups.length ? "No matching groups" : "No groups yet"} action={groups.length ? undefined : newGroup} label="New group" /> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{filteredGroups.map((g) => {
          const groupContacts = contacts.filter((c) => members.some((m) => m.group_id === g.id && m.contact_id === c.id));
          return <article key={g.id} className="flex flex-col rounded-lg border bg-card p-5"><div className="flex items-start justify-between gap-2"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10 text-success"><Users className="h-5 w-5" /></div><div className="flex"><Button variant="ghost" size="icon" title="Edit group and members" aria-label={`Edit ${g.name}`} onClick={() => setEditor({ kind: "group", value: { ...g, contactIds: groupContacts.map((c) => c.id) } })}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" title="Delete group" aria-label={`Delete ${g.name}`} className="text-destructive" onClick={() => setDeleting({ kind: "group", id: g.id, name: g.name })}><Trash2 className="h-4 w-4" /></Button></div></div><h3 className="mt-4 break-words font-display text-base font-semibold">{g.name}</h3><p className="mt-2 line-clamp-2 break-words text-xs text-muted-foreground">{g.description || "No description"}</p><div className="mt-auto flex items-center justify-between gap-3 border-t pt-4 mt-5"><span className="text-xs text-muted-foreground">{groupContacts.length} contacts</span><Button variant="ghost" size="sm" onClick={() => { setGroupFilter(g.id); setTab("contacts"); setQ(""); }}>View contacts</Button></div></article>;
        })}</div>}
      </>}
    </main>
    {editor && <ContactEditor editor={editor} workspace={workspace} onClose={() => setEditor(null)} onSuccess={setNotice} />}
    {deleting && <DeleteContactDialog item={deleting} onClose={() => setDeleting(null)} onSuccess={setNotice} />}
  </AdminShell>;
}

function Empty({ title, action, label }: { title: string; action?: (() => void) | undefined; label: string }) {
  return <div className="border-y py-20 text-center"><Users className="mx-auto h-8 w-8 text-muted-foreground" /><h3 className="mt-4 font-display text-lg font-semibold">{title}</h3>{action && <Button className="mt-5" onClick={action}><Plus className="h-4 w-4" />{label}</Button>}</div>;
}