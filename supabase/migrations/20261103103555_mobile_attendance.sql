-- QR attendance: private records, rotating hashed tokens, ownership and audit.
create table private.mobile_attendance_sessions (
 id uuid primary key default gen_random_uuid(), class_id uuid not null references public.classes(id) on delete cascade,
 opened_by uuid not null references public.profiles(id), title text not null check(length(title) between 1 and 120),
 starts_at timestamptz not null default clock_timestamp(), expires_at timestamptz not null,
 closed_at timestamptz, check(expires_at>starts_at)
);
create index mobile_attendance_class_idx on private.mobile_attendance_sessions(class_id,starts_at desc,id desc);
create index mobile_attendance_opener_idx on private.mobile_attendance_sessions(opened_by);
create unique index mobile_attendance_one_open on private.mobile_attendance_sessions(class_id) where closed_at is null;
create table private.mobile_attendance_tokens (
 token_hash bytea primary key,session_id uuid not null references private.mobile_attendance_sessions(id) on delete cascade,
 expires_at timestamptz not null
);
create index mobile_attendance_token_session_idx on private.mobile_attendance_tokens(session_id);
create table private.mobile_attendance_records (
 session_id uuid not null references private.mobile_attendance_sessions(id) on delete cascade,
 student_id uuid not null references public.profiles(id), state text not null check(state in ('present','absent','excused','sick')),
 source text not null check(source in ('qr','manual')), revision int not null default 1 check(revision>0),
 updated_at timestamptz not null default clock_timestamp(), actor_id uuid not null references public.profiles(id),
 primary key(session_id,student_id)
);
create index mobile_attendance_student_idx on private.mobile_attendance_records(student_id);
create index mobile_attendance_actor_idx on private.mobile_attendance_records(actor_id);
create table private.mobile_attendance_audit (
 id bigint generated always as identity primary key, session_id uuid not null references private.mobile_attendance_sessions(id) on delete cascade,
 student_id uuid not null references public.profiles(id), actor_id uuid not null references public.profiles(id),
 old_state text,new_state text not null,reason text not null check(length(reason) between 3 and 500),
 created_at timestamptz not null default clock_timestamp()
);
create index mobile_attendance_audit_session_idx on private.mobile_attendance_audit(session_id,student_id,id desc);
create index mobile_attendance_audit_student_idx on private.mobile_attendance_audit(student_id);
create index mobile_attendance_audit_actor_idx on private.mobile_attendance_audit(actor_id);
alter table private.mobile_attendance_sessions enable row level security;
alter table private.mobile_attendance_tokens enable row level security;
alter table private.mobile_attendance_records enable row level security;
alter table private.mobile_attendance_audit enable row level security;
revoke all on private.mobile_attendance_sessions,private.mobile_attendance_tokens,private.mobile_attendance_records,private.mobile_attendance_audit from public,anon,authenticated;

create function private.mobile_attendance_json(s private.mobile_attendance_sessions,p_student uuid default null) returns jsonb
language sql stable set search_path='' as $$
 select jsonb_build_object('id',s.id,'classId',s.class_id,'title',s.title,'startsAt',s.starts_at,'expiresAt',s.expires_at,
 'status',case when s.closed_at is not null then 'closed' when s.expires_at<=clock_timestamp() then 'expired' else 'active' end,
 'record',(select to_jsonb(r)-'session_id'-'student_id'-'actor_id' from private.mobile_attendance_records r where r.session_id=s.id and r.student_id=p_student))
$$;
revoke all on function private.mobile_attendance_json(private.mobile_attendance_sessions,uuid) from public,anon,authenticated;

