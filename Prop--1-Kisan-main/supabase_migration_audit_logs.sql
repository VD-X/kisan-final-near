create table if not exists audit_logs (
  "id" uuid primary key default gen_random_uuid(),
  "actorId" text,
  "actorRole" text,
  "action" text not null,
  "entityType" text,
  "entityId" text,
  "metadata" jsonb,
  "createdAt" timestamp with time zone default timezone('utc'::text, now())
);

create index if not exists audit_logs_created_at on audit_logs("createdAt" desc);
create index if not exists audit_logs_entity on audit_logs("entityType","entityId");
create index if not exists audit_logs_actor on audit_logs("actorId");

