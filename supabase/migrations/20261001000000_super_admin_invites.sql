create table public.user_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  is_super_admin boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.user_profiles enable row level security;

revoke all on table public.user_profiles from anon, authenticated, public;
grant select on table public.user_profiles to authenticated;

create policy "users can read their own profile"
on public.user_profiles
for select
to authenticated
using ((select auth.uid()) = user_id);

alter table public.sync_beta_allowlist
  add column invited_by uuid references auth.users (id) on delete set null;

create function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_profiles
    where user_id = auth.uid()
      and is_super_admin
  );
$$;

create function public.invite_sync_beta_user(invite_email text)
returns public.sync_beta_allowlist
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_email text;
  invite public.sync_beta_allowlist;
begin
  if not public.is_super_admin() then
    raise exception 'Only super admins can invite users.'
      using errcode = '42501';
  end if;

  normalized_email := lower(trim(invite_email));

  if normalized_email is null
    or normalized_email = ''
    or position('@' in normalized_email) = 0
  then
    raise exception 'Enter a valid email address.'
      using errcode = '22023';
  end if;

  insert into public.sync_beta_allowlist (email, invited_by)
  values (normalized_email, auth.uid())
  on conflict (email) do nothing;

  select *
  into invite
  from public.sync_beta_allowlist
  where email = normalized_email;

  return invite;
end;
$$;

create function public.list_sync_beta_invites()
returns setof public.sync_beta_allowlist
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_super_admin() then
    raise exception 'Only super admins can view invites.'
      using errcode = '42501';
  end if;

  return query
  select *
  from public.sync_beta_allowlist
  order by created_at desc;
end;
$$;

revoke execute on function public.is_super_admin() from public, anon;
revoke execute on function public.invite_sync_beta_user(text) from public, anon;
revoke execute on function public.list_sync_beta_invites() from public, anon;

grant execute on function public.is_super_admin() to authenticated;
grant execute on function public.invite_sync_beta_user(text) to authenticated;
grant execute on function public.list_sync_beta_invites() to authenticated;
