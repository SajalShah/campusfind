-- ============================================================
-- 002_audit_and_storage.sql
-- Adds: audit_log table, item-images storage bucket + policies,
-- a public "browse" read policy on item_reports, and a trigger
-- that queues an email notification via the notify edge function.
-- Run this in the Supabase SQL editor AFTER 001_initial_schema.sql.
-- ============================================================

-- 1. Audit log ---------------------------------------------------
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.users(id),
  action text not null,             -- e.g. 'report_created', 'match_confirmed', 'item_claimed'
  entity_type text not null,        -- 'item_report' | 'match_suggestion' | 'admin_action'
  entity_id uuid,
  details jsonb default '{}'::jsonb,
  email_sent boolean default false,
  created_at timestamptz not null default now()
);

alter table public.audit_log enable row level security;

-- Admin-only, same pattern as match_suggestions / admin_actions.
create policy "Admins can read audit log"
  on public.audit_log for select
  using (
    exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'administrator')
  );

-- Inserts happen via the service role from the notify function / triggers,
-- so no insert policy is needed for regular users.

-- 2. Let students browse ALL open reports (not just their own) --
-- item_reports likely already has an "owner can select own rows" policy
-- from 001; this ADDS a second policy rather than replacing it, since
-- Postgres RLS policies are OR'd together.
create policy "Authenticated users can browse all reports"
  on public.item_reports for select
  to authenticated
  using (true);

-- 3. Storage bucket for optional item photos ---------------------
insert into storage.buckets (id, name, public)
values ('item-images', 'item-images', true)
on conflict (id) do nothing;

create policy "Anyone can view item images"
  on storage.objects for select
  using (bucket_id = 'item-images');

create policy "Authenticated users can upload their own item images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'item-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 4. Trigger: queue a notification whenever a report or a match --
--    is created. Requires the pg_net extension (enabled by default
--    on Supabase) to call the notify edge function over HTTP.
create extension if not exists pg_net;

create or replace function public.queue_notification()
returns trigger
language plpgsql
security definer
as $$
declare
  action_name text;
begin
  if TG_TABLE_NAME = 'item_reports' then
    action_name := 'report_created';
  elsif TG_TABLE_NAME = 'match_suggestions' then
    action_name := 'match_suggested';
  end if;

  insert into public.audit_log (actor_id, action, entity_type, entity_id, details)
  values (
    coalesce(new.user_id, null),
    action_name,
    TG_TABLE_NAME,
    new.id,
    to_jsonb(new)
  );

  -- Fire-and-forget call to the edge function; failures here must never
  -- block the underlying insert, hence no exception propagation.
  perform net.http_post(
    url := current_setting('app.notify_function_url', true),
    body := jsonb_build_object(
      'action', action_name,
      'entity_type', TG_TABLE_NAME,
      'entity_id', new.id
    )
  );

  return new;
exception when others then
  return new;
end;
$$;

drop trigger if exists trg_notify_report on public.item_reports;
create trigger trg_notify_report
  after insert on public.item_reports
  for each row execute function public.queue_notification();

drop trigger if exists trg_notify_match on public.match_suggestions;
create trigger trg_notify_match
  after insert on public.match_suggestions
  for each row execute function public.queue_notification();

-- After deploying the notify edge function, set its URL once:
--   alter database postgres set app.notify_function_url =
--     'https://duzybzrpnabciwvnfpqi.supabase.co/functions/v1/notify';
