import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/** Why stock moved. Mirrors the CHECK constraint on stock_movements.reason. */
export type StockReason =
  | 'opening_balance'
  | 'sale'
  | 'return'
  | 'restock'
  | 'correction'
  | 'damage';

/** The reasons an admin may pick by hand. Sales and returns come from orders. */
export const MANUAL_STOCK_REASONS: { value: StockReason; label: string; help: string }[] = [
  { value: 'restock',    label: 'Restock',    help: 'New stock arrived from a supplier' },
  { value: 'correction', label: 'Correction', help: 'The counted stock differs from the system' },
  { value: 'damage',     label: 'Damage/loss', help: 'Broken, lost or written off' },
  { value: 'return',     label: 'Return',     help: 'A customer brought an item back' },
];

export interface InventoryRow {
  id: string;
  name: string;
  sku: string | null;
  stock_quantity: number;
  reorder_level: number;
  cost_price: number | null;
  price: number;
  is_active: boolean;
  categories?: { name: string } | null;
}

export interface StockMovementRow {
  id: string;
  product_id: string;
  delta: number;
  reason: StockReason;
  note: string | null;
  order_id: string | null;
  actor_email: string | null;
  created_at: string;
  products?: { name: string; sku: string | null } | null;
}

export const INVENTORY_QUERY_KEY = ['admin', 'inventory'] as const;
export const MOVEMENTS_QUERY_KEY = ['admin', 'inventory', 'movements'] as const;

export const useInventory = () => {
  const query = useQuery({
    queryKey: INVENTORY_QUERY_KEY,
    queryFn: async (): Promise<InventoryRow[]> => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, sku, stock_quantity, reorder_level, cost_price, price, is_active, categories(name)')
        .order('name');
      if (error) throw error;
      return (data ?? []) as unknown as InventoryRow[];
    },
    staleTime: 60 * 1000,
  });

  const items = query.data ?? [];

  return {
    items,
    loading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,

    // Negative stock means we sold something the system did not know we had.
    // It is never correct, so it is surfaced separately from "low".
    negative: items.filter((i) => i.stock_quantity < 0),
    outOfStock: items.filter((i) => i.is_active && i.stock_quantity === 0),
    lowStock: items.filter(
      (i) => i.is_active && i.stock_quantity > 0 && i.stock_quantity <= i.reorder_level,
    ),
    missingCost: items.filter((i) => i.is_active && i.cost_price === null),

    stockValue: items.reduce(
      (sum, i) => sum + (i.cost_price ?? 0) * Math.max(i.stock_quantity, 0),
      0,
    ),
  };
};

export const useStockMovements = (productId?: string) =>
  useQuery({
    queryKey: [...MOVEMENTS_QUERY_KEY, productId ?? 'all'],
    queryFn: async (): Promise<StockMovementRow[]> => {
      let request = supabase
        .from('stock_movements')
        .select('id, product_id, delta, reason, note, order_id, actor_email, created_at, products(name, sku)')
        .order('created_at', { ascending: false })
        .limit(200);

      if (productId) request = request.eq('product_id', productId);

      const { data, error } = await request;
      if (error) throw error;
      return (data ?? []) as unknown as StockMovementRow[];
    },
    staleTime: 30 * 1000,
  });

/**
 * Records a stock adjustment.
 *
 * Writes a movement rather than setting a number: the ledger is append-only,
 * so a mistake is corrected by adding an opposing movement, leaving both the
 * error and the correction visible. The cached products.stock_quantity is
 * updated by a database trigger, never from here.
 */
export const useAdjustStock = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      productId: string;
      delta: number;
      reason: StockReason;
      note?: string;
      actorEmail?: string | null;
    }) => {
      if (!Number.isInteger(input.delta) || input.delta === 0) {
        throw new Error('Enter a whole number of units, and not zero.');
      }

      const { error } = await supabase.from('stock_movements').insert({
        product_id: input.productId,
        delta: input.delta,
        reason: input.reason,
        note: input.note?.trim() || null,
        actor_email: input.actorEmail ?? null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVENTORY_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: MOVEMENTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    },
  });
};

/** Sets the low-stock threshold for a product. */
export const useSetReorderLevel = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ productId, level }: { productId: string; level: number }) => {
      const { error } = await supabase
        .from('products')
        .update({ reorder_level: Math.max(0, Math.floor(level)) })
        .eq('id', productId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: INVENTORY_QUERY_KEY }),
  });
};
