# Implementation Plan

Status log + remaining steps to take Surf Social from scaffold to a real, used app. See `CLAUDE.md` for the why behind each architectural decision referenced here.

## Phase 0 — Planning ✅ Done

Ran a full requirements "grilling" session before writing any code. Settled: v1/v2 scope split, platform (React Native + Expo), user base (small circle, portfolio-quality), spot model (predefined + custom hybrid), backend (Supabase), forecast API (Open-Meteo), forecast UX (on-demand, not push), auth method (email/password), offline requirement, session field shapes (start/end timestamps, 1-5 stars), custom-location reuse, and shared-spot curation (admin-only).

## Phase 1 — Scaffold ✅ Done

- [x] Expo app created (`create-expo-app`, default template — Expo Router, SDK 57, TypeScript)
- [x] Installed: `@supabase/supabase-js`, `@react-native-async-storage/async-storage`, `react-native-url-polyfill`, `expo-sqlite`, `@react-native-community/datetimepicker`, `@expo/vector-icons`
- [x] Supabase client (`src/lib/supabase.ts`) with AsyncStorage-backed session persistence
- [x] Full SQL schema + RLS policies (`supabase/migrations/0001_init.sql`): `profiles`, `spots`, `custom_spots`, `sessions`, `home_spots`
- [x] Hand-written TS types matching the schema (`src/types/database.ts`)
- [x] Auth flow: `(auth)` group (sign-in/sign-up) and `(tabs)` group, redirecting based on session state
- [x] Open-Meteo Marine API client (`src/lib/forecast.ts`) — verified against live docs, not assumed from memory
- [x] Three v1 tabs: Log (list + add session form), Spots (shared + personal, add custom location), Forecast (home spots, on-demand hourly summary)
- [x] Removed template demo screens/components no longer used
- [x] `npx tsc --noEmit` clean, `npx expo lint` clean
- [x] Committed and pushed to `github.com/bkdonnel/surf-social-app` (public)

## Phase 2 — Connect a real Supabase project (in progress)

This has to happen before the app actually runs against real data.

- [x] Create a Supabase project at supabase.com
- [x] Run `supabase/migrations/0001_init.sql` against it (via the SQL editor) — all 5 tables confirmed in Table Editor
- [x] Copy `.env.example` → `.env`, fill in `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- [x] Sign up once in the app, then in the SQL editor: `update public.profiles set is_admin = true where email = '<you>'`
- [x] Disabled "Confirm email" in Supabase Auth settings (Authentication → Sign In / Up → Email) — default confirmation redirect (`localhost:3000`) doesn't work for a mobile app; deep-link redirect not yet built, revisit later
- [x] Fixed a dark-mode bug on sign-in/sign-up screens: `TextInput` had no explicit text/background color, so it rendered black-on-black in dark mode (`src/app/(auth)/sign-in.tsx`, `sign-up.tsx`) — now wired through `useTheme()`
- [ ] Hand-seed the shared `spots` table (~20-50 spots you/friends actually surf) via the Supabase table editor — there's no in-app admin UI or bulk importer by design (see CLAUDE.md on why)
- [ ] Run `npx expo start` and walk through: sign up → add a custom spot → log a session → add a home spot → view its forecast (signed in successfully; rest of the flow not yet walked through)

## Phase 3 — Offline-first session logging (not started)

Settled as a hard v1 requirement (surf spots are low-signal), but not yet built — `log.tsx` currently writes straight to Supabase and will fail with no connection.

- [ ] Add a local SQLite table (via `expo-sqlite`) mirroring the `sessions` shape, with a `synced` flag
- [ ] On session save: always write locally first, optimistically update the UI, then attempt the Supabase insert
- [ ] On reconnect (e.g. `NetInfo` listener or a retry-on-focus check): push any unsynced local rows to Supabase, mark them synced
- [ ] Decide conflict handling for the edge case of the same account editing offline on two devices — low priority given the small/personal user base, but don't leave it silently undefined
- [ ] Update `use-sessions.ts` to read from local SQLite first (instant list), reconciling with Supabase in the background

## Phase 4 — V1 polish (not started)

- [ ] Replace the manual lat/long text entry in `spots.tsx` with device GPS (via `expo-location`) as a prefill, keeping manual entry as a fallback
- [ ] Basic form validation/UX pass (loading states, empty states already exist but haven't been tested on-device)
- [ ] Decide and implement app icon / splash branding (currently Expo defaults)
- [ ] Run through the golden path and edge cases on an actual iOS and Android device/simulator, not just typecheck/lint

## Phase 5 — Ship to real devices (not started)

- [ ] Set up EAS (`eas build`), per `AGENTS.md` — no local Xcode/Android Studio needed
- [ ] Internal distribution to your test group: TestFlight (iOS) + an internal Android track or direct APK, since this is "personal, small circle" for now, not a public App Store launch
- [ ] Revisit whether App Store/Play Store public listing is wanted at all, given the "personal project, portfolio-quality" framing — it may never need to go fully public

## Phase 6 — V2: Social (not started)

Deliberately deferred out of v1. Revisit scope with a fresh short grilling pass when you get here, since "follow" and "feed" each hide their own decisions (follow requests vs. open follow, feed ranking/pagination, what's visible to whom). Rough shape based on what's already settled:

- [ ] `follows` table (follower_id, followee_id, status) — decide request-based vs. open follow
- [ ] Feed query: sessions from followed users, paginated
- [ ] Privacy: sessions stay private by default (per Q3) — only visible to the owner and, once v2 ships, their accepted followers
- [ ] Push notifications were deferred from forecast tracking too — reconsider both together, since they share the same notification infra
