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
