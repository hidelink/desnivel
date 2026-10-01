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

-- Postgres grants EXECUTE on new functions to PUBLIC by default, which
-- would let anyone with the anon key call this directly to inflate any
-- route's view count — only get-route.mjs (service_role) should ever call it.
revoke execute on function increment_route_views(text) from anon, authenticated;

-- Profiles: one per auth.users row, created by the client right after first
-- login via the "elige tu usuario" step (not a trigger — the user picks the
-- username themselves, so there's nothing to insert until then).
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  display_name text not null default '',
  avatar_color text not null default '#e8650a',
  created_at timestamptz not null default now(),
  constraint username_format check (username ~ '^[a-z0-9_]{3,20}$'),
  -- Real top-level routes a username would otherwise shadow — the
  -- /:username -> /perfil rewrite in netlify.toml only fires when no real
  -- file matches the request first, so one of these as a username would
  -- make that profile permanently unreachable at its clean URL. Enforced
  -- here too (not just client-side) since this is the only thing standing
  -- between a username and a real route once RLS lets the insert through.
  constraint username_not_reserved check (username not in (
    'perfil', 'editar-perfil', 'explorar', 'rutas', 'acerca', 'en', 'api',
    'admin', 'login', 'signup', 'logout', 'index', 'r'
  ))
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

-- Optional profile photo — null means "use avatar_color + initial" (the
-- existing fallback everywhere an avatar renders).
alter table profiles add column if not exists avatar_url text;

-- Storage bucket for profile photos. Each file lives at
-- avatars/<user_id>/avatar.jpg (fixed name, upsert on re-upload — no old
-- files to clean up), so the owner check is just "the first path segment
-- is my own user id".
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatar_public_read" on storage.objects
  for select
  using (bucket_id = 'avatars');

create policy "avatar_owner_insert" on storage.objects
  for insert
  with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "avatar_owner_update" on storage.objects
  for update
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "avatar_owner_delete" on storage.objects
  for delete
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
