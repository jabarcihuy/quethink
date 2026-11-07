-- Complete the mobile assessment cycle; legacy web tables remain unchanged.
create function private.mobile_default_post_questions() returns jsonb language sql immutable set search_path='' as $seed$
 select '[{"id": "entity", "kind": "choice", "prompt": "Which design keeps information about courses separate from enrolment records?", "options": [{"id": "a", "text": "A courses table referenced by enrolments"}, {"id": "b", "text": "Repeating every course description in each student row"}, {"id": "c", "text": "Removing the course identifier"}], "correct": "a", "explanation": "Separate tables represent different entities; references connect them."}, {"id": "unique", "kind": "choice", "prompt": "Two students share the same name. What should identify their records?", "options": [{"id": "a", "text": "A unique student ID"}, {"id": "b", "text": "Their shared name"}, {"id": "c", "text": "Their position in the query result"}], "correct": "a", "explanation": "A stable unique key distinguishes records even when attributes match."}, {"id": "predicate", "kind": "choice", "prompt": "Which clause selects only records matching a cohort condition?", "options": [{"id": "a", "text": "WHERE"}, {"id": "b", "text": "ORDER BY"}, {"id": "c", "text": "AS"}], "correct": "a", "explanation": "WHERE filters records by a predicate."}, {"id": "foreign", "kind": "choice", "prompt": "How does an enrolment refer to an existing course record?", "options": [{"id": "a", "text": "With a foreign key to the course key"}, {"id": "b", "text": "With a sorting direction"}, {"id": "c", "text": "With a column alias"}], "correct": "a", "explanation": "Foreign keys express references and help enforce valid relationships."}, {"id": "names", "kind": "sql", "prompt": "List only the names of students in cohort 2024, in alphabetical order. Use one SQLite SELECT statement.", "reference": "SELECT name FROM students WHERE cohort=2024 ORDER BY name", "explanation": "Project name, filter cohort 2024, then sort by name."}, {"id": "total", "kind": "sql", "prompt": "Return a single value: how many students belong to cohort 2025? Use one SQLite SELECT statement.", "reference": "SELECT COUNT(*) FROM students WHERE cohort=2025", "explanation": "COUNT(*) counts the records retained by WHERE."}]'::jsonb;
$seed$;
revoke all on function private.mobile_default_post_questions() from public,anon,authenticated;
alter table private.mobile_attempts drop constraint mobile_attempts_kind_check;
alter table private.mobile_attempts add constraint mobile_attempts_kind_check check(kind in ('PRETEST','POSTTEST'));
alter table private.mobile_learning_settings
 add column posttest_minutes integer not null default 20 check(posttest_minutes between 1 and 180),
 add column post_questions jsonb not null default private.mobile_default_post_questions(),
 add column pretest_revision integer not null default 0,
 add column posttest_revision integer not null default 0;
alter table private.mobile_materials add column lab_kind text not null default 'filter' check(lab_kind in ('filter','update'));
update private.mobile_materials set lab_kind='update' where title ilike '%UPDATE%';
create table private.mobile_lab_runs (
 id uuid primary key default gen_random_uuid(), request_id uuid not null, material_id uuid not null references private.mobile_materials(id) on delete cascade,
 student_id uuid not null references public.profiles(id) on delete cascade, query text not null check(length(query) between 1 and 4096),
 check_answer boolean not null, lab_kind text not null check(lab_kind in ('filter','update')), result jsonb,
 created_at timestamptz not null default clock_timestamp(), unique(student_id,request_id)
);
create index mobile_lab_rate_idx on private.mobile_lab_runs(student_id,created_at);
create index mobile_lab_material_idx on private.mobile_lab_runs(material_id);
alter table private.mobile_lab_runs enable row level security;
revoke all on private.mobile_lab_runs from public,anon,authenticated;
create or replace function private.mobile_attempt_summary(a private.mobile_attempts) returns jsonb language sql stable set search_path='' as $$
 select jsonb_build_object('id',a.id,'classId',a.class_id,'kind',a.kind,'status',a.status,'startedAt',a.started_at,'expiresAt',a.expires_at,
 'submittedAt',a.submitted_at,'completedAt',a.completed_at,'score',a.score,'revision',a.revision);
