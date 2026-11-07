create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;
alter default privileges in schema private revoke execute on functions from public;

alter table public.profiles
  add column nim text,
  add column avatar_path text,
  add column birth_date date,
  add constraint profiles_mobile_name_length check (display_name is null or char_length(display_name) <= 100),
  add constraint profiles_mobile_nim_length check (nim is null or char_length(nim) between 1 and 64),
  add constraint profiles_mobile_avatar_path check (avatar_path is null or (char_length(avatar_path) <= 512 and split_part(avatar_path,'/',1)=id::text));
revoke all on public.profiles from anon, authenticated;
revoke insert(id,role,display_name,created_at,updated_at,nim,avatar_path,birth_date),
  update(id,role,display_name,created_at,updated_at,nim,avatar_path,birth_date),
  references(id,role,display_name,created_at,updated_at,nim,avatar_path,birth_date)
  on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  source_learning_path_id uuid not null references public.learning_paths(id),
  status text not null default 'active' check (status in ('active','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint classes_archive_state check ((status='active' and archived_at is null) or (status='archived' and archived_at is not null))
);
create index classes_teacher_created_idx on public.classes(teacher_id,created_at desc);
create index classes_source_path_idx on public.classes(source_learning_path_id);
create table public.class_memberships (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id),
  student_id uuid not null unique references public.profiles(id),
  joined_at timestamptz not null default now()
);
create index class_memberships_class_joined_idx on public.class_memberships(class_id,joined_at,id);
create table private.class_join_codes (
  class_id uuid primary key references public.classes(id) on delete cascade,
  code text not null unique check (code ~ '^[A-F0-9]{12}$'),
  created_at timestamptz not null default now()
);
create table private.mobile_join_limits (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  window_started_at timestamptz not null,
  attempts integer not null check(attempts>0)
);
alter table public.classes enable row level security;
alter table public.class_memberships enable row level security;
alter table private.class_join_codes enable row level security;
alter table private.mobile_join_limits enable row level security;
revoke all on public.classes,public.class_memberships from public,anon,authenticated;
grant select on public.classes,public.class_memberships to authenticated;
revoke all on private.class_join_codes,private.mobile_join_limits from public,anon,authenticated;

create function private.mobile_owns_class(p_class_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.classes where id=p_class_id and teacher_id=(select auth.uid()));
$$;
create function private.mobile_is_class_member(p_class_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.class_memberships where class_id=p_class_id and student_id=(select auth.uid()));
$$;
revoke all on function private.mobile_owns_class(uuid),private.mobile_is_class_member(uuid) from public,anon;
grant execute on function private.mobile_owns_class(uuid),private.mobile_is_class_member(uuid) to authenticated;
create policy mobile_class_read on public.classes for select to authenticated
 using (teacher_id=(select auth.uid()) or private.mobile_is_class_member(id));
create policy mobile_membership_read on public.class_memberships for select to authenticated
 using (student_id=(select auth.uid()) or private.mobile_owns_class(class_id));

create function private.mobile_guard_profile_role() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if new.role is distinct from old.role then
    if (new.role<>'USER' and exists(select 1 from public.class_memberships where student_id=new.id))
      or (new.role<>'TEACHER' and exists(select 1 from public.classes where teacher_id=new.id)) then
      raise exception 'ROLE_CHANGE_CONFLICT' using errcode='23514';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.mobile_guard_profile_role() from public,anon,authenticated;
create trigger mobile_guard_profile_role before update of role on public.profiles
 for each row execute function private.mobile_guard_profile_role();
