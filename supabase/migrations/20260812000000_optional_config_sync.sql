create table public.user_configs (
  user_id uuid primary key references auth.users (id) on delete cascade,
  config jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.user_configs enable row level security;

revoke all on table public.user_configs from anon;
grant select, insert, update, delete on table public.user_configs to authenticated;

create policy "users can read their own config"
on public.user_configs
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "users can create their own config"
on public.user_configs
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "users can update their own config"
on public.user_configs
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "users can delete their own config"
on public.user_configs
for delete
to authenticated
using ((select auth.uid()) = user_id);

create function public.set_user_config_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_user_config_updated_at
before update on public.user_configs
for each row
execute function public.set_user_config_updated_at();

create table public.sync_beta_allowlist (
  email text primary key,
  created_at timestamptz not null default now(),
  constraint sync_beta_allowlist_normalized_email
    check (email = lower(trim(email)))
);

alter table public.sync_beta_allowlist enable row level security;

revoke all on table public.sync_beta_allowlist from anon, authenticated, public;
grant usage on schema public to supabase_auth_admin;
grant select on table public.sync_beta_allowlist to supabase_auth_admin;

create policy "auth hook can read the beta allowlist"
on public.sync_beta_allowlist
for select
to supabase_auth_admin
using (true);

create function public.hook_restrict_sync_beta_signup(event jsonb)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  signup_email text;
begin
  signup_email := lower(trim(event->'user'->>'email'));

  if signup_email is null
    or signup_email = ''
    or not exists (
      select 1
      from public.sync_beta_allowlist
      where email = signup_email
    )
  then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'http_code', 403,
        'message', 'Sync is currently invite-only. Contact support@thenewtab.app for access.'
      )
    );
  end if;

  return '{}'::jsonb;
end;
$$;

grant execute on function public.hook_restrict_sync_beta_signup(jsonb)
to supabase_auth_admin;
revoke execute on function public.hook_restrict_sync_beta_signup(jsonb)
from anon, authenticated, public;
