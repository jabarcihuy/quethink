-- Mobile learning is isolated from legacy web attempts and global progress.
create table private.mobile_materials (
 id uuid primary key default gen_random_uuid(), class_id uuid not null references public.classes(id) on delete cascade,
 source_lesson_id uuid references public.lessons(id) on delete set null, title text not null check(length(title) between 1 and 200),
 body text not null check(length(body)<=100000), position integer not null, requires_lab boolean not null default false,
 attachments jsonb not null default '[]' check(jsonb_typeof(attachments)='array'), unique(class_id,position)
);
create index mobile_material_source_idx on private.mobile_materials(source_lesson_id);
create table private.mobile_learning_settings (
 class_id uuid primary key references public.classes(id) on delete cascade,
 pretest_minutes integer not null default 20 check(pretest_minutes between 1 and 180), questions jsonb not null
);
create table private.mobile_attempts (
 id uuid primary key default gen_random_uuid(), class_id uuid not null references public.classes(id) on delete cascade,
 student_id uuid not null references public.profiles(id) on delete cascade, kind text not null default 'PRETEST' check(kind='PRETEST'),
 status text not null default 'active' check(status in ('active','grading','completed')),
 questions jsonb not null, answers jsonb not null default '{}' check(jsonb_typeof(answers)='object' and octet_length(answers::text)<=65536),
 revision integer not null default 0 check(revision>=0), started_at timestamptz not null default now(), expires_at timestamptz not null,
 submitted_at timestamptz, completed_at timestamptz, score numeric(5,2) check(score between 0 and 100), feedback jsonb,
 lease_id uuid, lease_until timestamptz, grade_error text, unique(class_id,student_id,kind), check(expires_at>started_at)
);
create index mobile_attempt_student_idx on private.mobile_attempts(student_id);
create index mobile_attempt_deadline_idx on private.mobile_attempts(expires_at) where status='active';
create index mobile_attempt_grading_idx on private.mobile_attempts(lease_until) where status='grading';
create table private.mobile_read_progress (
 material_id uuid not null references private.mobile_materials(id) on delete cascade,
 student_id uuid not null references public.profiles(id) on delete cascade, read_at timestamptz not null default now(), primary key(material_id,student_id)
);
create index mobile_read_student_idx on private.mobile_read_progress(student_id);
create table private.mobile_runner_config (id boolean primary key default true check(id), cron_key text not null);
insert into private.mobile_runner_config(cron_key) values(gen_random_uuid()::text||gen_random_uuid()::text);
alter table private.mobile_materials enable row level security;
alter table private.mobile_learning_settings enable row level security;
alter table private.mobile_attempts enable row level security;
alter table private.mobile_read_progress enable row level security;
alter table private.mobile_runner_config enable row level security;
revoke all on private.mobile_materials,private.mobile_learning_settings,private.mobile_attempts,private.mobile_read_progress,private.mobile_runner_config from public,anon,authenticated;

