-- Keeps the cached products.stock_quantity in step with the ledger.
create or replace function public.apply_stock_movement()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  update public.products
     set stock_quantity = coalesce(stock_quantity, 0) + new.delta, updated_at = now()
   where id = new.product_id;
  return new;
end; $$;

drop trigger if exists stock_movements_apply on public.stock_movements;
create trigger stock_movements_apply after insert on public.stock_movements
  for each row execute function public.apply_stock_movement();

-- Repair tool: the ledger is authoritative, this rebuilds the cache from it.
create or replace function public.recalculate_stock(p_product_id uuid default null)
returns integer language plpgsql security definer set search_path = public, pg_temp as $$
declare affected integer;
begin
  update public.products p
     set stock_quantity = coalesce((select sum(m.delta) from public.stock_movements m where m.product_id = p.id), 0)
   where (p_product_id is null or p.id = p_product_id);
  get diagnostics affected = row_count;
  return affected;
end; $$;

create or replace function public.snapshot_order_item_cost()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.unit_cost is null then
    select cost_price into new.unit_cost from public.products where id = new.product_id;
  end if;
  return new;
end; $$;

drop trigger if exists order_items_snapshot_cost on public.order_items;
create trigger order_items_snapshot_cost before insert on public.order_items
  for each row execute function public.snapshot_order_item_cost();

-- Drives stock from order status.
--
-- Deducting on 'delivered' rather than at checkout is deliberate: orders
-- arrive via WhatsApp and are negotiated afterwards, so an undelivered order
-- has not left the shelf. stock_committed makes this idempotent, so an order
-- can never double-deduct however often its status is toggled.
create or replace function public.handle_order_stock()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.status = 'delivered' and not coalesce(old.stock_committed, false) then
    insert into public.stock_movements (product_id, delta, reason, order_id, note)
    select oi.product_id, -oi.quantity, 'sale', new.id, 'Order ' || new.order_number
      from public.order_items oi
     where oi.order_id = new.id and oi.product_id is not null;
    new.stock_committed := true;
    new.delivered_at    := coalesce(new.delivered_at, now());
  elsif new.status = 'cancelled' and coalesce(old.stock_committed, false) then
    insert into public.stock_movements (product_id, delta, reason, order_id, note)
    select oi.product_id, oi.quantity, 'return', new.id, 'Cancelled order ' || new.order_number
      from public.order_items oi
     where oi.order_id = new.id and oi.product_id is not null;
    new.stock_committed := false;
    new.cancelled_at    := coalesce(new.cancelled_at, now());
  end if;
  return new;
end; $$;

drop trigger if exists orders_handle_stock on public.orders;
create trigger orders_handle_stock before update of status on public.orders
  for each row when (old.status is distinct from new.status)
  execute function public.handle_order_stock();
