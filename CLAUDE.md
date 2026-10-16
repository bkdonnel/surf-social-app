# Surf Social

A mobile app for logging surf sessions and tracking forecasts for saved home spots. Eventually (v2) adds following friends and a feed of their sessions. Personal project, built to be shown to potential employers — portfolio-quality, but used for real by a small circle of family/friends from the start.

See `AGENTS.md` for Expo/React Native tooling conventions (commands, navigation rules, EAS). See `IMPLEMENTATION.md` for the step-by-step build plan and current progress.

## Scope

- **v1** (in progress): session logging + on-demand forecast tracking for saved home spots, multi-user from day one, no social layer yet.
- **v2** (not started): follow friends, feed of friends' sessions.

## Stack & key decisions

These were deliberately decided (not defaults picked without thought) — change them only if the reasoning below no longer holds:

- **Platform**: React Native + Expo (Expo Router), targeting iOS + Android. Chosen over native-per-platform to keep this a one-codebase solo build, and over a plain web app because logging happens from the beach/car and needs to feel native + work offline.
- **Backend**: Supabase (Postgres + Auth + Row Level Security). Chosen over a custom backend — gets real auth and RLS without hosting/writing a server, and demos well (shows schema design + RLS, not just CRUD).
- **Forecast data**: Open-Meteo Marine API (free, no API key, global). Chosen over Stormglass (paid) and Surfline (no legitimate API — unofficial/scraping only, or enterprise licensing). Trade-off accepted: no tide data, and no built-in named-spot database.
- **Spot model**: hybrid — a shared, **admin-curated** table of named spots (`spots`), plus per-user **custom locations** (`custom_spots`) for anything not on the shared list. There is no good free/legal bulk source of named surf spots (researched: OSM surf tagging is sparse, Wikidata only covers ~100-300 famous breaks) — the shared list is meant to be hand-seeded (~20-50 spots you/friends actually surf) and grown deliberately, not bulk-imported.
- **Auth**: email/password (not social login) via Supabase.
- **Offline**: session logging must work with no signal (a real constraint at surf spots, not a nice-to-have) — local-first write with sync on reconnect. `expo-sqlite` is installed for this; **the sync logic itself is not yet built** (see IMPLEMENTATION.md).
- **Forecast UX**: on-demand view only for v1. Push notifications on forecast thresholds (e.g. "waves over 3ft at X") are a deliberate v2+ feature, not a v1 gap.
- **Session fields**: start/end timestamps (not a single duration number) specifically so forecast conditions can later be correlated to the time of the session. Rating is a plain 1-5 star scale.

## Project structure

```
src/app/(auth)/        sign-in, sign-up — redirects to (tabs) if already signed in
src/app/(tabs)/        log (sessions), spots (shared+custom), forecast (home spots)
src/hooks/             use-auth, use-spots, use-sessions, use-home-spots
src/lib/supabase.ts    Supabase client (reads EXPO_PUBLIC_SUPABASE_* env vars)
src/lib/forecast.ts    Open-Meteo Marine API client
src/types/database.ts  Hand-written types matching the Supabase schema exactly
supabase/migrations/   SQL schema + RLS policies (0001_init.sql)
```

Database tables: `profiles` (1:1 with auth users, has `is_admin`), `spots` (shared, admin-insert-only via RLS), `custom_spots` (owner-only), `sessions` (owner-only; exactly one of `spot_id`/`custom_spot_id` set, enforced by a check constraint), `home_spots` (owner-only; same exactly-one-spot constraint — this is what the forecast tab tracks).

## Current status

Scaffolded and committed, and now connected to a real Supabase project (see IMPLEMENTATION.md for the detailed log). `npx tsc --noEmit` and `npx expo lint` both pass. `.env` is filled in, the `0001_init.sql` migration has run, and the first account (admin) is signed up and promoted via `is_admin = true`. The shared `spots` table has its first 4 rows (North Ponto, Beacons, Pipes, Warm Water Jetty — all San Diego North County); hand-seeding continues toward the ~20-50 target. The golden-path walkthrough is underway on-device (iOS + Expo Go): signing in, logging a session, adding a home spot, and viewing live Forecast tab data are all confirmed working. Several bugs surfaced during this pass and are already fixed (see IMPLEMENTATION.md for specifics). Still unconfirmed: adding a custom spot.

The Forecast tab was reworked beyond its original scaffold: it now shows a 3-day, horizontally-scrollable hourly forecast (grouped by day, with a sticky day-label header and a fixed Time/Height/Period label column), with wave height displayed in feet. See IMPLEMENTATION.md for the design details.

Email confirmation is temporarily **disabled** in Supabase Auth settings (the default confirmation link redirects to `localhost:3000`, which assumes a web app; proper support means wiring up a deep-link redirect via the app's `surfsocialapp://` scheme, not yet built). Fine for now given the small/trusted user base — revisit before any wider use.
