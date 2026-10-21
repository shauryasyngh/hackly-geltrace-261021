# KIT.md, read this before you change anything

This repo is the `next-supabase` starter kit. Auth, the database client, session refresh, migrations and the smoke test are already wired. Do not redo them. Build the product on top.

## already wired, leave it alone
- `lib/supabase/server.ts`: `supabaseServer()` for server components, route handlers and server actions.
- `lib/supabase/client.ts`: `supabaseBrowser()` for client components.
- `proxy.ts`: refreshes the session cookie on every request. Keep the matcher.
- `/login` (magic link), `/auth/confirm` (link lands here), `/auth/signout` (POST).
- `supabase/migrations/0001_init.sql`: `profiles` table, one row per auth user via trigger, row level security on.
- `smoke.mjs`: `npm run smoke` builds and checks `/` returns 200.
- env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Never commit `.env`.

## where your code goes
- Pages under `app/`. Replace `app/page.tsx` with the product's main screen. Keep the signed-out branch working: the page must render when there is no user.
- Server actions next to the page (`app/<route>/actions.ts`, `"use server"` at the top).
- Styling is Tailwind v4 via `app/globals.css`. Add your own css there. No ui libraries.

## adding a table
1. New file `supabase/migrations/0002_<name>.sql`. Numbered, never edit an old one.
2. `create table public.<name> (...)`, then `alter table public.<name> enable row level security;` and a policy. A table without a policy is invisible to the app.
3. Demo rows go in `supabase/seed.sql` (plain `insert` statements, idempotent with `on conflict do nothing`).
4. Query it with `supabaseServer()` from a server component: `const { data } = await supabase.from("<name>").select("*")`.

## before you finish
- `npm run smoke` must pass. If it fails, fix the build, do not delete the test.
- Do not add dependencies unless the plan names them.
- Do not write secrets anywhere in the repo.