create function private.mobile_default_questions() returns jsonb language sql immutable set search_path='' as $seed$
 select '[{"id": "table", "kind": "choice", "prompt": "Which statement describes a table in a relational database?", "options": [{"id": "a", "text": "Rows about one kind of entity, arranged in columns"}, {"id": "b", "text": "A password for opening the database"}, {"id": "c", "text": "A single value without structure"}], "correct": "a", "explanation": "A table groups related records using a shared set of columns."}, {"id": "key", "kind": "choice", "prompt": "What is the purpose of a primary key?", "options": [{"id": "a", "text": "Identify each row uniquely"}, {"id": "b", "text": "Sort every query automatically"}, {"id": "c", "text": "Store the longest text"}], "correct": "a", "explanation": "A primary key uniquely identifies a record; it does not imply result ordering."}, {"id": "filter", "kind": "choice", "prompt": "Which SQL clause filters rows before they are returned?", "options": [{"id": "a", "text": "WHERE"}, {"id": "b", "text": "ORDER BY"}, {"id": "c", "text": "SELECT"}], "correct": "a", "explanation": "WHERE keeps rows that satisfy a predicate. ORDER BY sorts the result."}, {"id": "relation", "kind": "choice", "prompt": "Which constraint connects a record to a row in another table?", "options": [{"id": "a", "text": "Foreign key"}, {"id": "b", "text": "Column alias"}, {"id": "c", "text": "ORDER BY"}], "correct": "a", "explanation": "A foreign key references a key in another table and supports referential integrity."}, {"id": "select", "kind": "sql", "prompt": "Return only the name column of students whose cohort is 2025. Order the names alphabetically. Use one SQLite SELECT statement.", "reference": "SELECT name FROM students WHERE cohort = 2025 ORDER BY name", "explanation": "Filter with WHERE and order the projected names using ORDER BY."}, {"id": "count", "kind": "sql", "prompt": "Return the number of students in cohort 2024 as one value. Use one SQLite SELECT statement.", "reference": "SELECT COUNT(*) FROM students WHERE cohort = 2024", "explanation": "COUNT(*) counts rows remaining after the cohort filter."}]'::jsonb;
$seed$;
create function private.mobile_init_learning() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into private.mobile_learning_settings(class_id,questions) values(new.id,private.mobile_default_questions());
 insert into private.mobile_materials(class_id,source_lesson_id,title,body,position,requires_lab)
 select new.id,l.id,l.title,replace(l.content,E'\\n',E'\n'),row_number() over(order by c.position,c.id,l.position,l.id),
 exists(select 1 from public.exercises e where e.lesson_id=l.id and e.is_published and e.is_required)
 from public.lessons l join public.chapters c on c.id=l.chapter_id
 where c.learning_path_id=new.source_learning_path_id and c.is_published and l.is_published;
 return new;
end $$;
create trigger mobile_init_class_learning after insert on public.classes for each row execute function private.mobile_init_learning();
-- Backfill only new private learning rows; never rewrite legacy attempts/progress.
do $$ declare c public.classes%rowtype; begin
 for c in select * from public.classes loop
  insert into private.mobile_learning_settings(class_id,questions) values(c.id,private.mobile_default_questions());
  insert into private.mobile_materials(class_id,source_lesson_id,title,body,position,requires_lab)
  select c.id,l.id,l.title,replace(l.content,E'\\n',E'\n'),row_number() over(order by ch.position,ch.id,l.position,l.id),
  exists(select 1 from public.exercises e where e.lesson_id=l.id and e.is_published and e.is_required)
  from public.lessons l join public.chapters ch on ch.id=l.chapter_id
  where ch.learning_path_id=c.source_learning_path_id and ch.is_published and l.is_published;
 end loop;
end $$;

create function private.mobile_public_question(q jsonb) returns jsonb language sql immutable set search_path='' as $$
 select q - 'correct' - 'reference' - 'explanation';
$$;
create function private.mobile_attempt_summary(a private.mobile_attempts) returns jsonb language sql stable set search_path='' as $$
 select jsonb_build_object('id',a.id,'classId',a.class_id,'status',a.status,'startedAt',a.started_at,'expiresAt',a.expires_at,
 'submittedAt',a.submitted_at,'completedAt',a.completed_at,'score',a.score,'revision',a.revision);
$$;
create function private.mobile_has_active_test(p_uid uuid) returns boolean language sql stable set search_path='' as $$
 select exists(select 1 from private.mobile_attempts where student_id=p_uid and status<>'completed');
$$;
create or replace function public.current_user_has_active_assessment() returns boolean language plpgsql stable security definer set search_path='' as $$
declare active_legacy boolean:=false; begin
 if auth.uid() is null then return false; end if;
 if to_regclass('public.assessment_sessions') is not null then
  execute 'select exists(select 1 from public.assessment_sessions where user_id=$1 and status=''IN_PROGRESS'')' into active_legacy using auth.uid();
 end if;
 return active_legacy or private.mobile_has_active_test(auth.uid());
