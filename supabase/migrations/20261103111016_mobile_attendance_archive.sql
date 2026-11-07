-- Class archive holds the class row lock before closing child sessions.
create function private.mobile_archive_attendance() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 update private.mobile_attendance_sessions set closed_at=clock_timestamp()
 where class_id=new.id and closed_at is null;
 return new;
end $$;
revoke all on function private.mobile_archive_attendance() from public,anon,authenticated;
create trigger mobile_archive_attendance after update of status on public.classes
for each row when(new.status='archived' and old.status is distinct from new.status)
execute function private.mobile_archive_attendance();
update private.mobile_attendance_sessions s set closed_at=coalesce(c.archived_at,clock_timestamp())
from public.classes c where c.id=s.class_id and c.status='archived' and s.closed_at is null;
