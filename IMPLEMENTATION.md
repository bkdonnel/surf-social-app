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
- [x] Hand-seed the shared `spots` table — started: North Ponto, Beacons, Pipes, Warm Water Jetty (San Diego North County) added via SQL editor. More to add over time as spots come up (~20-50 target, no rush)
- [ ] Run `npx expo start` and walk through: sign up → add a custom spot → log a session → add a home spot → view its forecast
  - [x] Signed in, logged a session against an existing shared spot
  - [x] Added North Ponto (shared spot) as a home spot
  - [ ] Add a *custom* spot (not yet exercised)
  - [x] Confirm the Forecast tab actually renders live wave height/period data for a home spot — confirmed on-device after a full app reload (see gotcha below)
  - **Bugs found and fixed during this pass:**
    - `src/components/date-time-field.tsx`: the iOS inline date/time picker fired `onChange` on every field (hour, then minute) but the code closed the picker on the first `onChange`, so picking the hour dismissed it before the minute could be set. Fixed by only updating the value on `onChange` and adding an explicit "Done" button to dismiss.
    - `src/app/(tabs)/log.tsx`: the log-session form had no scroll container, so on a tall form (e.g. with the date picker expanded) the Save/Cancel buttons could be pushed off-screen with no way to reach them. Fixed by wrapping the form in a `ScrollView` and hiding the sessions list while the form is open so the form gets the full screen.
    - `src/lib/supabase.ts`: Expo Router's web static-output SSR render (Node, no `window`) unconditionally hit the AsyncStorage-backed auth storage, throwing `ReferenceError: window is not defined` and crashing the entire dev server process (killing Metro and the phone's connection) within seconds of every `npx expo start`. Fixed by skipping storage/session-persistence when `typeof window === 'undefined'`.
    - `src/app/(tabs)/forecast.tsx`: the hourly forecast sliced the first 6 hours of the raw Open-Meteo response, which starts at midnight of the current day — so depending on time of day, the "next few hours" view could actually show hours that had already passed. Fixed by filtering to hours at or after the current hour before slicing.
  - **Dev workflow gotcha hit during this pass:** after a round of `forecast.tsx` edits, the phone showed none of them — Metro's log showed only a single "Bundled" event (from the original `npx expo start`) and a stale warning from code that had since been removed, meaning Fast Refresh had stopped reaching the device. Fix was a manual reload (Expo Go dev menu → Reload). Worth checking the Metro log for repeated "Bundled" lines before assuming an edit is live on-device.

### Forecast tab redesign (while finishing the walkthrough)

Reworked `src/app/(tabs)/forecast.tsx` from a flat 6-hour strip into a proper multi-day forecast view:

- Fetches 3 days from Open-Meteo (`fetchMarineForecast(lat, lon, 3)`) and filters to the current hour onward (no more showing already-passed hours).
- Hours are grouped by calendar day and rendered as a single horizontally-scrollable strip of day-blocks (one `ScrollView`, not nested per-day scrolling).
- A fixed left-hand column (outside the scrollable area) labels the three stacked rows in every hour cell: **Time / Height / Period**.
- A single day label ("Fri", "Sat", …) sits above the grid and updates via `onScroll` + per-day-block `onLayout` x-offsets, acting like a sticky section header — it stays put while that day's hours scroll by and swaps the instant the next day's first hour reaches the left edge.
- Wave height is converted from the API's meters to feet for display (`METERS_TO_FEET = 3.28084`); period stays in seconds.

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
