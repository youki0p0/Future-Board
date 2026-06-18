# Setup — Future Board by Project MAKINA

仕込め。踏め。笑え。 — みんなで未来のマスを仕込んで、踏みに行くパーティすごろく。

This is a Next.js 15 (App Router) + Supabase Realtime web party game, deployable on Vercel. No login required: each browser generates a stable `client_id` in `localStorage`.

---

## 1. Prerequisites

- Node.js 18.18+ (Node 20+ recommended)
- A free [Supabase](https://supabase.com) project
- (Optional) A [Vercel](https://vercel.com) account for deployment

---

## 2. Supabase setup

1. Create a new Supabase project.
2. Open **SQL Editor** and run the contents of [`supabase/schema.sql`](../supabase/schema.sql).
   - This creates the `rooms`, `players`, `squares`, `game_events`, `votes` tables,
     indexes, `updated_at` + room `version` triggers, permissive **MVP** RLS policies,
     the required grants, and registers the tables with the `supabase_realtime` publication.
   - **Already have a database from an earlier version?** Just re-run the file — it
     includes an idempotent migration block that adds the new `seed` / `version` /
     `is_cpu` columns and renames the old `lobby` room status to `waiting`.

> **Room-matching spec:** room codes are 4 uppercase chars
> (`ABCDEFGHJKLMNPQRSTUVWXYZ23456789`, no ambiguous I/O/0/1), the joinable
> pre-game status is `waiting`, the host is identified by `rooms.host_client_id`,
> and players are matched/rejoined by the unique `(room_id, client_id)` pair —
> aligned with the shared Project MAKINA room-matching system.
3. In **Project Settings → API**, copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **Publishable / anon key** → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

> ⚠️ **Never** use the `service_role` / secret key in this app. Only the public
> publishable (anon) key belongs in the client. The schema's RLS is intentionally
> permissive for the MVP — **tighten it before any public production use.**

### Realtime

The schema adds all game tables to the `supabase_realtime` publication. If realtime
does not seem to work, also confirm under **Database → Replication** that the
`supabase_realtime` publication includes these tables.

---

## 3. Local development

```bash
cp .env.example .env.local
# edit .env.local and fill in the two NEXT_PUBLIC_SUPABASE_* values

npm install
npm run dev
```

Open http://localhost:3000. To test multiplayer locally, open the room URL in
multiple browser tabs / windows (each tab gets its own `client_id`), or use
different devices on the same network.

If the env vars are missing, the app does **not** crash — it shows a setup screen
explaining which variables to configure.

---

## 4. Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | yes | Supabase publishable (anon) key |

`.env.local` is git-ignored. Do not commit real keys.

---

## 5. Deploy to Vercel

1. Push this repository to GitHub.
2. Import the project in Vercel (Framework preset: **Next.js**).
3. Add the two environment variables above under
   **Project → Settings → Environment Variables** (Production / Preview / Development).
4. Deploy. Share a room link like `https://your-app.vercel.app/room/ABCD`.

---

## 6. How to play

1. **Home** — Create a room (choose board size: 30 / 40 / 50) or join with a code.
2. **Lobby** — Set your name, mark Ready. Host starts the setup phase (2+ players).
3. **Setup / 仕込み** — Each player secretly plants squares (2 / 3 / 4 depending on
   board size) with a title, body, effect template, and hidden/public visibility.
4. **Game / すごろく** — Take turns rolling 1–6. Landing on a hidden square reveals
   it to everyone and applies its effect to the player who stepped on it.
5. **Last Spurt** — Once anyone is within 10 of the goal, each player may plant one
   extra square at the end of their turn to stir up the finish.
6. **Result** — First to the goal wins. See rankings, squares stepped, how often your
   squares got stepped on, and the hottest square of the game.

---

## 7. Project structure

```
app/
  page.tsx                 Home (env guard → HomeScreen)
  room/[code]/page.tsx     Room route (env guard → RoomClient)
  room/[code]/RoomClient.tsx
components/                HomeScreen, Lobby, SetupPhase, GamePhase, GameBoard,
                           BoardSquare, PlayerList, DiceRoller, SquareEditor,
                           EventLog, ResultScreen, SetupRequired
lib/                       supabase, clientId, room (data + turn engine),
                           gameRules, effects, board, useRoomState
types/game.ts              Shared domain types
supabase/schema.sql        Database schema + RLS + realtime
docs/SETUP.md              This file
```
