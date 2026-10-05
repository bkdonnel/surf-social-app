-- Profiles: one row per auth user, created via trigger on signup.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by any authenticated user"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid());

-- Creates a profile row automatically whenever a new auth user signs up.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Shared, admin-curated named surf spots.
create table public.spots (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  latitude double precision not null,
  longitude double precision not null,
  region text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

alter table public.spots enable row level security;

create policy "Spots are viewable by any authenticated user"
  on public.spots for select
  to authenticated
  using (true);

create policy "Only admins can add spots"
  on public.spots for insert
  to authenticated
  with check (exists (select 1 from public.profiles where id = auth.uid() and is_admin));

create policy "Only admins can update spots"
  on public.spots for update
  to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin));

create policy "Only admins can delete spots"
  on public.spots for delete
  to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin));

-- Per-user custom locations (not in the shared spot list), reusable across sessions.
create table public.custom_spots (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text,
  latitude double precision not null,
  longitude double precision not null,
  created_at timestamptz not null default now()
);

alter table public.custom_spots enable row level security;

create policy "Users manage their own custom spots"
  on public.custom_spots for all
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- Logged surf sessions. Exactly one of spot_id / custom_spot_id must be set.
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  spot_id uuid references public.spots (id),
  custom_spot_id uuid references public.custom_spots (id),
  started_at timestamptz not null,
  ended_at timestamptz not null,
  wave_count integer not null check (wave_count >= 0),
  rating smallint not null check (rating >= 1 and rating <= 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sessions_exactly_one_spot check (
    (spot_id is not null and custom_spot_id is null) or
    (spot_id is null and custom_spot_id is not null)
  ),
  constraint sessions_ended_after_started check (ended_at >= started_at)
);

alter table public.sessions enable row level security;

create policy "Users manage their own sessions"
  on public.sessions for all
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- Home spots: the set of spots (shared or custom) a user tracks forecasts for.
create table public.home_spots (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  spot_id uuid references public.spots (id),
  custom_spot_id uuid references public.custom_spots (id),
  created_at timestamptz not null default now(),
  constraint home_spots_exactly_one_spot check (
    (spot_id is not null and custom_spot_id is null) or
    (spot_id is null and custom_spot_id is not null)
  ),
  constraint home_spots_unique unique (owner_id, spot_id, custom_spot_id)
);

alter table public.home_spots enable row level security;

create policy "Users manage their own home spots"
  on public.home_spots for all
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());
