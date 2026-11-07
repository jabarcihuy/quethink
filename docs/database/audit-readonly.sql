-- Quethink Mobile: read-only metadata audit, 2 November 2026.
-- Does not execute application RPCs or read personal user rows.

-- tables
select c.relname as table_name, c.relrowsecurity as rls_enabled, c.relforcerowsecurity as force_rls, c.reltuples::bigint as estimated_rows from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p') order by c.relname;

-- policies
select schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check from pg_policies where schemaname in ('public','storage') order by schemaname,tablename,policyname;

-- functions
select n.nspname as schema_name,p.proname as function_name,pg_get_function_identity_arguments(p.oid) as arguments,pg_get_function_result(p.oid) as result_type,p.prosecdef as security_definer,p.proconfig as config,has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute,has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_execute from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname not in ('pg_catalog','information_schema','auth','storage','extensions','graphql','graphql_public','realtime','supabase_functions','supabase_migrations','vault','pgsodium','pgsodium_masks','net','cron','pgmq','pgmq_public') and p.prokind='f' and not exists(select 1 from pg_depend d where d.objid=p.oid and d.classid='pg_proc'::regclass and d.deptype='e') order by n.nspname,p.proname;

-- grants
select table_schema,table_name,grantee,string_agg(privilege_type,', ' order by privilege_type) as privileges from information_schema.role_table_grants where table_schema='public' and grantee in ('anon','authenticated','service_role') group by table_schema,table_name,grantee order by table_name,grantee;

-- triggers
select n.nspname as schema_name,c.relname as table_name,t.tgname as trigger_name,pg_get_triggerdef(t.oid,true) as definition from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where not t.tgisinternal and n.nspname in ('auth','public') order by n.nspname,c.relname,t.tgname;

-- definitions
select p.proname,pg_get_functiondef(p.oid) as definition from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('handle_new_user','start_assessment_session','current_user_has_active_assessment','current_user_lesson_available','acknowledge_material_read','phase1_lesson_is_available','forum_check_writer','forum_moderate','course_has_baseline') order by p.proname;

-- views
select c.relname as view_name,c.reloptions as options,pg_get_viewdef(c.oid,true) as definition from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='v' order by c.relname;

-- constraints
select c.relname as table_name,con.conname,con.contype,pg_get_constraintdef(con.oid,true) as definition from pg_constraint con join pg_class c on c.oid=con.conrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' order by c.relname,con.conname;

-- columnPrivileges
select table_name,column_name,privilege_type,grantee from information_schema.column_privileges where table_schema='public' and grantee in ('anon','authenticated') and table_name in ('exercises','profiles','test_cases','assessment_items') order by table_name,column_name,grantee,privilege_type;

-- storage
select id,name,public,file_size_limit,allowed_mime_types from storage.buckets order by id;

-- indexes
select tablename,indexname,indexdef from pg_indexes where schemaname='public' order by tablename,indexname;

-- metadata
select current_database() as database_name, current_setting('server_version') as postgres_version, current_setting('pgrst.db_schemas',true) as postgrest_db_schemas, (select count(*) from pg_policies where schemaname='public') as public_policy_count;

-- schemaList
select n.nspname as schema_name,c.relkind as kind,count(*)::int as relations from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind in ('r','p','v') and n.nspname not like 'pg_%' and n.nspname not in ('information_schema','auth','storage','realtime','supabase_migrations','vault','extensions','net') group by n.nspname,c.relkind order by n.nspname,c.relkind;

-- expiry
select column_name from information_schema.columns where table_schema='public' and table_name='assessment_sessions' order by ordinal_position;

-- permissionSummary
select name,has_table_privilege('anon',name,'SELECT') as anon_select_table,has_table_privilege('authenticated',name,'SELECT') as auth_select_table,has_table_privilege('anon',name,'TRUNCATE') as anon_truncate,has_table_privilege('authenticated',name,'TRUNCATE') as auth_truncate from (values ('public.profiles'),('public.lesson_progress'),('public.code_request_limits'),('public.exercise_attempts')) t(name);

-- contentCounts
select 'learning_paths' as table_name,count(*)::int as total,count(*) filter(where is_published)::int as published from public.learning_paths union all select 'chapters',count(*)::int,count(*) filter(where is_published)::int from public.chapters union all select 'lessons',count(*)::int,count(*) filter(where is_published)::int from public.lessons union all select 'exercises',count(*)::int,count(*) filter(where is_published)::int from public.exercises union all select 'assessments',count(*)::int,count(*) filter(where is_published)::int from public.assessments;

-- additionalDefinitions
select p.proname,pg_get_functiondef(p.oid) as definition from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('consume_code_request_quota','phase1_start_lesson') order by p.proname;

