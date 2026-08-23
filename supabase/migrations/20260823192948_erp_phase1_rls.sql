alter table public.stock_movements enable row level security;
alter table public.audit_log      enable row level security;

drop policy if exists "Admins read stock movements" on public.stock_movements;
create policy "Admins read stock movements" on public.stock_movements
  for select to authenticated
  using (exists (select 1 from public.admin_users a where a.id = auth.uid() and a.is_active));

drop policy if exists "Admins insert stock movements" on public.stock_movements;
create policy "Admins insert stock movements" on public.stock_movements
  for insert to authenticated
  with check (exists (select 1 from public.admin_users a where a.id = auth.uid() and a.is_active));

-- Deliberately no update/delete policy: the ledger is append-only. Correct a
-- mistake by inserting a compensating movement, which leaves both the error
-- and its correction visible.
revoke update, delete on public.stock_movements from authenticated, anon;

drop policy if exists "Admins read audit log" on public.audit_log;
create policy "Admins read audit log" on public.audit_log
  for select to authenticated
  using (exists (select 1 from public.admin_users a where a.id = auth.uid() and a.is_active));

drop policy if exists "Admins insert audit log" on public.audit_log;
create policy "Admins insert audit log" on public.audit_log
  for insert to authenticated
  with check (exists (select 1 from public.admin_users a where a.id = auth.uid() and a.is_active));

revoke update, delete on public.audit_log from authenticated, anon;

-- Close the admin_users enumeration hole: this policy was USING (true) for
-- every authenticated user, exposing every admin's email and role.
drop policy if exists "Allow authenticated users to read admin_users" on public.admin_users;
