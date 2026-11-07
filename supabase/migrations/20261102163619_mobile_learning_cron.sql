-- Deadline processing runs independently of the Android app.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
create function private.mobile_kick_grading() returns bigint language plpgsql security definer set search_path='' as $$
declare request_id bigint; begin
 if not exists(select 1 from private.mobile_attempts where (status='active' and expires_at<=clock_timestamp()) or (status='grading' and (lease_until is null or lease_until<clock_timestamp()))) then return null; end if;
 select net.http_post(
 url:='https://dadjfyjvalnaqqrmqpfa.supabase.co/functions/v1/mobile-grade',
 headers:=jsonb_build_object('Content-Type','application/json','x-mobile-cron',(select cron_key from private.mobile_runner_config where id)),
 body:='{}'::jsonb,timeout_milliseconds:=60000) into request_id;
 return request_id;
end $$;
revoke all on function private.mobile_kick_grading() from public,anon,authenticated;
select cron.schedule('quethink-mobile-pretest-deadlines','* * * * *','select private.mobile_kick_grading();');
