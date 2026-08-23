-- Close public read/write on order and customer data.
--
-- The anon key ships inside the JavaScript bundle, so "anon" means anyone on
-- the internet. The previous policies allowed reading every order and every
-- customer's name, phone and address, and allowed anyone to UPDATE any order -
-- which now also moves stock, since order status drives the ledger.
--
-- The storefront only ever needs to INSERT, so that is all it keeps. Checkout
-- was changed to generate its own ids instead of reading rows back, which is
-- what makes removing the public SELECT possible.

drop policy if exists "Allow public select orders" on public.orders;
drop policy if exists "Allow order updates"        on public.orders;

drop policy if exists "Admins manage orders" on public.orders;
create policy "Admins manage orders" on public.orders
  for all to authenticated
  using      (exists (select 1 from public.admin_users a where a.id = auth.uid() and a.is_active))
  with check (exists (select 1 from public.admin_users a where a.id = auth.uid() and a.is_active));

drop policy if exists "Allow public to SELECT customers" on public.customers;

drop policy if exists "Admins manage customers" on public.customers;
create policy "Admins manage customers" on public.customers
  for all to authenticated
  using      (exists (select 1 from public.admin_users a where a.id = auth.uid() and a.is_active))
  with check (exists (select 1 from public.admin_users a where a.id = auth.uid() and a.is_active));

drop policy if exists "Admins manage order items" on public.order_items;
create policy "Admins manage order items" on public.order_items
  for all to authenticated
  using      (exists (select 1 from public.admin_users a where a.id = auth.uid() and a.is_active))
  with check (exists (select 1 from public.admin_users a where a.id = auth.uid() and a.is_active));
