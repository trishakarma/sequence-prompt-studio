-- Apply to the Supabase project that owns profiles. No service key is used by the app.
begin;
create schema if not exists studio_private;
revoke all on schema studio_private from public;
grant usage on schema studio_private to authenticated;
alter table public.profiles add column if not exists is_superadmin boolean not null default false;
create or replace function studio_private.is_admin() returns boolean
language sql stable security definer set search_path = ''
as $$ select exists(select 1 from public.profiles where auth.uid() is not null and id=auth.uid() and is_superadmin is true) $$;
revoke all on function studio_private.is_admin() from public;
grant execute on function studio_private.is_admin() to authenticated;
-- Prevent clients from granting themselves superadmin access, including through existing broad profile policies.
create or replace function studio_private.protect_admin() returns trigger
language plpgsql set search_path = '' as $$
begin
 if current_user in ('anon','authenticated') then
  if TG_OP='INSERT' and NEW.is_superadmin is true then raise exception 'Admin role is managed by the database owner'; end if;
  if TG_OP='UPDATE' and NEW.is_superadmin is distinct from OLD.is_superadmin then raise exception 'Admin role is managed by the database owner'; end if;
 end if;
 return NEW;
end $$;
drop trigger if exists studio_protect_admin on public.profiles;
create trigger studio_protect_admin before insert or update on public.profiles for each row execute function studio_private.protect_admin();
create table public.studio_chains (
 id uuid primary key default gen_random_uuid(), name text not null check(length(name) between 1 and 100), description text not null default '',
 steps jsonb not null default '[]' check(jsonb_typeof(steps)='array' and jsonb_array_length(steps)<=12), updated_at timestamptz not null default now()
);
create table public.studio_runs (
 id uuid primary key default gen_random_uuid(),chain_id uuid not null references public.studio_chains on delete cascade,
 chain_name text not null,user_id uuid not null references auth.users,created_at timestamptz not null default now(),
 snapshot jsonb not null,status text not null check(status in ('running','completed','failed')),outputs jsonb not null default '[]',error text
);
alter table public.studio_chains enable row level security;
alter table public.studio_runs enable row level security;
create policy studio_chains_admin on public.studio_chains for all to authenticated using((select studio_private.is_admin())) with check((select studio_private.is_admin()));
create policy studio_runs_admin on public.studio_runs for all to authenticated using((select studio_private.is_admin())) with check((select studio_private.is_admin()));
grant select,insert,update,delete on public.studio_chains, public.studio_runs to authenticated;
create index studio_runs_chain_created_idx on public.studio_runs(chain_id, created_at desc);
create index studio_runs_user_idx on public.studio_runs(user_id);
revoke all on function studio_private.protect_admin() from public;
commit;
