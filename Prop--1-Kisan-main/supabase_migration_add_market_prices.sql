create table if not exists market_prices (
  "id" uuid primary key default gen_random_uuid(),
  "commodity" text not null,
  "variety" text,
  "grade" text,
  "state" text,
  "district" text,
  "market" text,
  "arrivalDate" date,
  "minPrice" numeric,
  "maxPrice" numeric,
  "modalPrice" numeric,
  "unit" text,
  "source" text,
  "createdAt" timestamp with time zone default timezone('utc'::text, now())
);

create unique index if not exists market_prices_unique on market_prices("commodity","variety","grade","state","district","market","arrivalDate");
create index if not exists market_prices_lookup on market_prices("commodity","state","district","market","arrivalDate");

