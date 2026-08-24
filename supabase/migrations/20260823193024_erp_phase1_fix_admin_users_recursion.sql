-- A policy on admin_users must not query admin_users: Postgres rejects that as
-- infinite recursion, which breaks every admin lookup and therefore login.
--
-- Reading your own row needs no subquery, and the existing
-- "Allow admin read own profile" policy (id = auth.uid()) already covers
-- exactly what the app does. Letting admins see each other will need a
-- SECURITY DEFINER helper rather than a self-referential policy.
drop policy if exists "Admins read admin users" on public.admin_users;
