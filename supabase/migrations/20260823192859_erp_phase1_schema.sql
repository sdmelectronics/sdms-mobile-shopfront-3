-- ERP phase 1: costing fields, stock ledger, audit trail.
-- All additive: no existing column is altered or dropped, so the storefront
-- keeps working unchanged while these become the new source of truth.

alter table public.products
  add column if not exists cost_price numeric,
  add column if not exists reorder_level integer not null default 0;

comment on column public.products.cost_price is
  'What the shop paid per unit. Used for margin. Null = unknown, excluded from profit reports.';
comment on column public.products.reorder_level is
  'Low-stock threshold. stock_quantity <= reorder_level flags the product for restocking.';
comment on column public.products.stock_quantity is
  'Cached running total, maintained by trigger from stock_movements. Do not edit directly - insert a stock_movement instead.';

-- Cost is snapshotted at sale time so re-pricing never rewrites past profit.
alter table public.order_items
  add column if not exists unit_cost numeric;

comment on column public.order_items.unit_cost is
  'Copy of products.cost_price at the moment of sale. Immutable history.';

alter table public.orders
  add column if not exists tax_amount numeric not null default 0,
  add column if not exists stock_committed boolean not null default false,
  add column if not exists delivered_at timestamptz,
  add column if not exists cancelled_at timestamptz;

comment on column public.orders.tax_amount is
  'VAT/tax portion of total. Zero when the business is not tax registered.';
comment on column public.orders.stock_committed is
  'True once this order has deducted stock, so it can never double-deduct.';

-- Append-only stock ledger.
create table if not exists public.stock_movements (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products(id) on delete cascade,
  delta       integer not null,
  reason      text not null,
  order_id    uuid references public.orders(id) on delete set null,
  note        text,
  actor_id    uuid,
  actor_email text,
  created_at  timestamptz not null default now(),
  constraint stock_movements_delta_not_zero check (delta <> 0),
  constraint stock_movements_reason_valid check (reason in (
    'opening_balance', 'sale', 'return', 'restock', 'correction', 'damage'
  ))
);

create index if not exists stock_movements_product_idx on public.stock_movements (product_id, created_at desc);
create index if not exists stock_movements_order_idx   on public.stock_movements (order_id);
create index if not exists stock_movements_created_idx on public.stock_movements (created_at desc);

comment on table public.stock_movements is
  'Append-only stock ledger. Never UPDATE or DELETE rows here - correct a mistake by adding a compensating movement.';

create table if not exists public.audit_log (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid,
  actor_email text,
  action      text not null,
  entity_type text not null,
  entity_id   uuid,
  details     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists audit_log_entity_idx  on public.audit_log (entity_type, entity_id, created_at desc);
create index if not exists audit_log_created_idx on public.audit_log (created_at desc);
