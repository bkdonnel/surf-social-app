# Surf Social

Log surf sessions, save home spots, and check their forecast. Built with Expo (React Native) and Supabase.

**v1 scope** (current): session logging + on-demand forecast for saved home spots, for a small group of real accounts.
**v2 scope** (not yet built): follow friends, feed of friends' sessions.

## Stack

- **App**: Expo + Expo Router, TypeScript
- **Backend**: Supabase (Postgres, Auth, Row Level Security)
- **Forecast data**: [Open-Meteo Marine API](https://open-meteo.com/en/docs/marine-weather-api) (free, no API key)

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a Supabase project at [supabase.com](https://supabase.com), then run the schema in `supabase/migrations/0001_init.sql` against it — either paste it into the Supabase SQL editor, or apply it with the [Supabase CLI](https://supabase.com/docs/guides/local-development) once you've linked the project.

3. Copy `.env.example` to `.env` and fill in your project's URL and anon key (found in Project Settings → API):

   ```bash
   cp .env.example .env
   ```

4. Make yourself an admin so you can curate the shared spot list — after signing up once in the app, run this in the Supabase SQL editor:

   ```sql
   update public.profiles set is_admin = true where email = 'you@example.com';
   ```

   Shared spots are added directly in the Supabase table editor (`spots` table: name, latitude, longitude) for now — there's no in-app admin UI yet.

5. Start the app:

   ```bash
   npx expo start
   ```

## Project structure

- `src/app/(auth)/` — sign in / sign up
- `src/app/(tabs)/` — the three v1 tabs: `log` (sessions), `spots` (shared + personal spots), `forecast` (home spots)
- `src/lib/supabase.ts` — Supabase client
- `src/lib/forecast.ts` — Open-Meteo Marine API client
- `src/hooks/` — `use-auth`, `use-spots`, `use-sessions`, `use-home-spots`
- `supabase/migrations/0001_init.sql` — full schema + RLS policies

## Known gaps / next steps

- **Offline sync**: sessions currently write straight to Supabase. Offline-first logging (local write + sync on reconnect) was a settled v1 requirement but isn't implemented yet — `expo-sqlite` is installed and ready for this.
- **Spot seeding**: the shared `spots` table starts empty. Hand-curate ~20–50 spots you and your friends actually surf via the Supabase table editor; there's no bulk importer (a decent public dataset doesn't really exist — see research notes from planning).
- **Push notifications** for forecast thresholds: deferred to post-v1 by design.
- **Social (v2)**: follow/feed isn't started — `profiles` table exists and is ready to support it.
