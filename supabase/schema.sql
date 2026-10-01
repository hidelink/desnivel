-- Desnivel: shared routes table.
-- Replaces Netlify Blobs for the "Compartir" feature. A single table serves
-- both anonymous shares (user_id null) and, later, routes owned by a logged
-- -in profile — same shape, so Explorar/perfil queries don't need to union
-- two sources.

create table if not exists routes (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  plan jsonb not null,
  is_hidden boolean not null default false,
  view_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists routes_user_id_idx on routes (user_id);

-- "Ciudad, País" derived once at save time from the route's first GPS
-- point (see save-route.mjs) — never recomputed on read, so showing it on
-- a card or feed costs nothing.
alter table routes add column if not exists location text;

alter table routes enable row level security;

-- Anyone can read a route that isn't hidden (covers anonymous share links,
-- which are always is_hidden = false, and public profile routes).
create policy "routes_public_read" on routes
  for select
  using (is_hidden = false);

-- An owner can always read their own routes, hidden or not.
create policy "routes_owner_read" on routes
  for select
  using (auth.uid() = user_id);

create policy "routes_owner_update" on routes
  for update
  using (auth.uid() = user_id);

create policy "routes_owner_delete" on routes
  for delete
  using (auth.uid() = user_id);

-- No insert policy: writes only happen through the Netlify Functions using
-- the service_role key (bypasses RLS), same trust boundary the app already
-- had with Blobs — the function is the only thing that can create a row.

create or replace function increment_route_views(route_id text)
returns void
language sql
as $$
  update routes set view_count = view_count + 1 where id = route_id;
$$;

-- Profiles: one per auth.users row, created by the client right after first
-- login via the "elige tu usuario" step (not a trigger — the user picks the
-- username themselves, so there's nothing to insert until then).
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  display_name text not null default '',
  avatar_color text not null default '#e8650a',
  created_at timestamptz not null default now(),
  constraint username_format check (username ~ '^[a-z0-9_]{3,20}$')
);

alter table profiles enable row level security;

-- Public profiles, like public routes — anyone can read any profile.
create policy "profiles_public_read" on profiles
  for select
  using (true);

-- A user can only ever create/edit their own profile row (client writes
-- this directly with the anon key, unlike routes — there's no serverless
-- function in front of it, so RLS is the only gate).
create policy "profiles_owner_insert" on profiles
  for insert
  with check (auth.uid() = id);

create policy "profiles_owner_update" on profiles
  for update
  using (auth.uid() = id);
