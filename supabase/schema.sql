-- Multispecies Grass Survey — Supabase schema
-- Tables are prefixed grass_ because they share a project with other apps.
-- Farmers (anonymous) may only INSERT. Only emails listed in grass_survey_admins,
-- signed in through Supabase Auth, may read or delete responses.

create schema if not exists private;

create table if not exists public.grass_survey_responses (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  name         text check (name is null or char_length(name) <= 80),
  farm_type    text not null check (farm_type in (
                 'Suckler beef','Beef finishing','Dairy','Sheep','Mixed livestock','Tillage','Other')),
  county       text check (county is null or county in (
                 'Antrim','Armagh','Carlow','Cavan','Clare','Cork','Derry','Donegal','Down','Dublin',
                 'Fermanagh','Galway','Kerry','Kildare','Kilkenny','Laois','Leitrim','Limerick','Longford',
                 'Louth','Mayo','Meath','Monaghan','Offaly','Roscommon','Sligo','Tipperary','Tyrone',
                 'Waterford','Westmeath','Wexford','Wicklow')),
  collected_by text not null default 'Self-completed' check (collected_by in (
                 'Self-completed','Sean Monahan','Eamon Gill','Michael Glennon','Charlie Minnock')),
  q1 boolean not null,  -- heard of multispecies mixes
  q2 boolean not null,  -- have sown multispecies
  q3 boolean not null,  -- planning to sow
  q4 boolean not null,  -- grants would make more likely
  q5 boolean not null   -- believe it benefits productivity & sustainability
);

create index if not exists grass_survey_responses_created_at_idx
  on public.grass_survey_responses (created_at desc);

create table if not exists public.grass_survey_admins (
  email text primary key check (email = lower(email))
);

alter table public.grass_survey_responses enable row level security;
alter table public.grass_survey_admins   enable row level security;

create or replace function private.is_grass_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.grass_survey_admins a
    where a.email = lower(coalesce((select auth.jwt()) ->> 'email', ''))
  );
$$;

revoke all on function private.is_grass_admin() from public;
grant usage on schema private to anon, authenticated;
grant execute on function private.is_grass_admin() to anon, authenticated;

revoke all on public.grass_survey_responses from anon, authenticated;
grant insert on public.grass_survey_responses to anon, authenticated;
grant select, delete on public.grass_survey_responses to authenticated;
revoke all on public.grass_survey_admins from anon, authenticated;
grant select on public.grass_survey_admins to authenticated;

drop policy if exists "Anyone can submit a response" on public.grass_survey_responses;
create policy "Anyone can submit a response"
  on public.grass_survey_responses for insert
  to anon, authenticated
  -- created_at must be the server default (no back-dated or future rows)
  with check (created_at between now() - interval '5 minutes' and now() + interval '1 minute');

drop policy if exists "Admins can read responses" on public.grass_survey_responses;
create policy "Admins can read responses"
  on public.grass_survey_responses for select
  to authenticated
  using ((select private.is_grass_admin()));

drop policy if exists "Admins can delete responses" on public.grass_survey_responses;
create policy "Admins can delete responses"
  on public.grass_survey_responses for delete
  to authenticated
  using ((select private.is_grass_admin()));

drop policy if exists "Users can see their own admin row" on public.grass_survey_admins;
create policy "Users can see their own admin row"
  on public.grass_survey_admins for select
  to authenticated
  using (email = lower(coalesce((select auth.jwt()) ->> 'email', '')));

insert into public.grass_survey_admins (email) values ('josullivanedu@gmail.com')
  on conflict do nothing;
