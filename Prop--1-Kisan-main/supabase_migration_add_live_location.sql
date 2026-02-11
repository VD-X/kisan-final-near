alter table if exists transport_requests
  add column if not exists "transporterLat" numeric,
  add column if not exists "transporterLng" numeric,
  add column if not exists "transporterHeading" numeric,
  add column if not exists "transporterSpeedKmph" numeric,
  add column if not exists "transporterAccuracyM" numeric,
  add column if not exists "transporterLocationUpdatedAt" timestamp with time zone;

