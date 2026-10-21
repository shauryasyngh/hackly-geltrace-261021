-- Synthetic teaching fixture, not an experimental result. Safe to run again.
-- Coordinates are in the bundled 640 x 360 image, measured from its top left.
insert into public.gel_runs
  (id, title, image_path, image_width, image_height, target_bp, is_demo)
values
  ('00000000-0000-4000-8000-000000000007', 'gel run 07', '/images/gel-run-07.png', 640, 360, 500, true)
on conflict do nothing;

insert into public.gel_lanes
  (id, run_id, lane_number, label, role, x_left, x_right)
values
  ('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000007', 1, 'ladder', 'ladder', 60, 132),
  ('10000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000007', 2, 'positive', 'positive', 164, 236),
  ('10000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000007', 3, 'negative', 'negative', 268, 340),
  ('10000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000007', 4, 'sample a', 'sample', 372, 444),
  ('10000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000007', 5, 'sample b', 'sample', 476, 548)
on conflict do nothing;

-- Only ladder bands have known reference sizes. Sample sizes are calculated later.
-- The negative evidence is a seeded review flag, not automatic detection or confirmed contamination.
insert into public.gel_bands
  (id, lane_id, y_center, band_height, reference_bp, evidence_label)
values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 70, 8, 1000, 'ladder reference: 1000 bp'),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 115, 8, 700, 'ladder reference: 700 bp'),
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 140, 8, 600, 'ladder reference: 600 bp'),
  ('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', 180, 8, 500, 'ladder reference: 500 bp'),
  ('20000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001', 225, 8, 400, 'ladder reference: 400 bp'),
  ('20000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000001', 280, 8, 300, 'ladder reference: 300 bp'),
  ('20000000-0000-4000-8000-000000000007', '10000000-0000-4000-8000-000000000002', 180, 8, null, 'positive control band'),
  ('20000000-0000-4000-8000-000000000008', '10000000-0000-4000-8000-000000000003', 178, 6, null, 'faint negative-control band: seeded review flag; review control before interpreting samples'),
  ('20000000-0000-4000-8000-000000000009', '10000000-0000-4000-8000-000000000004', 175.655, 8, null, 'sample a band'),
  ('20000000-0000-4000-8000-000000000010', '10000000-0000-4000-8000-000000000005', 225, 8, null, 'sample b band')
on conflict do nothing;
