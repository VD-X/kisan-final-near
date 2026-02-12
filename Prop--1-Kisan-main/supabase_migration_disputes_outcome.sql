alter table if exists disputes
  add column if not exists "outcome" text,
  add column if not exists "adminNotes" text,
  add column if not exists "resolvedAt" timestamp with time zone,
  add column if not exists "resolvedBy" text;

