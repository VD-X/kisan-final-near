create table if not exists ratings (
  "id" text primary key,
  "fromUserId" text references users("id") on delete cascade,
  "toUserId" text references users("id") on delete cascade,
  "entityType" text not null,
  "entityId" text not null,
  "stars" int not null check ("stars" >= 1 and "stars" <= 5),
  "comment" text,
  "createdAt" timestamp with time zone default timezone('utc'::text, now())
);

create unique index if not exists ratings_unique on ratings("fromUserId","toUserId","entityType","entityId");
create index if not exists ratings_to_user on ratings("toUserId");
create index if not exists ratings_entity on ratings("entityType","entityId");

