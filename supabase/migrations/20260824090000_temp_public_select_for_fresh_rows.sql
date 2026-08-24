-- TEMPORARY - remove once feat/admin-orders-inventory is deployed.
--
-- 20260823194306 removed the public SELECT policies on orders and customers.
-- That is correct for the reworked checkout, which inserts without reading
-- rows back, but the checkout deployed at the time still did
-- .insert().select() - i.e. INSERT ... RETURNING - which requires a SELECT
-- policy. Applying the migration ahead of the deploy stopped customers being
-- able to order at all.
--
-- Rather than restoring blanket public read, these policies are scoped to rows
-- created in the last few seconds. A RETURNING clause always qualifies, since
-- it reads the row it just wrote; reading anybody else's data does not. That
-- works with both the deployed and the reworked checkout, so it is safe to
-- leave in place until the deploy lands.
--
-- AFTER DEPLOYING: re-run 20260823194306_secure_orders_and_customers_rls.sql,
-- which drops these. The new checkout needs no SELECT permission at all.
--
-- Note UPDATE on orders is NOT restored here. Nothing in the storefront needs
-- it, and it is the permission that would let anyone move stock by flipping an
-- order to 'delivered'.

drop policy if exists "Allow public select orders"      on public.orders;
drop policy if exists "Allow public to SELECT customers" on public.customers;

create policy "Temp: read only just-created orders" on public.orders
  for select
  using (created_at > now() - interval '5 seconds');

create policy "Temp: read only just-created customers" on public.customers
  for select
  using (created_at > now() - interval '5 seconds');
