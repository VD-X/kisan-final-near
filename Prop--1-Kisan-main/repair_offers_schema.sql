-- Fix missing columns in 'offers' table for negotiation
alter table offers add column if not exists "counterPrice" numeric;
alter table offers add column if not exists "counterQuantity" numeric;
alter table offers add column if not exists "lastActionBy" text;
alter table offers add column if not exists "history" jsonb;

-- Force Schema Cache Reload
NOTIFY pgrst, 'reload schema';
