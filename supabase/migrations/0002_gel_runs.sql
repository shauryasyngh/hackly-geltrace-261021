-- Public, read-only synthetic demo. Auth and profiles remain owned by the kit.
create table public.gel_runs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  image_path text not null,
  image_width integer not null check (image_width > 0),
  image_height integer not null check (image_height > 0),
  target_bp integer not null check (target_bp > 0),
  is_demo boolean not null default false
);

create table public.gel_lanes (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.gel_runs (id) on delete cascade,
  lane_number integer not null check (lane_number > 0),
  label text not null,
  role text not null check (role in ('ladder', 'positive', 'negative', 'sample')),
  x_left numeric not null check (x_left >= 0),
  x_right numeric not null check (x_right > x_left),
  unique (run_id, lane_number)
);

create table public.gel_bands (
  id uuid primary key default gen_random_uuid(),
  lane_id uuid not null references public.gel_lanes (id) on delete cascade,
  y_center numeric not null check (y_center >= 0),
  band_height numeric not null check (band_height > 0),
  reference_bp integer check (reference_bp > 0),
  evidence_label text not null
);

create index gel_bands_lane_id_idx on public.gel_bands (lane_id);

alter table public.gel_runs enable row level security;
alter table public.gel_lanes enable row level security;
alter table public.gel_bands enable row level security;

grant select on public.gel_runs, public.gel_lanes, public.gel_bands to anon, authenticated;

create policy "read demo gel runs" on public.gel_runs
  for select to anon, authenticated using (is_demo = true);

create policy "read demo gel lanes" on public.gel_lanes
  for select to anon, authenticated using (
    exists (select 1 from public.gel_runs r where r.id = run_id and r.is_demo = true)
  );

create policy "read demo gel bands" on public.gel_bands
  for select to anon, authenticated using (
    exists (
      select 1 from public.gel_lanes l
      join public.gel_runs r on r.id = l.run_id
      where l.id = lane_id and r.is_demo = true
    )
  );
