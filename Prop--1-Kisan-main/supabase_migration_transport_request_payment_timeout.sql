-- Adds timestamps to support payment timeouts for transport requests
alter table if exists transport_requests
  add column if not exists "assignedAt" timestamp with time zone,
  add column if not exists "transportPaymentHeldAt" timestamp with time zone;

