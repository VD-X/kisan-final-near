alter table if exists transport_requests
  add column if not exists "pickupLat" numeric,
  add column if not exists "pickupLng" numeric,
  add column if not exists "dropLat" numeric,
  add column if not exists "dropLng" numeric;