$$;
create function private.mobile_material_available(p_uid uuid,p_class uuid,p_position integer) returns boolean language sql stable set search_path='' as $$
 select exists(select 1 from private.mobile_attempts where class_id=p_class and student_id=p_uid and kind='PRETEST' and status='completed')
 and not exists(select 1 from private.mobile_materials m where class_id=p_class and position<p_position and not exists(select 1 from private.mobile_read_progress p where p.material_id=m.id and p.student_id=p_uid));
$$;
create function private.mobile_posttest_ready(p_uid uuid,p_class uuid) returns boolean language sql stable set search_path='' as $$
 select exists(select 1 from private.mobile_materials where class_id=p_class)
 and private.mobile_material_available(p_uid,p_class,2147483647);
$$;
revoke all on function private.mobile_material_available(uuid,uuid,integer),private.mobile_posttest_ready(uuid,uuid) from public,anon,authenticated;
create function private.mobile_random_questions(bank jsonb) returns jsonb language plpgsql volatile set search_path='' as $$
declare q jsonb; o jsonb; opts jsonb; shuffled jsonb:='[]'; new_id text; answer_id text;
begin
 for q in select value from jsonb_array_elements(bank) loop
  if q->>'kind'='choice' then
   opts:='[]'; answer_id:=null;
   for o in select value from jsonb_array_elements(q->'options') order by gen_random_uuid() loop
    new_id:=gen_random_uuid()::text;
    if o->>'id'=q->>'correct' then answer_id:=new_id; end if;
    opts:=opts||jsonb_build_array(jsonb_build_object('id',new_id,'text',o->>'text'));
   end loop;
   q:=q||jsonb_build_object('options',opts,'correct',answer_id);
  end if;
  shuffled:=shuffled||jsonb_build_array(q);
 end loop;
 return (select jsonb_agg(value order by gen_random_uuid()) from jsonb_array_elements(shuffled));
