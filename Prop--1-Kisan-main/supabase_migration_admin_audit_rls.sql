create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users u
    where u.id = auth.uid()::text
      and u.role = 'admin'
      and (u.status is null or u.status = 'active')
  );
$$;

alter table if exists audit_logs enable row level security;

drop policy if exists "Admin read audit logs" on audit_logs;
drop policy if exists "Admin insert audit logs" on audit_logs;

create policy "Admin read audit logs"
on audit_logs
for select
using (public.is_admin());

create policy "Admin insert audit logs"
on audit_logs
for insert
with check (public.is_admin());

