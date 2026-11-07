create function private.mobile_error(p_code text) returns jsonb
language sql immutable set search_path='' as $$ select jsonb_build_object('error',jsonb_build_object('code',p_code)); $$;
create function private.mobile_profile_json(p public.profiles) returns jsonb
language sql stable set search_path='' as $$
 select jsonb_build_object('id',p.id,'role',case p.role when 'USER' then 'student' when 'TEACHER' then 'teacher' else 'admin' end,
 'displayName',p.display_name,'nim',p.nim,'avatarPath',p.avatar_path,'birthDate',p.birth_date,
 'profileComplete',coalesce(length(btrim(p.display_name))>0 and (p.role<>'USER' or length(btrim(p.nim))>0),false));
$$;
create function private.mobile_class_json(p public.classes,p_include_code boolean default false) returns jsonb
language sql stable set search_path='' as $$
 select jsonb_build_object('id',p.id,'name',p.name,'status',p.status,'createdAt',p.created_at,'archivedAt',p.archived_at,
 'teacherName',(select display_name from public.profiles where id=p.teacher_id),
 'studentCount',(select count(*) from public.class_memberships where class_id=p.id),
 'joinCode',case when p_include_code then (select code from private.class_join_codes where class_id=p.id) else null end);
$$;
revoke all on function private.mobile_error(text),private.mobile_profile_json(public.profiles),private.mobile_class_json(public.classes,boolean) from public,anon,authenticated;