end $$;
revoke all on function private.mobile_random_questions(jsonb) from public,anon,authenticated;
create or replace function private.mobile_learning_dispatch(p_action text,p_payload jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare
 uid uuid:=auth.uid(); role public.app_role; c public.classes%rowtype; a private.mobile_attempts%rowtype;
 m private.mobile_materials%rowtype; settings private.mobile_learning_settings%rowtype;
 result jsonb; item jsonb; answer jsonb; item_id text; cid uuid; mid uuid; aid uuid; rev integer; unlocked boolean; done boolean;
 title_value text; body_value text; attachment jsonb; minutes_value integer; v_cursor jsonb; next_cursor text; test_kind text; post_attempt private.mobile_attempts%rowtype;
begin
 if uid is null then return private.mobile_error('AUTH_REQUIRED'); end if;
 select p.role into role from public.profiles p where p.id=uid;
 if role is null or role not in ('USER','TEACHER') then return private.mobile_error('FORBIDDEN'); end if;
 test_kind:=coalesce(p_payload->>'kind','PRETEST');
 if test_kind not in ('PRETEST','POSTTEST') then return private.mobile_error('VALIDATION_ERROR'); end if;
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
 if role='USER' then select * into a from private.mobile_attempts where class_id=cid and student_id=uid and kind='PRETEST'; select * into post_attempt from private.mobile_attempts where class_id=cid and student_id=uid and kind='POSTTEST'; end if;
 select * into settings from private.mobile_learning_settings where class_id=cid;
 if not found then return private.mobile_error('LEARNING_UNAVAILABLE'); end if;

 if p_action='status' then
  select jsonb_build_object('class',private.mobile_class_json(c,role='TEACHER'),'attempt',case when a.id is null then null else private.mobile_attempt_summary(a) end,
   'materialCount',(select count(*) from private.mobile_materials where class_id=cid),
   'completedCount',(select count(*) from private.mobile_read_progress p join private.mobile_materials mm on mm.id=p.material_id where mm.class_id=cid and p.student_id=uid),
   'posttest',case when post_attempt.id is null then null else private.mobile_attempt_summary(post_attempt) end,'posttestAvailable',private.mobile_posttest_ready(uid,cid),'posttestMinutes',settings.posttest_minutes,'postQuestionCount',jsonb_array_length(settings.post_questions),'pretestMinutes',settings.pretest_minutes,'questionCount',jsonb_array_length(settings.questions),'serverTime',clock_timestamp()) into result;
 elsif p_action='start' then
  if role<>'USER' then return private.mobile_error('STUDENT_REQUIRED'); end if;
  if c.status<>'active' then return private.mobile_error('CLASS_ARCHIVED'); end if;
  if exists(select 1 from public.profiles where id=uid and (nullif(btrim(display_name),'') is null or nullif(btrim(nim),'') is null)) then return private.mobile_error('PROFILE_INCOMPLETE'); end if;
  if test_kind='POSTTEST' then a:=post_attempt; if a.id is null and not private.mobile_posttest_ready(uid,cid) then return private.mobile_error('POSTTEST_LOCKED'); end if; end if;
  if a.id is null and public.current_user_has_active_assessment() then return private.mobile_error('OTHER_TEST_ACTIVE'); end if;
  insert into private.mobile_attempts(class_id,student_id,kind,questions,expires_at)
  select cid,uid,test_kind,private.mobile_random_questions(case when test_kind='PRETEST' then settings.questions else settings.post_questions end),now()+make_interval(mins=>case when test_kind='PRETEST' then settings.pretest_minutes else settings.posttest_minutes end)
  on conflict(class_id,student_id,kind) do nothing;
  select * into a from private.mobile_attempts where class_id=cid and student_id=uid and kind=test_kind;
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
   'available',coalesce(role='TEACHER' or (a.status='completed' and not exists(select 1 from private.mobile_materials prev where prev.class_id=cid and prev.position<mm.position and not exists(select 1 from private.mobile_read_progress p where p.material_id=prev.id and p.student_id=uid))),false)) order by mm.position),'[]') into result
   from private.mobile_materials mm where mm.class_id=cid;
 elsif p_action in ('material','read','edit_material','add_material') then
  select * into m from private.mobile_materials where id=mid for update;
  unlocked:=role='TEACHER' or (a.status='completed' and not exists(select 1 from private.mobile_materials prev where prev.class_id=cid and prev.position<m.position and not exists(select 1 from private.mobile_read_progress p where p.material_id=prev.id and p.student_id=uid)));
  if p_action<>'add_material' and not coalesce(unlocked,false) then return private.mobile_error('MATERIAL_LOCKED'); end if;
  if p_action='read' then
   if role<>'USER' then return private.mobile_error('STUDENT_REQUIRED'); end if;
   if c.status<>'active' then return private.mobile_error('CLASS_ARCHIVED'); end if;
   if m.requires_lab then return private.mobile_error('LAB_REQUIRED'); end if;
   insert into private.mobile_read_progress(material_id,student_id) values(mid,uid) on conflict do nothing;
  elsif p_action in ('edit_material','add_material') then
   if role<>'TEACHER' then return private.mobile_error('TEACHER_REQUIRED'); end if;
   if c.status<>'active' then return private.mobile_error('CLASS_ARCHIVED'); end if;
   if exists(select 1 from private.mobile_read_progress where material_id=mid) then return private.mobile_error('MATERIAL_IN_USE'); end if;
   if exists(select 1 from private.mobile_attempts where class_id=cid and kind='POSTTEST') then return private.mobile_error('ASSESSMENT_IN_USE'); end if;
   if exists(select 1 from private.mobile_lab_runs where material_id=mid) then return private.mobile_error('MATERIAL_IN_USE'); end if;
   if coalesce(p_payload->>'labKind',m.lab_kind,'filter') not in ('filter','update') then return private.mobile_error('VALIDATION_ERROR'); end if;
   title_value:=btrim(p_payload->>'title'); body_value:=p_payload->>'body';
   if title_value is null or length(title_value) not between 1 and 200 or body_value is null or length(body_value)>100000 or coalesce(jsonb_typeof(p_payload->'requiresLab'),'null')<>'boolean' or coalesce(jsonb_typeof(p_payload->'attachments'),'null')<>'array' or jsonb_array_length(p_payload->'attachments')>5 then return private.mobile_error('VALIDATION_ERROR'); end if;
   for attachment in select value from jsonb_array_elements(p_payload->'attachments') loop
    if jsonb_typeof(attachment)<>'object' or coalesce(attachment->>'type','') not in ('pdf','video') or coalesce(length(attachment->>'title'),0) not between 1 and 100 or coalesce(length(attachment->>'url'),2049)>2048 or attachment->>'url' !~ '^https://[^[:space:]@/]+([/?#][^[:space:]]*)?$' then return private.mobile_error('VALIDATION_ERROR'); end if;
   end loop;
   if p_action='add_material' then
    insert into private.mobile_materials(class_id,title,body,position,requires_lab,attachments)
    values(cid,title_value,body_value,coalesce((select max(position) from private.mobile_materials where class_id=cid),0)+1,(p_payload->>'requiresLab')::boolean,p_payload->'attachments') returning * into m;
    mid:=m.id;
   else
   update private.mobile_materials set title=title_value,body=body_value,requires_lab=(p_payload->>'requiresLab')::boolean,attachments=p_payload->'attachments' where id=mid returning * into m;
   end if;
   update private.mobile_materials set lab_kind=coalesce(p_payload->>'labKind',lab_kind) where id=mid returning * into m;
  end if;
  select exists(select 1 from private.mobile_read_progress where material_id=mid and student_id=uid) into done;
  result:=jsonb_build_object('id',m.id,'classId',cid,'title',m.title,'body',m.body,'position',m.position,'requiresLab',m.requires_lab,'labKind',m.lab_kind,'attachments',m.attachments,'completed',done,'archived',c.status='archived');
 elsif p_action='settings' then
  if role<>'TEACHER' then return private.mobile_error('TEACHER_REQUIRED'); end if;
  if c.status<>'active' then return private.mobile_error('CLASS_ARCHIVED'); end if;
  minutes_value:=(p_payload->>'minutes')::integer;
  if minutes_value is null or minutes_value not between 1 and 180 then return private.mobile_error('VALIDATION_ERROR'); end if;
  if exists(select 1 from private.mobile_attempts where class_id=cid and kind=test_kind) then return private.mobile_error('ASSESSMENT_IN_USE'); end if;
  update private.mobile_learning_settings set pretest_minutes=case when test_kind='PRETEST' then minutes_value else pretest_minutes end,posttest_minutes=case when test_kind='POSTTEST' then minutes_value else posttest_minutes end,pretest_revision=pretest_revision+case when test_kind='PRETEST' then 1 else 0 end,posttest_revision=posttest_revision+case when test_kind='POSTTEST' then 1 else 0 end where class_id=cid;
  result:=jsonb_build_object('pretestMinutes',minutes_value);
 elsif p_action='bank' then
  if role<>'TEACHER' then return private.mobile_error('TEACHER_REQUIRED'); end if;
  result:=jsonb_build_object('kind',test_kind,'minutes',case when test_kind='PRETEST' then settings.pretest_minutes else settings.posttest_minutes end,'revision',case when test_kind='PRETEST' then settings.pretest_revision else settings.posttest_revision end,'questions',case when test_kind='PRETEST' then settings.questions else settings.post_questions end,'locked',c.status<>'active' or exists(select 1 from private.mobile_attempts where class_id=cid and kind=test_kind));
 elsif p_action='results' then
  if role<>'TEACHER' then return private.mobile_error('TEACHER_REQUIRED'); end if;
  v_cursor:=(p_payload->>'cursor')::jsonb;
  select coalesce(jsonb_agg(page.item order by page.started_at desc,page.id desc),'[]') into result from (
   select private.mobile_attempt_summary(aa)||jsonb_build_object('studentName',p.display_name,'nim',p.nim) item,aa.started_at,aa.id
   from private.mobile_attempts aa join public.profiles p on p.id=aa.student_id where aa.class_id=cid and aa.kind=test_kind
   and (v_cursor is null or (aa.started_at,aa.id)<((v_cursor->>'at')::timestamptz,(v_cursor->>'id')::uuid))
   order by aa.started_at desc,aa.id desc limit 51
  ) page;
  if jsonb_array_length(result)>50 then
   next_cursor:=jsonb_build_object('at',result->49->>'startedAt','id',result->49->>'id')::text;
   select jsonb_agg(value order by ord) into result from jsonb_array_elements(result) with ordinality t(value,ord) where ord<=50;
  end if;
  result:=jsonb_build_object('items',result,'nextCursor',next_cursor);
 else return private.mobile_error('INVALID_ACTION');
 end if;
 return jsonb_build_object('data',result);
