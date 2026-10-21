-- DCC Table cloud save. Run this once in Supabase: SQL Editor → New query → paste → Run.

-- One saved campaign per account.
create table if not exists public.campaign_saves (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  name text,
  data jsonb not null,
  device text,
  saved_at timestamptz not null default now()
);

alter table public.campaign_saves enable row level security;

drop policy if exists "read own save" on public.campaign_saves;
drop policy if exists "insert own save" on public.campaign_saves;
drop policy if exists "update own save" on public.campaign_saves;
drop policy if exists "delete own save" on public.campaign_saves;
create policy "read own save" on public.campaign_saves for select using (auth.uid() = user_id);
create policy "insert own save" on public.campaign_saves for insert with check (auth.uid() = user_id);
create policy "update own save" on public.campaign_saves for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete own save" on public.campaign_saves for delete using (auth.uid() = user_id);

-- Private storage for uploaded maps and token images, one folder per account.
insert into storage.buckets (id, name, public) values ('campaign-assets', 'campaign-assets', false)
on conflict (id) do nothing;

drop policy if exists "read own assets" on storage.objects;
drop policy if exists "upload own assets" on storage.objects;
drop policy if exists "update own assets" on storage.objects;
drop policy if exists "delete own assets" on storage.objects;
create policy "read own assets" on storage.objects for select
  using (bucket_id = 'campaign-assets' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "upload own assets" on storage.objects for insert
  with check (bucket_id = 'campaign-assets' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "update own assets" on storage.objects for update
  using (bucket_id = 'campaign-assets' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "delete own assets" on storage.objects for delete
  using (bucket_id = 'campaign-assets' and (storage.foldername(name))[1] = auth.uid()::text);
