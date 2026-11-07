-- Mobile forum operates on the existing cross-class forum. Existing web grants and
-- tables are retained; the mobile API exposes only the author's display name.
create function public.mobile_forum(p_action text, p_payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  actor_role public.app_role;
  payload jsonb := coalesce(p_payload, '{}'::jsonb);
  item_id uuid;
  v_topic_id uuid;
  title_value text;
  body_value text;
  category_value text;
  search_value text;
  moderator boolean;
  value_flag boolean;
  offset_value integer;
  limit_value integer;
  result jsonb;
  affected integer;
  has_more boolean;
begin
  if uid is null then return private.mobile_error('AUTH_REQUIRED'); end if;
  select p.role into actor_role from public.profiles p where p.id=uid;
  if actor_role is null or actor_role not in ('USER','TEACHER') then return private.mobile_error('FORBIDDEN'); end if;
  moderator := actor_role='TEACHER';
  if jsonb_typeof(payload) <> 'object' or octet_length(payload::text) > 16000 then
    return private.mobile_error('VALIDATION_ERROR');
  end if;
  -- Writers serialize with other forum writes and with mobile test start for this class.
  if p_action in ('create_topic','create_reply','moderate') then
    perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
    perform 1 from public.classes c join public.class_memberships m on m.class_id=c.id
      where m.student_id=uid for update of c;
  end if;
  if public.current_user_has_active_assessment() then return private.mobile_error('OTHER_TEST_ACTIVE'); end if;

  if p_action in ('topics','replies') then
    if (payload ? 'limit' and jsonb_typeof(payload->'limit') <> 'number')
       or (payload ? 'offset' and jsonb_typeof(payload->'offset') <> 'number') then
      return private.mobile_error('VALIDATION_ERROR');
    end if;
    limit_value := coalesce((payload->>'limit')::integer,20);
    offset_value := coalesce((payload->>'offset')::integer,0);
    if limit_value not between 1 and 50 or offset_value not between 0 and 10000 then
      return private.mobile_error('VALIDATION_ERROR');
    end if;
  end if;

  if p_action='topics' then
    category_value := nullif(btrim(payload->>'category'),'');
    search_value := nullif(btrim(payload->>'search'),'');
    if (category_value is not null and category_value not in ('DATABASE','GENERAL'))
       or char_length(coalesce(search_value,''))>100 then return private.mobile_error('VALIDATION_ERROR'); end if;
    select coalesce(jsonb_agg(q.item order by q.created_at desc,q.id desc),'[]'::jsonb) into result
    from (
      select t.id,t.created_at,jsonb_build_object('id',t.id,'title',t.title,'category',t.category,
        'authorName',coalesce(nullif(btrim(p.display_name),''),'Quethink user'),
        'isMine',t.author_id=uid,'isLocked',t.is_locked,'isHidden',t.is_hidden,'createdAt',t.created_at,
        'replyCount',(select count(*) from public.forum_replies r where r.topic_id=t.id and (moderator or not r.is_hidden))) item
      from public.forum_topics t join public.profiles p on p.id=t.author_id
      where (moderator or not t.is_hidden) and (category_value is null or t.category=category_value)
        and (search_value is null or position(lower(search_value) in lower(t.title))>0 or position(lower(search_value) in lower(t.body))>0)
      order by t.created_at desc,t.id desc limit limit_value+1 offset offset_value
    ) q;
    has_more:=jsonb_array_length(result)>limit_value;
    if has_more then result:=result-limit_value; end if;
    return jsonb_build_object('data',jsonb_build_object('items',result,'offset',offset_value,'hasMore',has_more));
  elsif p_action='topic' then
    item_id:=(payload->>'topicId')::uuid;
    select jsonb_build_object('id',t.id,'title',t.title,'body',t.body,'category',t.category,
      'authorName',coalesce(nullif(btrim(p.display_name),''),'Quethink user'),
      'isMine',t.author_id=uid,'isLocked',t.is_locked,'isHidden',t.is_hidden,'createdAt',t.created_at)
      into result from public.forum_topics t join public.profiles p on p.id=t.author_id
      where t.id=item_id and (moderator or not t.is_hidden);
    if result is null then return private.mobile_error('NOT_FOUND'); end if;
    return jsonb_build_object('data',result);
  elsif p_action='replies' then
    v_topic_id:=(payload->>'topicId')::uuid;
    if not exists(select 1 from public.forum_topics t where t.id=v_topic_id and (moderator or not t.is_hidden)) then return private.mobile_error('NOT_FOUND'); end if;
    select coalesce(jsonb_agg(q.item order by q.created_at,q.id),'[]'::jsonb) into result
    from (
      select r.id,r.created_at,jsonb_build_object('id',r.id,'body',r.body,
        'authorName',coalesce(nullif(btrim(p.display_name),''),'Quethink user'),
        'isMine',r.author_id=uid,'isHidden',r.is_hidden,'createdAt',r.created_at) item
      from public.forum_replies r join public.profiles p on p.id=r.author_id
      where r.topic_id=v_topic_id and (moderator or not r.is_hidden)
      order by r.created_at,r.id limit limit_value+1 offset offset_value
    ) q;
    has_more:=jsonb_array_length(result)>limit_value;
    if has_more then result:=result-limit_value; end if;
    return jsonb_build_object('data',jsonb_build_object('items',result,'offset',offset_value,'hasMore',has_more));
  elsif p_action='create_topic' then
    title_value:=btrim(payload->>'title'); body_value:=btrim(payload->>'body'); category_value:=payload->>'category';
    if title_value is null or char_length(title_value) not between 6 and 140 or body_value is null or char_length(body_value) not between 10 and 6000 or category_value is null or category_value not in ('DATABASE','GENERAL') then return private.mobile_error('VALIDATION_ERROR'); end if;
    if (select count(*) from public.forum_topics t where t.author_id=uid and t.created_at>now()-interval '1 hour')>=5 then return private.mobile_error('RATE_LIMITED'); end if;
    insert into public.forum_topics(author_id,title,body,category) values(uid,title_value,body_value,category_value) returning id into item_id;
    return jsonb_build_object('data',jsonb_build_object('id',item_id));
  elsif p_action='create_reply' then
    v_topic_id:=(payload->>'topicId')::uuid; body_value:=btrim(payload->>'body');
    if v_topic_id is null or body_value is null or char_length(body_value) not between 2 and 4000 then return private.mobile_error('VALIDATION_ERROR'); end if;
    perform 1 from public.forum_topics t where t.id=v_topic_id and not t.is_hidden and not t.is_locked for update;
    if not found then return private.mobile_error('NOT_FOUND'); end if;
    if (select count(*) from public.forum_replies r where r.author_id=uid and r.created_at>now()-interval '1 hour')>=30 then return private.mobile_error('RATE_LIMITED'); end if;
    insert into public.forum_replies(author_id,topic_id,body) values(uid,v_topic_id,body_value) returning id into item_id;
    return jsonb_build_object('data',jsonb_build_object('id',item_id));
  elsif p_action='moderate' then
    if not moderator then return private.mobile_error('FORBIDDEN'); end if;
    if jsonb_typeof(payload->'value') is distinct from 'boolean' then return private.mobile_error('VALIDATION_ERROR'); end if;
    item_id:=(payload->>'targetId')::uuid; value_flag:=(payload->>'value')::boolean;
    if item_id is null then return private.mobile_error('VALIDATION_ERROR'); end if;
    if payload->>'operation'='lock_topic' then update public.forum_topics set is_locked=value_flag where id=item_id;
    elsif payload->>'operation'='hide_topic' then update public.forum_topics set is_hidden=value_flag where id=item_id;
    elsif payload->>'operation'='hide_reply' then update public.forum_replies set is_hidden=value_flag where id=item_id;
    else return private.mobile_error('VALIDATION_ERROR'); end if;
    get diagnostics affected=row_count;
    if affected=0 then return private.mobile_error('NOT_FOUND'); end if;
    return jsonb_build_object('data',jsonb_build_object('ok',true));
  end if;
  return private.mobile_error('INVALID_ACTION');
exception when invalid_text_representation or numeric_value_out_of_range then
  return private.mobile_error('VALIDATION_ERROR');
end $$;
revoke all on function public.mobile_forum(text,jsonb) from public,anon;
grant execute on function public.mobile_forum(text,jsonb) to authenticated;

-- Keep the existing service-role web writer, adding the mobile-test gate.
create function private.mobile_forum_writer_in_test(p_user_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select private.mobile_has_active_test(p_user_id);
$$;
revoke all on function private.mobile_forum_writer_in_test(uuid) from public,anon,authenticated;
grant execute on function private.mobile_forum_writer_in_test(uuid) to service_role;

create or replace function public.forum_check_writer(p_user_id uuid) returns void
language plpgsql set search_path='' as $$
begin
 if (select auth.jwt()->>'role') is distinct from 'service_role' then raise exception 'Forbidden' using errcode='42501'; end if;
 if p_user_id is null or not exists(select 1 from public.profiles where id=p_user_id) then raise exception 'Forbidden' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_user_id::text,0));
 perform 1 from public.classes c join public.class_memberships m on m.class_id=c.id where m.student_id=p_user_id for update of c;
 if exists(select 1 from public.assessment_sessions where user_id=p_user_id and status='IN_PROGRESS') or private.mobile_forum_writer_in_test(p_user_id) then raise exception 'Assessment active' using errcode='42501'; end if;
end $$;
