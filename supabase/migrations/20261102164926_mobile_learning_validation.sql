create or replace function private.mobile_learning_dispatch(p_action text,p_payload jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare
 uid uuid:=auth.uid(); role public.app_role; c public.classes%rowtype; a private.mobile_attempts%rowtype;
 m private.mobile_materials%rowtype; settings private.mobile_learning_settings%rowtype;
 result jsonb; item jsonb; answer jsonb; item_id text; cid uuid; mid uuid; aid uuid; rev integer; unlocked boolean; done boolean;
 title_value text; body_value text; attachment jsonb; minutes_value integer; v_cursor jsonb; next_cursor text;
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
  v_cursor:=(p_payload->>'cursor')::jsonb;
  select coalesce(jsonb_agg(page.item order by page.started_at desc,page.id desc),'[]') into result from (
   select private.mobile_attempt_summary(aa)||jsonb_build_object('studentName',p.display_name,'nim',p.nim) item,aa.started_at,aa.id
   from private.mobile_attempts aa join public.profiles p on p.id=aa.student_id where aa.class_id=cid
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

-- Keep offline deadline processing responsive for a class-sized queue.
do $$ begin
 if to_regprocedure('cron.schedule(text,text,text)') is not null then
  execute $cmd$select cron.schedule('quethink-mobile-pretest-deadlines','10 seconds','select private.mobile_kick_grading();')$cmd$;
 end if;
end $$;
