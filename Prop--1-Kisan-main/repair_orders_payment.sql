-- Add payment tracking columns to 'orders' table
alter table orders add column if not exists "paymentStatus" text default 'pending'; -- 'pending', 'review', 'paid'
alter table orders add column if not exists "paymentProof" text;

-- Force Schema Cache Reload
NOTIFY pgrst, 'reload schema';
