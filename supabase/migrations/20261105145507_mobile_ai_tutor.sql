-- One bounded window per account. No prompts or AI replies are stored.
create table private.mobile_ai_limits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  window_started_at timestamptz not null default clock_timestamp(),
  request_count integer not null check (request_count between 1 and 15)
);
alter table private.mobile_ai_limits enable row level security;
revoke all on private.mobile_ai_limits from public, anon, authenticated;

create function public.mobile_ai_access(p_reserve boolean default false)
returns text language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  used integer;
begin
  if actor is null then return 'AUTH_REQUIRED'; end if;
  if not exists (select 1 from public.profiles where id = actor and role in ('USER', 'TEACHER')) then
    return 'FORBIDDEN';
  end if;
  if public.current_user_has_active_assessment() then return 'TEST_ACTIVE'; end if;
  if not p_reserve then return 'OK'; end if;

  insert into private.mobile_ai_limits as limits (user_id, window_started_at, request_count)
  values (actor, clock_timestamp(), 1)
  on conflict (user_id) do update set
    window_started_at = case when limits.window_started_at <= clock_timestamp() - interval '1 hour'
      then clock_timestamp() else limits.window_started_at end,
    request_count = case when limits.window_started_at <= clock_timestamp() - interval '1 hour'
      then 1 else limits.request_count + 1 end
  where limits.window_started_at <= clock_timestamp() - interval '1 hour' or limits.request_count < 15
  returning request_count into used;
  if used is null then return 'RATE_LIMITED'; end if;
  return 'OK';
end $$;
revoke all on function public.mobile_ai_access(boolean) from public, anon;
grant execute on function public.mobile_ai_access(boolean) to authenticated;