exception when invalid_text_representation or numeric_value_out_of_range or datetime_field_overflow then return private.mobile_error('VALIDATION_ERROR');
end $$;


-- Structural validation repeats in Postgres; only Edge may certify executable references.
create function private.mobile_valid_bank(bank jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare q jsonb; o jsonb; ids text[]:='{}'; prompts text[]:='{}'; choices text[]; sql_count integer:=0; choice_count integer:=0;
begin
 if bank is null or jsonb_typeof(bank)<>'array' then return false; end if;
 if jsonb_array_length(bank) not between 2 and 30 or octet_length(bank::text)>60000 then return false; end if;
 for q in select value from jsonb_array_elements(bank) loop
  if coalesce(q->>'id','') !~ '^[a-zA-Z0-9_-]{1,40}$' or q->>'id'=any(ids) or coalesce(length(btrim(q->>'prompt')),0) not between 1 and 2000 or lower(btrim(q->>'prompt'))=any(prompts) or coalesce(length(btrim(q->>'explanation')),0) not between 1 and 2000 then return false; end if;
  ids:=array_append(ids,q->>'id'); prompts:=array_append(prompts,lower(btrim(q->>'prompt')));
  if q->>'kind'='choice' then
   choice_count:=choice_count+1; choices:='{}';
   if coalesce(jsonb_typeof(q->'options'),'null')<>'array' then return false; end if;
   if jsonb_array_length(q->'options') not between 2 and 6 then return false; end if;
   for o in select value from jsonb_array_elements(q->'options') loop
    if coalesce(o->>'id','') !~ '^[a-f]$' or o->>'id'=any(choices) or coalesce(length(btrim(o->>'text')),0) not between 1 and 500 then return false; end if;
    choices:=array_append(choices,o->>'id');
   end loop;
   if q->>'correct' is null or not(q->>'correct'=any(choices)) then return false; end if;
  elsif q->>'kind'='sql' then
   sql_count:=sql_count+1;
   if coalesce(length(btrim(q->>'reference')),0) not between 1 and 4096 then return false; end if;
  else return false;
  end if;
 end loop;
 return sql_count between 1 and 2 and choice_count>=1;
end $$;
create function private.mobile_cycle_impl(p_actor uuid,p_action text,p_payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare role public.app_role; cid uuid; mid uuid; c public.classes%rowtype; m private.mobile_materials%rowtype;
 s private.mobile_learning_settings%rowtype; job private.mobile_lab_runs%rowtype; v_kind text; rev integer; bank jsonb; q jsonb; clean jsonb:='[]'; response jsonb; rid uuid; v_query text; v_check boolean;
begin
 select p.role into role from public.profiles p where p.id=p_actor;
 if role is null or role not in ('USER','TEACHER') then return private.mobile_error('FORBIDDEN'); end if;
 if p_action in ('bank_check','bank_save') then
  cid:=(p_payload->>'classId')::uuid;
 else
  mid:=(p_payload->>'materialId')::uuid;
  select class_id into cid from private.mobile_materials where id=mid;
 end if;
 select * into c from public.classes where id=cid for update;
 if not found then return private.mobile_error('FORBIDDEN'); end if;
 if p_action in ('bank_check','bank_save') then
  if role<>'TEACHER' or c.teacher_id<>p_actor then return private.mobile_error('FORBIDDEN'); end if;
  if c.status<>'active' then return private.mobile_error('CLASS_ARCHIVED'); end if;
  v_kind:=p_payload->>'kind'; bank:=p_payload->'questions'; rev:=(p_payload->>'revision')::integer;
  if coalesce(v_kind,'') not in ('PRETEST','POSTTEST') or not private.mobile_valid_bank(bank) or coalesce((p_payload->>'minutes')::integer,0) not between 1 and 180 then return private.mobile_error('VALIDATION_ERROR'); end if;
  select * into s from private.mobile_learning_settings where class_id=cid;
  if not found then return private.mobile_error('LEARNING_UNAVAILABLE'); end if;
  if exists(select 1 from private.mobile_attempts where class_id=cid and mobile_attempts.kind=v_kind) then return private.mobile_error('ASSESSMENT_IN_USE'); end if;
  if rev is null or rev<>(case when v_kind='PRETEST' then s.pretest_revision else s.posttest_revision end) then return private.mobile_error('REVISION_CONFLICT'); end if;
  if exists(select 1 from jsonb_array_elements(bank) b cross join jsonb_array_elements(case when v_kind='PRETEST' then s.post_questions else s.questions end) other where lower(btrim(b->>'prompt'))=lower(btrim(other->>'prompt'))) then return private.mobile_error('DISTINCT_PACKAGES_REQUIRED'); end if;
  for q in select value from jsonb_array_elements(bank) loop
   clean:=clean||jsonb_build_array(jsonb_build_object('id',q->>'id','kind',q->>'kind','prompt',btrim(q->>'prompt'),'explanation',btrim(q->>'explanation'))||case when q->>'kind'='choice' then jsonb_build_object('options',(select jsonb_agg(jsonb_build_object('id',o->>'id','text',btrim(o->>'text'))) from jsonb_array_elements(q->'options') o),'correct',q->>'correct') else jsonb_build_object('reference',q->>'reference') end);
  end loop;
  if p_action='bank_save' then
   update private.mobile_learning_settings set
    questions=case when v_kind='PRETEST' then clean else questions end,
    post_questions=case when v_kind='POSTTEST' then clean else post_questions end,
    pretest_minutes=case when v_kind='PRETEST' then (p_payload->>'minutes')::integer else pretest_minutes end,
    posttest_minutes=case when v_kind='POSTTEST' then (p_payload->>'minutes')::integer else posttest_minutes end,
    pretest_revision=pretest_revision+case when v_kind='PRETEST' then 1 else 0 end,
    posttest_revision=posttest_revision+case when v_kind='POSTTEST' then 1 else 0 end where class_id=cid;
  end if;
  return jsonb_build_object('data',jsonb_build_object('questions',clean,'saved',p_action='bank_save'));
 end if;
 if role<>'USER' or not exists(select 1 from public.class_memberships where class_id=cid and student_id=p_actor) then return private.mobile_error('FORBIDDEN'); end if;
 if c.status<>'active' then return private.mobile_error('CLASS_ARCHIVED'); end if;
 if private.mobile_has_active_test(p_actor) then return private.mobile_error('OTHER_TEST_ACTIVE'); end if;
 select * into m from private.mobile_materials where id=mid;
 if not m.requires_lab or not private.mobile_material_available(p_actor,cid,m.position) then return private.mobile_error('MATERIAL_LOCKED'); end if;
 if p_action='lab_open' then
  rid:=(p_payload->>'requestId')::uuid; v_query:=p_payload->>'query';
  if rid is null or coalesce(length(btrim(v_query)),0) not between 1 and 4096 or coalesce(jsonb_typeof(p_payload->'check'),'null')<>'boolean' then return private.mobile_error('VALIDATION_ERROR'); end if;
  v_check:=(p_payload->>'check')::boolean;
  select * into job from private.mobile_lab_runs where student_id=p_actor and request_id=rid;
  if found then
   if job.material_id<>mid or job.query<>v_query or job.check_answer<>v_check then return private.mobile_error('REVISION_CONFLICT'); end if;
  else
   if (select count(*) from private.mobile_lab_runs where student_id=p_actor and created_at>clock_timestamp()-interval '1 minute')>=20 then return private.mobile_error('RATE_LIMITED'); end if;
   insert into private.mobile_lab_runs(request_id,material_id,student_id,query,check_answer,lab_kind) values(rid,mid,p_actor,v_query,v_check,m.lab_kind) returning * into job;
  end if;
  return jsonb_build_object('data',jsonb_build_object('id',job.id,'query',job.query,'kind',job.lab_kind,'check',job.check_answer,'result',job.result));
 elsif p_action='lab_commit' then
  select * into job from private.mobile_lab_runs where id=(p_payload->>'runId')::uuid and student_id=p_actor and material_id=mid for update;
  if not found then return private.mobile_error('FORBIDDEN'); end if;
  if job.result is null then
   response:=p_payload->'result';
   if response is null or jsonb_typeof(response)<>'object' or octet_length(response::text)>16000 or coalesce(jsonb_typeof(response->'passed'),'null')<>'boolean' then return private.mobile_error('VALIDATION_ERROR'); end if;
   update private.mobile_lab_runs set result=response where id=job.id;
   if job.check_answer and (response->>'passed')::boolean then
    insert into private.mobile_read_progress(material_id,student_id) values(mid,p_actor) on conflict do nothing;
   end if;
  else response:=job.result;
  end if;
  return jsonb_build_object('data',response);
 end if;
 return private.mobile_error('INVALID_ACTION');
exception when invalid_text_representation or numeric_value_out_of_range then return private.mobile_error('VALIDATION_ERROR');
end $$;
create function public.mobile_cycle(p_actor uuid,p_action text,p_payload jsonb) returns jsonb language sql security invoker set search_path='' as $$ select private.mobile_cycle_impl(p_actor,p_action,p_payload); $$;
revoke all on function private.mobile_valid_bank(jsonb),private.mobile_cycle_impl(uuid,text,jsonb),public.mobile_cycle(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function private.mobile_cycle_impl(uuid,text,jsonb),public.mobile_cycle(uuid,text,jsonb) to service_role;

create or replace function private.mobile_init_learning() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into private.mobile_learning_settings(class_id,questions) values(new.id,private.mobile_default_questions());
 insert into private.mobile_materials(class_id,source_lesson_id,title,body,position,requires_lab,lab_kind)
 select new.id,l.id,l.title,replace(l.content,E'\\n',E'\n'),row_number() over(order by c.position,c.id,l.position,l.id),
 l.title in ('Memilih Baris dengan WHERE','Mengubah Record dengan UPDATE'),case when l.title ilike '%UPDATE%' then 'update' else 'filter' end
 from public.lessons l join public.chapters c on c.id=l.chapter_id
 where c.learning_path_id=new.source_learning_path_id and c.is_published and l.is_published;
 return new;
end $$;
