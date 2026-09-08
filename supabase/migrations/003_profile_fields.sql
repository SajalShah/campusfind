-- ============================================================
-- 003_profile_fields.sql
-- Adds editable profile fields and lets users update their own row.
-- Run in the Supabase SQL editor after 002_audit_and_storage.sql.
-- ============================================================

alter table public.users
  add column if not exists full_name text,
  add column if not exists student_id text;

-- Users likely already have a "select own row" policy from 001 — this
-- adds the missing UPDATE policy so they can edit their own profile.
-- (RLS policies are additive/OR'd, so this doesn't remove anything.)
create policy "Users can update their own profile"
  on public.users for update
  using (auth.uid() = id)
  with check (auth.uid() = id);
