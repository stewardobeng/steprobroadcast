import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { contactSchema, groupSchema, type ContactInput, type GroupInput } from "@/lib/contacts/schema";
import { saveContact, saveGroup, deleteContactItem } from "@/lib/contacts/contacts.functions";
import { contactsQueryOptions, type ContactWorkspace } from "@/lib/contacts/queries";

export type EditorState = { kind: "contact"; value: ContactInput } | { kind: "group"; value: GroupInput };
export type DeleteState = { kind: "contact" | "group"; id: string; name: string };

function MembershipPicker({ label, items, selected, onChange }: { label: string; items: { id: string; name: string; detail?: string }[]; selected: string[]; onChange: (ids: string[]) => void }) {
  const [search, setSearch] = useState("");
  const filtered = items.filter((item) => `${item.name} ${item.detail ?? ""}`.toLowerCase().includes(search.toLowerCase()));
  return <div className="space-y-2">
    <div className="flex items-center justify-between"><Label>{label}</Label><span className="text-xs text-muted-foreground">{selected.length} selected</span></div>
    <Input aria-label={`Search ${label.toLowerCase()}`} placeholder={`Search ${label.toLowerCase()}…`} value={search} onChange={(e) => setSearch(e.target.value)} />
    <div className="max-h-48 overflow-y-auto rounded-lg border">
      {filtered.length ? filtered.map((item) => <label key={item.id} className="flex cursor-pointer items-center gap-3 border-b p-3 last:border-b-0 hover:bg-muted/50">
        <Checkbox aria-label={item.name} checked={selected.includes(item.id)} onCheckedChange={(checked) => onChange(checked ? [...selected, item.id] : selected.filter((id) => id !== item.id))} />
        <span className="min-w-0 text-sm"><span className="block break-words">{item.name}</span>{item.detail && <span className="block text-xs text-muted-foreground">{item.detail}</span>}</span>
      </label>) : <p className="p-4 text-sm text-muted-foreground">{items.length ? "No matches" : `No ${label.toLowerCase()} yet`}</p>}
    </div>
  </div>;
}

export function ContactEditor({ editor, workspace, onClose, onSuccess }: { editor: EditorState; workspace: ContactWorkspace; onClose: () => void; onSuccess: (message: string) => void }) {
  const [value, setValue] = useState(editor);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const saveContactFn = useServerFn(saveContact);
  const saveGroupFn = useServerFn(saveGroup);
  const queryClient = useQueryClient();
  const editing = !!value.value.id;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const parsed = value.kind === "contact" ? contactSchema.safeParse(value.value) : groupSchema.safeParse(value.value);
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Check the form."); return; }
    setPending(true);
    try {
      if (value.kind === "contact") await saveContactFn({ data: contactSchema.parse(value.value) });
      else await saveGroupFn({ data: groupSchema.parse(value.value) });
      await queryClient.invalidateQueries({ queryKey: contactsQueryOptions.queryKey });
      onSuccess(`${value.kind === "contact" ? "Contact" : "Group"} ${editing ? "updated" : "created"}.`);
      onClose();
    } catch (err) { setError(err instanceof Error ? err.message : "Couldn’t save. Please try again."); }
    finally { setPending(false); }
  }

  return <Dialog open onOpenChange={(open) => !open && !pending && onClose()}>
    <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-lg">
      <DialogHeader><DialogTitle>{editing ? "Edit" : "New"} {value.kind}</DialogTitle><DialogDescription>{value.kind === "contact" ? "Contact details and group memberships" : "Group details and members"}</DialogDescription></DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        {value.kind === "contact" ? <>
          <div className="space-y-2"><Label htmlFor="contact-name">Name</Label><Input id="contact-name" required maxLength={120} value={value.value.name} onChange={(e) => setValue({ kind: "contact", value: { ...value.value, name: e.target.value } })} /></div>
          <div className="space-y-2"><Label htmlFor="contact-phone">WhatsApp number</Label><Input id="contact-phone" type="tel" required placeholder="+233241234567" value={value.value.phone} onChange={(e) => setValue({ kind: "contact", value: { ...value.value, phone: e.target.value } })} /></div>
          <div className="space-y-2"><Label htmlFor="contact-email">Email <span className="text-muted-foreground">(optional)</span></Label><Input id="contact-email" type="email" value={value.value.email} onChange={(e) => setValue({ kind: "contact", value: { ...value.value, email: e.target.value } })} /></div>
          <div className="space-y-2"><Label htmlFor="contact-notes">Notes</Label><Textarea id="contact-notes" maxLength={2000} value={value.value.notes} onChange={(e) => setValue({ kind: "contact", value: { ...value.value, notes: e.target.value } })} /></div>
          <MembershipPicker label="Groups" items={workspace.groups} selected={value.value.groupIds} onChange={(groupIds) => setValue({ kind: "contact", value: { ...value.value, groupIds } })} />
        </> : <>
          <div className="space-y-2"><Label htmlFor="group-name">Group name</Label><Input id="group-name" required maxLength={120} value={value.value.name} onChange={(e) => setValue({ kind: "group", value: { ...value.value, name: e.target.value } })} /></div>
          <div className="space-y-2"><Label htmlFor="group-description">Description</Label><Textarea id="group-description" maxLength={1000} value={value.value.description} onChange={(e) => setValue({ kind: "group", value: { ...value.value, description: e.target.value } })} /></div>
          <MembershipPicker label="Contacts" items={workspace.contacts.map((c) => ({ ...c, detail: c.phone }))} selected={value.value.contactIds} onChange={(contactIds) => setValue({ kind: "group", value: { ...value.value, contactIds } })} />
        </>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2 border-t pt-4"><Button type="button" variant="outline" disabled={pending} onClick={onClose}>Cancel</Button><Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save changes"}</Button></div>
      </form>
    </DialogContent>
  </Dialog>;
}

export function DeleteContactDialog({ item, onClose, onSuccess }: { item: DeleteState; onClose: () => void; onSuccess: (message: string) => void }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const remove = useServerFn(deleteContactItem);
  const queryClient = useQueryClient();
  async function confirm() {
    setPending(true); setError("");
    try {
      await remove({ data: { id: item.id, kind: item.kind } });
      await queryClient.invalidateQueries({ queryKey: contactsQueryOptions.queryKey });
      onSuccess(`${item.kind === "contact" ? "Contact" : "Group"} deleted.`); onClose();
    } catch (err) { setError(err instanceof Error ? err.message : "Couldn’t delete."); }
    finally { setPending(false); }
  }
  return <Dialog open onOpenChange={(open) => !open && !pending && onClose()}><DialogContent className="w-[calc(100%-2rem)] rounded-lg">
    <DialogHeader><DialogTitle>Delete {item.kind}?</DialogTitle><DialogDescription className="break-words">{item.name}</DialogDescription></DialogHeader>
    <p className="text-sm text-muted-foreground">{item.kind === "group" ? "The group will be removed. Its contacts will remain in your contact list." : "This contact and all its group memberships will be permanently removed."}</p>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <div className="flex justify-end gap-2"><Button variant="outline" disabled={pending} onClick={onClose}>Cancel</Button><Button variant="destructive" disabled={pending} onClick={confirm}>{pending ? "Deleting…" : "Delete permanently"}</Button></div>
  </DialogContent></Dialog>;
}