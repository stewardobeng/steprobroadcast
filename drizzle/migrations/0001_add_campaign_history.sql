create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  campaign_id text not null,
  parts jsonb not null,
  status text not null default 'sending' check (status in ('sending', 'submitted', 'rejected', 'unconfirmed', 'not_configured')),
  response_status integer,
  error_message text,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index campaigns_created_at_idx on public.campaigns (created_at desc);
create index campaigns_campaign_id_idx on public.campaigns (campaign_id);

grant select, insert, update on public.campaigns to authenticated;
grant all on public.campaigns to service_role;

alter table public.campaigns enable row level security;

create policy "Admins can view campaign history"
on public.campaigns for select to authenticated
using (public.has_role(auth.uid(), 'admin'));

create policy "Admins can record campaigns"
on public.campaigns for insert to authenticated
with check (public.has_role(auth.uid(), 'admin') and auth.uid() = created_by);

create policy "Admins can update campaign outcomes"
on public.campaigns for update to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));
