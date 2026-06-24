-- ============================================================================
-- Future Board by Project MAKINA — Supabase schema
-- ============================================================================
-- Run this in the Supabase SQL Editor (or via the CLI) on a fresh project.
--
-- SECURITY NOTE:
--   This RLS policy is for MVP/testing only. Tighten before public production use.
--   The MVP has no auth/login; the browser uses an anonymous (publishable) key,
--   so policies below are intentionally permissive to keep development simple.
-- ============================================================================

-- Required for gen_random_uuid()
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- updated_at trigger function
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- rooms
-- ----------------------------------------------------------------------------
create table if not exists public.rooms (
  id                       uuid primary key default gen_random_uuid(),
  code                     text not null unique,
  -- 'waiting' is the joinable pre-game state (shared room-matching spec);
  -- 'setup' is the Future Board square-planting phase.
  status                   text not null default 'waiting'
                             check (status in ('waiting','setup','playing','finished')),
  host_client_id           text not null,
  board_length             integer not null default 40
                             check (board_length in (30,40,50)),
  setup_squares_per_player integer not null default 3,
  current_turn_player_id   uuid,
  turn_index               integer not null default 0,
  last_spurt_enabled       boolean not null default false,
  winner_player_id         uuid,
  seed                     text not null default gen_random_uuid()::text,
  version                  integer not null default 0,
  state                    jsonb not null default '{}'::jsonb,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index if not exists rooms_code_idx on public.rooms (code);

drop trigger if exists rooms_set_updated_at on public.rooms;
create trigger rooms_set_updated_at
  before update on public.rooms
  for each row execute function public.set_updated_at();

-- Optimistic-concurrency version counter, auto-incremented on every update
-- (shared room-matching spec).
create or replace function public.bump_room_version()
returns trigger
language plpgsql
as $$
begin
  new.version = coalesce(old.version, 0) + 1;
  return new;
end;
$$;

drop trigger if exists rooms_bump_version on public.rooms;
create trigger rooms_bump_version
  before update on public.rooms
  for each row execute function public.bump_room_version();

-- ----------------------------------------------------------------------------
-- players
-- ----------------------------------------------------------------------------
create table if not exists public.players (
  id             uuid primary key default gen_random_uuid(),
  room_id        uuid not null references public.rooms(id) on delete cascade,
  client_id      text not null,
  name           text not null default 'Player',
  position       integer not null default 0,
  is_ready       boolean not null default false,
  skip_next_turn boolean not null default false,
  is_cpu         boolean not null default false,
  score          integer not null default 0,
  joined_at      timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (room_id, client_id)
);

create index if not exists players_room_idx on public.players (room_id);

drop trigger if exists players_set_updated_at on public.players;
create trigger players_set_updated_at
  before update on public.players
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- squares
-- ----------------------------------------------------------------------------
create table if not exists public.squares (
  id                uuid primary key default gen_random_uuid(),
  room_id           uuid not null references public.rooms(id) on delete cascade,
  position          integer not null,
  creator_player_id uuid references public.players(id) on delete set null,
  title             text not null default '',
  body              text not null default '',
  effect_type       text not null default 'no_effect',
  effect_value      jsonb not null default '{}'::jsonb,
  visibility        text not null default 'hidden'
                      check (visibility in ('hidden','public')),
  is_revealed       boolean not null default false,
  created_phase     text not null default 'setup'
                      check (created_phase in ('setup','last_spurt')),
  created_at        timestamptz not null default now(),
  revealed_at       timestamptz,
  -- one square per board position
  unique (room_id, position)
);

create index if not exists squares_room_idx on public.squares (room_id);
create index if not exists squares_room_pos_idx on public.squares (room_id, position);

-- ----------------------------------------------------------------------------
-- game_events (event log)
-- ----------------------------------------------------------------------------
create table if not exists public.game_events (
  id         uuid primary key default gen_random_uuid(),
  room_id    uuid not null references public.rooms(id) on delete cascade,
  player_id  uuid references public.players(id) on delete set null,
  event_type text not null,
  payload    jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists game_events_room_idx on public.game_events (room_id, created_at);

-- ----------------------------------------------------------------------------
-- votes (MVP: lightweight, manual resolution)
-- ----------------------------------------------------------------------------
create table if not exists public.votes (
  id               uuid primary key default gen_random_uuid(),
  room_id          uuid not null references public.rooms(id) on delete cascade,
  square_id        uuid references public.squares(id) on delete cascade,
  status           text not null default 'open',
  target_player_id uuid references public.players(id) on delete set null,
  payload          jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now()
);

create index if not exists votes_room_idx on public.votes (room_id);

-- ----------------------------------------------------------------------------
-- landings (one row per "a player stopped on a square") + applause counter
-- ----------------------------------------------------------------------------
-- Final ranking is decided by total claps a player received across their
-- landings (not by goal-arrival order). Each landing snapshots the square so
-- the result screen can list events even if the square is later removed.
create table if not exists public.landings (
  id          uuid primary key default gen_random_uuid(),
  room_id     uuid not null references public.rooms(id) on delete cascade,
  player_id   uuid references public.players(id) on delete cascade,
  square_id   uuid references public.squares(id) on delete set null,
  position    integer not null,
  title       text not null default '',
  body        text not null default '',
  effect_type text not null default 'no_effect',
  claps       integer not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists landings_room_idx on public.landings (room_id, created_at);

-- Atomic clap increment so concurrent applause never loses counts. Callable by
-- the anon (publishable) key. p_count lets the UI batch rapid taps into one call.
create or replace function public.clap_landing(p_landing_id uuid, p_count integer default 1)
returns void
language sql
as $$
  update public.landings
     set claps = claps + greatest(coalesce(p_count, 1), 0)
   where id = p_landing_id;
$$;

-- ============================================================================
-- Idempotent migration for projects created BEFORE the room-matching alignment.
-- Safe to run repeatedly; new projects already have these from the CREATE TABLEs.
-- ============================================================================
alter table public.rooms   add column if not exists seed    text    not null default gen_random_uuid()::text;
alter table public.rooms   add column if not exists version integer not null default 0;
alter table public.players add column if not exists is_cpu  boolean not null default false;

-- Rename the old 'lobby' status to 'waiting' and refresh the check constraint.
update public.rooms set status = 'waiting' where status = 'lobby';
alter table public.rooms drop constraint if exists rooms_status_check;
alter table public.rooms add constraint rooms_status_check
  check (status in ('waiting','setup','playing','finished'));

-- ============================================================================
-- Row Level Security
-- ----------------------------------------------------------------------------
-- This RLS policy is for MVP/testing only. Tighten before public production use.
-- ============================================================================
alter table public.rooms        enable row level security;
alter table public.players      enable row level security;
alter table public.squares      enable row level security;
alter table public.game_events  enable row level security;
alter table public.votes        enable row level security;
alter table public.landings     enable row level security;

-- Permissive MVP policies: allow anon + authenticated full access.
do $$
declare
  t text;
begin
  foreach t in array array['rooms','players','squares','game_events','votes','landings'] loop
    execute format('drop policy if exists "mvp_all_select" on public.%I;', t);
    execute format('drop policy if exists "mvp_all_insert" on public.%I;', t);
    execute format('drop policy if exists "mvp_all_update" on public.%I;', t);
    execute format('drop policy if exists "mvp_all_delete" on public.%I;', t);

    execute format(
      'create policy "mvp_all_select" on public.%I for select to anon, authenticated using (true);', t);
    execute format(
      'create policy "mvp_all_insert" on public.%I for insert to anon, authenticated with check (true);', t);
    execute format(
      'create policy "mvp_all_update" on public.%I for update to anon, authenticated using (true) with check (true);', t);
    execute format(
      'create policy "mvp_all_delete" on public.%I for delete to anon, authenticated using (true);', t);
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- Grants for the anon / authenticated roles
-- ----------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete
  on public.rooms, public.players, public.squares, public.game_events, public.votes, public.landings
  to anon, authenticated;
grant execute on function public.clap_landing(uuid, integer) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- Realtime: add tables to the supabase_realtime publication
-- ----------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['rooms','players','squares','game_events','votes','landings'] loop
    -- ignore "already member of publication" errors
    begin
      execute format('alter publication supabase_realtime add table public.%I;', t);
    exception when duplicate_object then
      null;
    end;
  end loop;
end $$;

-- Ensure UPDATE/DELETE realtime payloads include the row identity.
alter table public.rooms       replica identity full;
alter table public.players     replica identity full;
alter table public.squares     replica identity full;
alter table public.game_events replica identity full;
alter table public.votes       replica identity full;
alter table public.landings    replica identity full;
