-- Give every product an opening_balance movement equal to the stock it already
-- shows, so the ledger fully explains the cached total from day one.
--
-- The apply trigger is suspended for this insert: these rows describe stock
-- that is already counted in products.stock_quantity, so letting the trigger
-- add them again would double every figure.
alter table public.stock_movements disable trigger stock_movements_apply;

insert into public.stock_movements (product_id, delta, reason, note)
select p.id, p.stock_quantity, 'opening_balance',
       'Opening balance recorded when stock tracking began'
  from public.products p
 where coalesce(p.stock_quantity, 0) <> 0
   and not exists (
     select 1 from public.stock_movements m
      where m.product_id = p.id and m.reason = 'opening_balance'
   );

alter table public.stock_movements enable trigger stock_movements_apply;
