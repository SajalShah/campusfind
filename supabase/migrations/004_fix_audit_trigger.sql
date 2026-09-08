-- ============================================================
-- 004_fix_audit_trigger.sql
-- Bug fix: the original trigger wrapped the audit_log insert AND the
-- notification HTTP call in one exception block. In PL/pgSQL, an error
-- anywhere in that block rolls back everything in it — including the
-- audit_log insert — even though the insert had already "succeeded".
-- This isolates the HTTP call in its own nested block so a notification
-- failure (expected until the notify edge function is deployed) can
-- never wipe out the audit trail.
-- ============================================================

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

  -- Isolated sub-block: a failure here (e.g. notify function not deployed
  -- yet, or app.notify_function_url not set) is swallowed here and here
  -- only, so it can never undo the audit_log insert above.
  begin
    perform net.http_post(
      url := current_setting('app.notify_function_url', true),
      body := jsonb_build_object(
        'action', action_name,
        'entity_type', TG_TABLE_NAME,
        'entity_id', new.id
      )
    );
  exception when others then
    null;
  end;

  return new;
end;
$$;
