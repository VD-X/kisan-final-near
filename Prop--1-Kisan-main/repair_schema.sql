-- 1. Create missing 'transport_requests' table
create table if not exists transport_requests (
  "id" text primary key,
  "orderId" text references orders("id"),
  "buyerId" text references users("id"),
  "farmerId" text references users("id"),
  "pickupLocation" text,
  "dropLocation" text,
  "weightKg" numeric,
  "vehicleType" text,
  "mode" text,
  "status" text,
  "estimatedFare" numeric,
  "finalFare" numeric,
  "transporterId" text references users("id"),
  "deliveryOtp" text,
  "createdAt" timestamp with time zone default timezone('utc'::text, now())
);

-- 2. Create missing 'transport_bids' table
create table if not exists transport_bids (
  "id" text primary key,
  "requestId" text references transport_requests("id"),
  "transporterId" text references users("id"),
  "amount" numeric,
  "message" text,
  "status" text default 'pending',
  "createdAt" timestamp with time zone default timezone('utc'::text, now())
);

-- 3. Fix missing 'createdAt' column in 'payouts' table
-- This handles the case where the table exists but the column does not
alter table payouts add column if not exists "createdAt" timestamp with time zone default timezone('utc'::text, now());

-- 4. Enable Row Level Security (RLS) and Public Access Policies
-- Transport Requests
alter table transport_requests enable row level security;
drop policy if exists "Public transport requests access" on transport_requests;
create policy "Public transport requests access" on transport_requests for all using (true);

-- Transport Bids
alter table transport_bids enable row level security;
drop policy if exists "Public transport bids access" on transport_bids;
create policy "Public transport bids access" on transport_bids for all using (true);

-- Payouts
alter table payouts enable row level security;
drop policy if exists "Public payouts access" on payouts;
create policy "Public payouts access" on payouts for all using (true);

-- 5. Force Schema Cache Reload
NOTIFY pgrst, 'reload schema';