create function private.mobile_attendance(p_action text,p_payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 u uuid:=auth.uid(); role_name public.app_role; c public.classes%rowtype; s private.mobile_attendance_sessions%rowtype;
 r private.mobile_attendance_records%rowtype; sid uuid; cid uuid; student uuid; stamp timestamptz:=clock_timestamp();
 token text; reason text; state_value text; title_value text; duration_value int; expected int; result jsonb; items jsonb;
 cursor_value jsonb; last_id uuid; audit_items jsonb;
begin
 if u is null then return private.mobile_error('UNAUTHENTICATED'); end if;
 select role into role_name from public.profiles where id=u;
 if role_name not in ('USER','TEACHER') or role_name is null then return private.mobile_error('FORBIDDEN'); end if;
 if p_payload is null or jsonb_typeof(p_payload)<>'object' then return private.mobile_error('VALIDATION_ERROR'); end if;
 if p_action not in ('list','session','start','close','qr','scan','roster','correct','record') or p_action is null then return private.mobile_error('VALIDATION_ERROR'); end if;
 if p_action in ('start','close','qr','roster','correct','record') and role_name<>'TEACHER' then return private.mobile_error('FORBIDDEN'); end if;
 if p_action='scan' and role_name<>'USER' then return private.mobile_error('FORBIDDEN'); end if;
 if p_action in ('list','start') then
  if role_name='USER' then select class_id into cid from public.class_memberships where student_id=u;
  else cid:=(p_payload->>'classId')::uuid; end if;
 else
  sid:=(p_payload->>'sessionId')::uuid;
  select class_id into cid from private.mobile_attendance_sessions where id=sid;
 end if;
 -- All mutations lock class before session/record, matching class archive.
 if p_action in ('start','close','qr','scan','correct') then select * into c from public.classes where id=cid for update;
 else select * into c from public.classes where id=cid; end if;
 stamp:=clock_timestamp();
 if c.id is null then
  if p_action='list' and role_name='USER' then return jsonb_build_object('data',jsonb_build_object('class',null,'items','[]'::jsonb,'nextCursor',null)); end if;
  return private.mobile_error('FORBIDDEN');
 end if;
 if not ((role_name='TEACHER' and c.teacher_id=u) or (role_name='USER' and exists(select 1 from public.class_memberships where class_id=c.id and student_id=u))) then return private.mobile_error('FORBIDDEN'); end if;
 if p_action in ('start','close','qr','scan','correct') and c.status<>'active' then return private.mobile_error('CLASS_ARCHIVED'); end if;
 if sid is not null then select * into s from private.mobile_attendance_sessions where id=sid; end if;
 if p_action='list' then
  cursor_value:=nullif(p_payload->>'cursor','')::jsonb;
  select coalesce(jsonb_agg(private.mobile_attendance_json(q,case when role_name='USER' then u end) order by q.starts_at desc,q.id desc),'[]') into items
  from (select * from private.mobile_attendance_sessions where class_id=c.id and (cursor_value is null or (starts_at,id)<((cursor_value->>'at')::timestamptz,(cursor_value->>'id')::uuid)) order by starts_at desc,id desc limit 20) q;
  return jsonb_build_object('data',jsonb_build_object('class',private.mobile_class_json(c,false),'items',items,'serverTime',stamp,'nextCursor',case when jsonb_array_length(items)=20 then jsonb_build_object('at',items->19->>'startsAt','id',items->19->>'id')::text end));
 elsif p_action='start' then
  title_value:=btrim(p_payload->>'title'); duration_value:=(p_payload->>'minutes')::int;
  if title_value is null or length(title_value) not between 1 and 120 or duration_value is null or duration_value not between 1 and 180 then return private.mobile_error('VALIDATION_ERROR'); end if;
  update private.mobile_attendance_sessions set closed_at=stamp where class_id=c.id and closed_at is null and expires_at<=stamp;
  if exists(select 1 from private.mobile_attendance_sessions where class_id=c.id and closed_at is null) then return private.mobile_error('SESSION_ALREADY_OPEN'); end if;
  insert into private.mobile_attendance_sessions(class_id,opened_by,title,starts_at,expires_at) values(c.id,u,title_value,stamp,stamp+make_interval(mins=>duration_value)) returning * into s;
 elsif p_action='close' then
  update private.mobile_attendance_sessions set closed_at=coalesce(closed_at,stamp) where id=s.id returning * into s;
 elsif p_action='qr' then
  if s.closed_at is not null or s.expires_at<=stamp then return private.mobile_error('SESSION_CLOSED'); end if;
  token:=replace(gen_random_uuid()::text||gen_random_uuid()::text,'-','');
  delete from private.mobile_attendance_tokens where session_id=s.id and expires_at<=stamp;
  insert into private.mobile_attendance_tokens values(sha256(convert_to(token,'UTF8')),s.id,least(stamp+interval '45 seconds',s.expires_at));
  return jsonb_build_object('data',jsonb_build_object('value','quethink-attendance:v1:'||s.id::text||':'||token,'expiresAt',least(stamp+interval '45 seconds',s.expires_at),'serverTime',stamp));
 elsif p_action='scan' then
  if private.mobile_has_active_test(u) then return private.mobile_error('OTHER_TEST_ACTIVE'); end if;
  if s.closed_at is not null or s.expires_at<=stamp then return private.mobile_error('SESSION_CLOSED'); end if;
  token:=p_payload->>'token';
  if token is null or token!~'^[0-9a-f]{64}$' or not exists(select 1 from private.mobile_attendance_tokens where session_id=s.id and token_hash=sha256(convert_to(token,'UTF8')) and expires_at>stamp) then return private.mobile_error('QR_EXPIRED'); end if;
  select * into r from private.mobile_attendance_records where session_id=s.id and student_id=u;
  if r.session_id is null then insert into private.mobile_attendance_records(session_id,student_id,state,source,actor_id) values(s.id,u,'present','qr',u) returning * into r;
   result:=jsonb_build_object('alreadyRecorded',false);
  else result:=jsonb_build_object('alreadyRecorded',true); end if;
  return jsonb_build_object('data',result||jsonb_build_object('session',private.mobile_attendance_json(s,u)));
 elsif p_action='roster' then
  last_id:=nullif(p_payload->>'cursor','')::uuid;
  select coalesce(jsonb_agg(jsonb_build_object('id',q.student_id,'name',q.display_name,'nim',q.nim,'state',q.state,'revision',coalesce(q.revision,0),'source',q.source) order by q.student_id),'[]') into items
  from(select m.student_id,p.display_name,p.nim,rr.state,rr.revision,rr.source from public.class_memberships m join public.profiles p on p.id=m.student_id left join private.mobile_attendance_records rr on rr.session_id=s.id and rr.student_id=m.student_id where m.class_id=c.id and (last_id is null or m.student_id>last_id) order by m.student_id limit 50) q;
  return jsonb_build_object('data',jsonb_build_object('items',items,'nextCursor',case when jsonb_array_length(items)=50 then items->49->>'id' end,'session',private.mobile_attendance_json(s),'archived',c.status<>'active'));
 elsif p_action in ('correct','record') then
  student:=(p_payload->>'studentId')::uuid;
  if not exists(select 1 from public.class_memberships where class_id=c.id and student_id=student) then return private.mobile_error('FORBIDDEN'); end if;
  select * into r from private.mobile_attendance_records where session_id=s.id and student_id=student;
  if p_action='correct' then
   state_value:=p_payload->>'state';reason:=btrim(p_payload->>'reason');expected:=(p_payload->>'revision')::int;
   if state_value is null or state_value not in ('present','absent','excused','sick') or reason is null or length(reason) not between 3 and 500 or expected is null then return private.mobile_error('VALIDATION_ERROR'); end if;
   if expected<>coalesce(r.revision,0) then return private.mobile_error('REVISION_CONFLICT'); end if;
   insert into private.mobile_attendance_audit(session_id,student_id,actor_id,old_state,new_state,reason) values(s.id,student,u,r.state,state_value,reason);
   insert into private.mobile_attendance_records(session_id,student_id,state,source,actor_id) values(s.id,student,state_value,'manual',u)
   on conflict(session_id,student_id) do update set state=excluded.state,source='manual',revision=mobile_attendance_records.revision+1,actor_id=u,updated_at=stamp returning * into r;
  end if;
  -- Bounded audit page, keyset cursor is an opaque bigint string.
  select coalesce(jsonb_agg(to_jsonb(q) order by q.id::bigint desc),'[]') into audit_items from(select a.id::text id,a.old_state,a.new_state,a.reason,a.created_at from private.mobile_attendance_audit a where a.session_id=s.id and a.student_id=student and (nullif(p_payload->>'cursor','') is null or a.id<(p_payload->>'cursor')::bigint) order by a.id desc limit 20) q;
  return jsonb_build_object('data',jsonb_build_object('name',(select display_name from public.profiles where id=student),'record',case when r.session_id is null then null else to_jsonb(r)-'actor_id'-'student_id'-'session_id' end,'audit',audit_items,'nextCursor',case when jsonb_array_length(audit_items)=20 then audit_items->19->>'id' end,'archived',c.status<>'active','session',private.mobile_attendance_json(s)));
 end if;
 return jsonb_build_object('data',jsonb_build_object('session',private.mobile_attendance_json(s,case when role_name='USER' then u end),'class',private.mobile_class_json(c,false),'serverTime',stamp,
 'counts',case when role_name='TEACHER' then (select jsonb_build_object('present',count(*) filter(where state='present'),'absent',count(*) filter(where state='absent'),'excused',count(*) filter(where state='excused'),'sick',count(*) filter(where state='sick')) from private.mobile_attendance_records where session_id=s.id) end));
exception when invalid_text_representation or numeric_value_out_of_range or datetime_field_overflow then return private.mobile_error('VALIDATION_ERROR');
end $$;
revoke all on function private.mobile_attendance(text,jsonb) from public,anon;
grant execute on function private.mobile_attendance(text,jsonb) to authenticated;
create function public.mobile_attendance(p_action text,p_payload jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$ select private.mobile_attendance(p_action,p_payload) $$;
revoke all on function public.mobile_attendance(text,jsonb) from public,anon;
grant execute on function public.mobile_attendance(text,jsonb) to authenticated;