-- Only fixed, validated business actions. No caller-supplied SQL or actor IDs.
create function private.mobile_dispatch(p_action text,p_payload jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  v_uid uuid:=auth.uid(); v_profile public.profiles%rowtype; v_class public.classes%rowtype;
  v_member public.class_memberships%rowtype; v_id uuid; v_code text; v_result jsonb;
  v_attempts integer; v_name text; v_nim text; v_birth date; v_avatar text; v_cursor jsonb;
begin
  if v_uid is null then return private.mobile_error('AUTH_REQUIRED'); end if;
  select * into v_profile from public.profiles where id=v_uid;
  if not found then return private.mobile_error('PROFILE_UNAVAILABLE'); end if;
  if p_action='get_profile' then return jsonb_build_object('data',private.mobile_profile_json(v_profile)); end if;
  if v_profile.role not in ('USER','TEACHER') then return private.mobile_error('FORBIDDEN'); end if;
  if p_action in ('update_profile','join_class','create_class','archive_class') then
    select * into v_profile from public.profiles where id=v_uid for update;
  end if;

  if p_action='update_profile' then
    v_name:=btrim(p_payload->>'displayName'); v_nim:=nullif(btrim(p_payload->>'nim'),'');
    if v_name is null or length(v_name) not between 1 and 100 or length(v_nim)>64
      or (v_profile.role='USER' and v_nim is null) then return private.mobile_error('PROFILE_INCOMPLETE'); end if;
    if nullif(p_payload->>'birthDate','') is not null then
      if (p_payload->>'birthDate') !~ '^\d{4}-\d{2}-\d{2}$' then return private.mobile_error('VALIDATION_ERROR'); end if;
      v_birth:=(p_payload->>'birthDate')::date;
      if v_birth>current_date then return private.mobile_error('VALIDATION_ERROR'); end if;
    end if;
    v_avatar:=nullif(p_payload->>'avatarPath','');
    if v_avatar is not null and (length(v_avatar)>512 or split_part(v_avatar,'/',1)<>v_uid::text
      or not exists(select 1 from storage.objects where bucket_id='avatars' and name=v_avatar)) then
      return private.mobile_error('VALIDATION_ERROR');
    end if;
    update public.profiles set display_name=v_name,nim=case when role='USER' then v_nim else null end,
      birth_date=v_birth,avatar_path=v_avatar where id=v_uid returning * into v_profile;
    return jsonb_build_object('data',private.mobile_profile_json(v_profile));
  end if;

  if p_action in ('resolve_class_code','join_class') then
    if v_profile.role<>'USER' then return private.mobile_error('STUDENT_REQUIRED'); end if;
    if not (private.mobile_profile_json(v_profile)->>'profileComplete')::boolean then return private.mobile_error('PROFILE_INCOMPLETE'); end if;
    -- Return business errors normally so failed guesses still commit their quota.
    insert into private.mobile_join_limits as lim(user_id,window_started_at,attempts) values(v_uid,clock_timestamp(),1)
      on conflict(user_id) do update set
        attempts=case when lim.window_started_at<clock_timestamp()-interval '1 minute' then 1 else lim.attempts+1 end,
        window_started_at=case when lim.window_started_at<clock_timestamp()-interval '1 minute' then clock_timestamp() else lim.window_started_at end
      returning attempts into v_attempts;
    if v_attempts>10 then return private.mobile_error('RATE_LIMITED'); end if;
    v_code:=upper(regexp_replace(coalesce(p_payload->>'code',''),'[\s-]','','g'));
    if v_code !~ '^[A-F0-9]{12}$' then return private.mobile_error('CLASS_CODE_INVALID'); end if;
    select c.* into v_class from public.classes c join private.class_join_codes code on code.class_id=c.id where code.code=v_code;
    if not found then return private.mobile_error('CLASS_CODE_INVALID'); end if;
    if p_action='join_class' then select * into v_class from public.classes where id=v_class.id for update; end if;
    if v_class.status<>'active' then
      return private.mobile_error(case when p_action='join_class' then 'CLASS_ARCHIVED' else 'CLASS_CODE_INVALID' end);
    end if;
    if p_action='resolve_class_code' then
      return jsonb_build_object('data',jsonb_build_object('id',v_class.id,'name',v_class.name,'teacherName',(select display_name from public.profiles where id=v_class.teacher_id)));
    end if;
    select * into v_member from public.class_memberships where student_id=v_uid;
    if found and v_member.class_id<>v_class.id then return private.mobile_error('ALREADY_JOINED'); end if;
    if not found then
      insert into public.class_memberships(class_id,student_id) values(v_class.id,v_uid) returning * into v_member;
    end if;
    return jsonb_build_object('data',jsonb_build_object('id',v_member.id,'classId',v_member.class_id,'studentId',v_uid,'joinedAt',v_member.joined_at));
  end if;

  if p_action='get_my_class' then
    if v_profile.role<>'USER' then return private.mobile_error('STUDENT_REQUIRED'); end if;
    select c.* into v_class from public.classes c join public.class_memberships m on m.class_id=c.id where m.student_id=v_uid;
    return jsonb_build_object('data',case when v_class.id is null then null else private.mobile_class_json(v_class) end);
  end if;
  if p_action in ('list_my_classes','list_templates','create_class','archive_class','get_class_roster') and v_profile.role<>'TEACHER' then
    return private.mobile_error('TEACHER_REQUIRED');
  end if;
  if p_action='list_templates' then
    select coalesce(jsonb_agg(jsonb_build_object('id',id,'title',title) order by position,id),'[]'::jsonb) into v_result
      from public.learning_paths where is_published;
    return jsonb_build_object('data',v_result);
  end if;
  if p_action='list_my_classes' then
    v_cursor:=nullif(p_payload->>'cursor','')::jsonb;
    select coalesce(jsonb_agg(private.mobile_class_json(c,true) order by c.created_at desc,c.id desc),'[]'::jsonb) into v_result
      from (select * from public.classes where teacher_id=v_uid and (v_cursor is null or (created_at,id)<((v_cursor->>'at')::timestamptz,(v_cursor->>'id')::uuid))
       order by created_at desc,id desc limit 50) c;
    return jsonb_build_object('data',v_result,'nextCursor',case when jsonb_array_length(v_result)=50 then jsonb_build_object('at',v_result->49->>'createdAt','id',v_result->49->>'id')::text else null end);
  end if;
  if p_action='create_class' then
    if not (private.mobile_profile_json(v_profile)->>'profileComplete')::boolean then return private.mobile_error('PROFILE_INCOMPLETE'); end if;
    v_name:=btrim(p_payload->>'name');
    if v_name is null or length(v_name) not between 1 and 120 then return private.mobile_error('VALIDATION_ERROR'); end if;
    v_id:=(p_payload->>'templateId')::uuid;
    if v_id is null or not exists(select 1 from public.learning_paths where id=v_id and is_published) then return private.mobile_error('TEMPLATE_UNAVAILABLE'); end if;
    insert into public.classes(teacher_id,name,source_learning_path_id) values(v_uid,v_name,v_id) returning * into v_class;
    for i in 1..5 loop
      v_code:=upper(substr(replace(gen_random_uuid()::text,'-',''),1,12));
      insert into private.class_join_codes(class_id,code) values(v_class.id,v_code) on conflict(code) do nothing;
      exit when found;
    end loop;
    if not exists(select 1 from private.class_join_codes where class_id=v_class.id) then raise exception 'Code generation failed'; end if;
    return jsonb_build_object('data',private.mobile_class_json(v_class,true));
  end if;

  if p_action in ('archive_class','get_class_roster','get_dashboard') then
    if v_profile.role='USER' and p_action='get_dashboard' then
      select class_id into v_id from public.class_memberships where student_id=v_uid;
      if nullif(p_payload->>'classId','') is not null and (p_payload->>'classId')::uuid is distinct from v_id then return private.mobile_error('FORBIDDEN'); end if;
    else v_id:=(p_payload->>'classId')::uuid; end if;
    if p_action='archive_class' then select * into v_class from public.classes where id=v_id for update;
    else select * into v_class from public.classes where id=v_id; end if;
    if not found then return private.mobile_error('CLASS_UNAVAILABLE'); end if;
    if not ((v_profile.role='TEACHER' and v_class.teacher_id=v_uid)
      or (p_action='get_dashboard' and v_profile.role='USER' and exists(select 1 from public.class_memberships where student_id=v_uid and class_id=v_class.id))) then
      return private.mobile_error('FORBIDDEN');
    end if;
    if p_action='archive_class' then
      update public.classes set status='archived',archived_at=coalesce(archived_at,now()),updated_at=now() where id=v_id returning * into v_class;
      return jsonb_build_object('data',private.mobile_class_json(v_class,true));
    end if;
    if p_action='get_dashboard' then return jsonb_build_object('data',jsonb_build_object(
      'class',private.mobile_class_json(v_class,v_profile.role='TEACHER'),
      'nextAction',case when v_class.status='archived' then 'archived' else 'pretest_not_started' end,
      'progress',null,'pretestScore',null,'posttestScore',null)); end if;
    v_cursor:=nullif(p_payload->>'cursor','')::jsonb;
    select coalesce(jsonb_agg(jsonb_build_object('id',r.student_id,'displayName',r.display_name,'nim',r.nim,'joinedAt',r.joined_at) order by r.joined_at,r.student_id),'[]'::jsonb) into v_result
      from (select m.student_id,m.joined_at,p.display_name,p.nim from public.class_memberships m join public.profiles p on p.id=m.student_id
       where m.class_id=v_id and (v_cursor is null or (m.joined_at,m.student_id)>((v_cursor->>'at')::timestamptz,(v_cursor->>'id')::uuid)) order by m.joined_at,m.student_id limit 50) r;
    return jsonb_build_object('data',v_result,'nextCursor',case when jsonb_array_length(v_result)=50 then jsonb_build_object('at',v_result->49->>'joinedAt','id',v_result->49->>'id')::text else null end);
  end if;
  return private.mobile_error('VALIDATION_ERROR');
exception
  when invalid_text_representation or invalid_datetime_format or datetime_field_overflow then return private.mobile_error('VALIDATION_ERROR');
end;
$$;
revoke all on function private.mobile_dispatch(text,jsonb) from public,anon;
grant execute on function private.mobile_dispatch(text,jsonb) to authenticated;
create function public.mobile_get_my_profile() returns jsonb
language sql security invoker set search_path='' as $$ select private.mobile_dispatch('get_profile','{}'::jsonb); $$;
revoke all on function public.mobile_get_my_profile() from public,anon;
grant execute on function public.mobile_get_my_profile() to authenticated;

create function public.mobile_update_my_profile(p_display_name text,p_nim text default null,p_birth_date text default null,p_avatar_path text default null) returns jsonb
language sql security invoker set search_path='' as $$ select private.mobile_dispatch('update_profile',jsonb_build_object('displayName',p_display_name,'nim',p_nim,'birthDate',p_birth_date,'avatarPath',p_avatar_path)); $$;
revoke all on function public.mobile_update_my_profile(text,text,text,text) from public,anon;
grant execute on function public.mobile_update_my_profile(text,text,text,text) to authenticated;

create function public.mobile_resolve_class_code(p_code text) returns jsonb
language sql security invoker set search_path='' as $$ select private.mobile_dispatch('resolve_class_code',jsonb_build_object('code',p_code)); $$;
revoke all on function public.mobile_resolve_class_code(text) from public,anon;
grant execute on function public.mobile_resolve_class_code(text) to authenticated;

create function public.mobile_join_class(p_code text) returns jsonb
language sql security invoker set search_path='' as $$ select private.mobile_dispatch('join_class',jsonb_build_object('code',p_code)); $$;
revoke all on function public.mobile_join_class(text) from public,anon;
grant execute on function public.mobile_join_class(text) to authenticated;

create function public.mobile_get_my_class() returns jsonb
language sql security invoker set search_path='' as $$ select private.mobile_dispatch('get_my_class','{}'::jsonb); $$;
revoke all on function public.mobile_get_my_class() from public,anon;
grant execute on function public.mobile_get_my_class() to authenticated;

create function public.mobile_list_my_classes(p_cursor text default null) returns jsonb
language sql security invoker set search_path='' as $$ select private.mobile_dispatch('list_my_classes',jsonb_build_object('cursor',p_cursor)); $$;
revoke all on function public.mobile_list_my_classes(text) from public,anon;
grant execute on function public.mobile_list_my_classes(text) to authenticated;

create function public.mobile_list_templates() returns jsonb
language sql security invoker set search_path='' as $$ select private.mobile_dispatch('list_templates','{}'::jsonb); $$;
revoke all on function public.mobile_list_templates() from public,anon;
grant execute on function public.mobile_list_templates() to authenticated;

create function public.mobile_create_class(p_name text,p_template_id uuid) returns jsonb
language sql security invoker set search_path='' as $$ select private.mobile_dispatch('create_class',jsonb_build_object('name',p_name,'templateId',p_template_id)); $$;
revoke all on function public.mobile_create_class(text,uuid) from public,anon;
grant execute on function public.mobile_create_class(text,uuid) to authenticated;

create function public.mobile_archive_class(p_class_id uuid) returns jsonb
language sql security invoker set search_path='' as $$ select private.mobile_dispatch('archive_class',jsonb_build_object('classId',p_class_id)); $$;
revoke all on function public.mobile_archive_class(uuid) from public,anon;
grant execute on function public.mobile_archive_class(uuid) to authenticated;

create function public.mobile_get_class_roster(p_class_id uuid,p_cursor text default null) returns jsonb
language sql security invoker set search_path='' as $$ select private.mobile_dispatch('get_class_roster',jsonb_build_object('classId',p_class_id,'cursor',p_cursor)); $$;
revoke all on function public.mobile_get_class_roster(uuid,text) from public,anon;
grant execute on function public.mobile_get_class_roster(uuid,text) to authenticated;

create function public.mobile_get_dashboard(p_class_id uuid default null) returns jsonb
language sql security invoker set search_path='' as $$ select private.mobile_dispatch('get_dashboard',jsonb_build_object('classId',p_class_id)); $$;
revoke all on function public.mobile_get_dashboard(uuid) from public,anon;
grant execute on function public.mobile_get_dashboard(uuid) to authenticated;