end $$;
create function private.mobile_archive_test() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.status='archived' and old.status<>'archived' then
  update private.mobile_attempts set status='grading',submitted_at=coalesce(submitted_at,now()) where class_id=new.id and status='active';
 end if; return new;
end $$;
create trigger mobile_archive_test after update of status on public.classes for each row execute function private.mobile_archive_test();

create function private.mobile_learning_dispatch(p_action text,p_payload jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare
 uid uuid:=auth.uid(); role public.app_role; c public.classes%rowtype; a private.mobile_attempts%rowtype;
 m private.mobile_materials%rowtype; settings private.mobile_learning_settings%rowtype;
 result jsonb; item jsonb; answer jsonb; item_id text; cid uuid; mid uuid; aid uuid; rev integer; unlocked boolean; done boolean;
 title_value text; body_value text; attachment jsonb; minutes_value integer;
begin
 if uid is null then return private.mobile_error('AUTH_REQUIRED'); end if;
 select p.role into role from public.profiles p where p.id=uid;
 if role is null or role not in ('USER','TEACHER') then return private.mobile_error('FORBIDDEN'); end if;
 if p_action in ('attempt','save','submit','result') then
  aid:=(p_payload->>'attemptId')::uuid;
  select class_id into cid from private.mobile_attempts where id=aid;
 elsif p_action in ('material','read','edit_material') then
  mid:=(p_payload->>'materialId')::uuid;
  select class_id into cid from private.mobile_materials where id=mid;
 elsif role='USER' then
  select class_id into cid from public.class_memberships where student_id=uid;
 else cid:=(p_payload->>'classId')::uuid;
 end if;
 if cid is null then return private.mobile_error('CLASS_REQUIRED'); end if;
 select * into c from public.classes where id=cid for update;
 if not found or not ((role='TEACHER' and c.teacher_id=uid) or (role='USER' and exists(select 1 from public.class_memberships where class_id=cid and student_id=uid))) then
  return private.mobile_error('FORBIDDEN'); end if;
 if role='USER' then select * into a from private.mobile_attempts where class_id=cid and student_id=uid; end if;
 select * into settings from private.mobile_learning_settings where class_id=cid;
 if not found then return private.mobile_error('LEARNING_UNAVAILABLE'); end if;

 if p_action='status' then
  select jsonb_build_object('class',private.mobile_class_json(c,role='TEACHER'),'attempt',case when a.id is null then null else private.mobile_attempt_summary(a) end,
   'materialCount',(select count(*) from private.mobile_materials where class_id=cid),
   'completedCount',(select count(*) from private.mobile_read_progress p join private.mobile_materials mm on mm.id=p.material_id where mm.class_id=cid and p.student_id=uid),
   'pretestMinutes',settings.pretest_minutes,'questionCount',jsonb_array_length(settings.questions),'serverTime',clock_timestamp()) into result;
 elsif p_action='start' then
  if role<>'USER' then return private.mobile_error('STUDENT_REQUIRED'); end if;
  if c.status<>'active' then return private.mobile_error('CLASS_ARCHIVED'); end if;
  if exists(select 1 from public.profiles where id=uid and (nullif(btrim(display_name),'') is null or nullif(btrim(nim),'') is null)) then return private.mobile_error('PROFILE_INCOMPLETE'); end if;
  if a.id is null and public.current_user_has_active_assessment() then return private.mobile_error('OTHER_TEST_ACTIVE'); end if;
  insert into private.mobile_attempts(class_id,student_id,questions,expires_at)
  select cid,uid,jsonb_agg(q order by gen_random_uuid()),now()+make_interval(mins=>settings.pretest_minutes) from jsonb_array_elements(settings.questions) q
  on conflict(class_id,student_id,kind) do nothing;
  select * into a from private.mobile_attempts where class_id=cid and student_id=uid;
  result:=private.mobile_attempt_summary(a);
 elsif p_action in ('attempt','save','submit','result') then
  select * into a from private.mobile_attempts where id=aid for update;
  if a.student_id<>uid and role<>'TEACHER' then return private.mobile_error('FORBIDDEN'); end if;
  if role='TEACHER' and p_action<>'result' then return private.mobile_error('STUDENT_REQUIRED'); end if;
  if a.status='active' and (clock_timestamp()>=a.expires_at or c.status='archived') then
   update private.mobile_attempts set status='grading',submitted_at=coalesce(submitted_at,clock_timestamp()) where id=a.id returning * into a;
  end if;
  if p_action='save' then
   if a.status<>'active' then return private.mobile_error('ATTEMPT_CLOSED'); end if;
   rev:=(p_payload->>'revision')::integer;
   if rev is null or rev<>a.revision then return private.mobile_error('REVISION_CONFLICT'); end if;
   result:=p_payload->'answers';
   if result is null or jsonb_typeof(result)<>'object' or octet_length(result::text)>65536 then return private.mobile_error('VALIDATION_ERROR'); end if;
   for item_id,answer in select key,value from jsonb_each(result) loop
    select q into item from jsonb_array_elements(a.questions) q where q->>'id'=item_id;
    if not found or jsonb_typeof(answer)<>'string' or length(answer#>>'{}')>4096 then return private.mobile_error('VALIDATION_ERROR'); end if;
    if item->>'kind'='choice' and not exists(select 1 from jsonb_array_elements(item->'options') o where o->>'id'=answer#>>'{}') then return private.mobile_error('VALIDATION_ERROR'); end if;
   end loop;
   update private.mobile_attempts set answers=result,revision=revision+1 where id=a.id returning * into a;
  elsif p_action='submit' and a.status='active' then
   update private.mobile_attempts set status='grading',submitted_at=clock_timestamp() where id=a.id returning * into a;
  end if;
  result:=private.mobile_attempt_summary(a)||jsonb_build_object('serverTime',clock_timestamp());
  if p_action in ('attempt','save') and a.status='active' then
   result:=result||jsonb_build_object('answers',a.answers,'questions',(select jsonb_agg(private.mobile_public_question(q)) from jsonb_array_elements(a.questions) q));
  end if;
  if p_action='result' then
   if a.status<>'completed' then return private.mobile_error('RESULT_PENDING'); end if;
   result:=result||jsonb_build_object('feedback',a.feedback);
  end if;
 elsif p_action='materials' then
  select coalesce(jsonb_agg(jsonb_build_object('id',mm.id,'title',mm.title,'position',mm.position,'requiresLab',mm.requires_lab,
   'completed',exists(select 1 from private.mobile_read_progress p where p.material_id=mm.id and p.student_id=uid),
   'available',role='TEACHER' or (a.status='completed' and not exists(select 1 from private.mobile_materials prev where prev.class_id=cid and prev.position<mm.position and not exists(select 1 from private.mobile_read_progress p where p.material_id=prev.id and p.student_id=uid)))) order by mm.position),'[]') into result
   from private.mobile_materials mm where mm.class_id=cid;
 elsif p_action in ('material','read','edit_material') then
  select * into m from private.mobile_materials where id=mid for update;
  unlocked:=role='TEACHER' or (a.status='completed' and not exists(select 1 from private.mobile_materials prev where prev.class_id=cid and prev.position<m.position and not exists(select 1 from private.mobile_read_progress p where p.material_id=prev.id and p.student_id=uid)));
  if not coalesce(unlocked,false) then return private.mobile_error('MATERIAL_LOCKED'); end if;
  if p_action='read' then
   if role<>'USER' then return private.mobile_error('STUDENT_REQUIRED'); end if;
   if c.status<>'active' then return private.mobile_error('CLASS_ARCHIVED'); end if;
   if m.requires_lab then return private.mobile_error('LAB_REQUIRED'); end if;
   insert into private.mobile_read_progress(material_id,student_id) values(mid,uid) on conflict do nothing;
  elsif p_action='edit_material' then
   if role<>'TEACHER' then return private.mobile_error('TEACHER_REQUIRED'); end if;
   if c.status<>'active' then return private.mobile_error('CLASS_ARCHIVED'); end if;
   if exists(select 1 from private.mobile_read_progress where material_id=mid) then return private.mobile_error('MATERIAL_IN_USE'); end if;
   title_value:=btrim(p_payload->>'title'); body_value:=p_payload->>'body';
   if title_value is null or length(title_value) not between 1 and 200 or body_value is null or length(body_value)>100000 or jsonb_typeof(p_payload->'requiresLab')<>'boolean' or jsonb_typeof(p_payload->'attachments')<>'array' or jsonb_array_length(p_payload->'attachments')>5 then return private.mobile_error('VALIDATION_ERROR'); end if;
   for attachment in select value from jsonb_array_elements(p_payload->'attachments') loop
    if attachment->>'type' not in ('pdf','video') or length(attachment->>'title') not between 1 and 100 or length(attachment->>'url')>2048 or attachment->>'url' !~ '^https://[^ /]+' then return private.mobile_error('VALIDATION_ERROR'); end if;
   end loop;
   update private.mobile_materials set title=title_value,body=body_value,requires_lab=(p_payload->>'requiresLab')::boolean,attachments=p_payload->'attachments' where id=mid returning * into m;
  end if;
  select exists(select 1 from private.mobile_read_progress where material_id=mid and student_id=uid) into done;
  result:=jsonb_build_object('id',m.id,'classId',cid,'title',m.title,'body',m.body,'position',m.position,'requiresLab',m.requires_lab,'attachments',m.attachments,'completed',done,'archived',c.status='archived');
 elsif p_action='settings' then
  if role<>'TEACHER' then return private.mobile_error('TEACHER_REQUIRED'); end if;
  if c.status<>'active' then return private.mobile_error('CLASS_ARCHIVED'); end if;
  minutes_value:=(p_payload->>'minutes')::integer;
  if minutes_value is null or minutes_value not between 1 and 180 then return private.mobile_error('VALIDATION_ERROR'); end if;
  if exists(select 1 from private.mobile_attempts where class_id=cid) then return private.mobile_error('ASSESSMENT_IN_USE'); end if;
  update private.mobile_learning_settings set pretest_minutes=minutes_value where class_id=cid;
  result:=jsonb_build_object('pretestMinutes',minutes_value);
 elsif p_action='results' then
  if role<>'TEACHER' then return private.mobile_error('TEACHER_REQUIRED'); end if;
  select coalesce(jsonb_agg(private.mobile_attempt_summary(aa)||jsonb_build_object('studentName',p.display_name,'nim',p.nim) order by aa.started_at desc),'[]') into result
  from private.mobile_attempts aa join public.profiles p on p.id=aa.student_id where aa.class_id=cid;
 else return private.mobile_error('INVALID_ACTION');
 end if;
 return jsonb_build_object('data',result);
exception when invalid_text_representation or numeric_value_out_of_range or datetime_field_overflow then return private.mobile_error('VALIDATION_ERROR');
end $$;
create function public.mobile_learning(p_action text,p_payload jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$ select private.mobile_learning_dispatch(p_action,p_payload); $$;

-- Only trusted Edge runtime may claim jobs and commit official grades.
create function private.mobile_grade_jobs_impl(p_id uuid default null,p_actor uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare a private.mobile_attempts%rowtype; token uuid:=gen_random_uuid(); begin
 select * into a from private.mobile_attempts aa where
 (p_id is null or aa.id=p_id) and (p_actor is null or aa.student_id=p_actor or exists(select 1 from public.classes c where c.id=aa.class_id and c.teacher_id=p_actor))
 and ((aa.status='active' and aa.expires_at<=clock_timestamp()) or (aa.status='grading' and (aa.lease_until is null or aa.lease_until<clock_timestamp())))
 order by aa.expires_at for update skip locked limit 1;
 if not found then return null; end if;
 update private.mobile_attempts set status='grading',submitted_at=coalesce(submitted_at,clock_timestamp()),lease_id=token,lease_until=clock_timestamp()+interval '90 seconds',grade_error=null where id=a.id;
 return jsonb_build_object('id',a.id,'lease',token,'questions',a.questions,'answers',a.answers);
end $$;
create function private.mobile_grade_commit_impl(p_id uuid,p_lease uuid,p_scores jsonb) returns boolean language plpgsql security definer set search_path='' as $$
declare a private.mobile_attempts%rowtype; q jsonb; s jsonb; v_feedback jsonb:='[]'; total integer:=0; earned integer:=0; ok boolean; begin
 select * into a from private.mobile_attempts where id=p_id for update;
 if not found or a.status<>'grading' or p_lease is null or a.lease_id is distinct from p_lease or a.lease_until is null or a.lease_until<clock_timestamp() then return false; end if;
 if p_scores is null or jsonb_typeof(p_scores)<>'object' then raise exception 'Invalid grader response'; end if;
 for q in select value from jsonb_array_elements(a.questions) loop
  s:=p_scores->(q->>'id');
  if s is null or jsonb_typeof(s)<>'boolean' then raise exception 'Invalid grader response'; end if;
  ok:=(s#>>'{}')::boolean; total:=total+1; if ok then earned:=earned+1; end if;
  v_feedback:=v_feedback||jsonb_build_array(private.mobile_public_question(q)||jsonb_build_object('answer',a.answers->(q->>'id'),'correctAnswer',coalesce(q->'correct',q->'reference'),'explanation',q->>'explanation','correct',ok));
 end loop;
 update private.mobile_attempts set status='completed',completed_at=clock_timestamp(),score=round(100.0*earned/greatest(total,1),2),feedback=v_feedback,lease_id=null,lease_until=null where id=a.id;
 return true;
end $$;
create function public.mobile_grade_jobs(p_id uuid default null,p_actor uuid default null) returns jsonb language sql security invoker set search_path='' as $$ select private.mobile_grade_jobs_impl(p_id,p_actor); $$;
create function public.mobile_grade_commit(p_id uuid,p_lease uuid,p_scores jsonb) returns boolean language sql security invoker set search_path='' as $$ select private.mobile_grade_commit_impl(p_id,p_lease,p_scores); $$;
create function private.mobile_grade_cron_key_impl() returns text language sql security definer set search_path='' as $$ select cron_key from private.mobile_runner_config where id; $$;
create function public.mobile_grade_cron_key() returns text language sql security invoker set search_path='' as $$ select private.mobile_grade_cron_key_impl(); $$;
revoke all on function private.mobile_default_questions(),private.mobile_init_learning(),private.mobile_public_question(jsonb),private.mobile_attempt_summary(private.mobile_attempts),private.mobile_has_active_test(uuid),private.mobile_archive_test(),private.mobile_learning_dispatch(text,jsonb),private.mobile_grade_jobs_impl(uuid,uuid),private.mobile_grade_commit_impl(uuid,uuid,jsonb),private.mobile_grade_cron_key_impl() from public,anon,authenticated;
revoke all on function public.mobile_learning(text,jsonb),public.mobile_grade_jobs(uuid,uuid),public.mobile_grade_commit(uuid,uuid,jsonb),public.mobile_grade_cron_key() from public,anon,authenticated;
grant execute on function public.mobile_learning(text,jsonb),private.mobile_learning_dispatch(text,jsonb) to authenticated;
grant usage on schema private to service_role;
grant execute on function public.mobile_grade_jobs(uuid,uuid),public.mobile_grade_commit(uuid,uuid,jsonb),public.mobile_grade_cron_key(),private.mobile_grade_jobs_impl(uuid,uuid),private.mobile_grade_commit_impl(uuid,uuid,jsonb),private.mobile_grade_cron_key_impl() to service_role;
