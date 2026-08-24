import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

/** The lifecycle, in the order it actually happens. */
export const ORDER_STATUSES: OrderStatus[] = [
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
];

export interface OrderItemRow {
  id: string;
  product_id: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  unit_cost: number | null;
  products?: { name: string; sku: string | null; images: string[] | null } | null;
}

export interface OrderCustomer {
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  district: string | null;
}

export interface OrderRow {
  id: string;
  order_number: string;
  status: OrderStatus;
  payment_method: string | null;
  subtotal: number;
  shipping_fee: number | null;
  tax_amount: number | null;
  total: number;
  notes: string | null;
  stock_committed: boolean;
  delivered_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  customers?: OrderCustomer | null;
  order_items?: OrderItemRow[];
}

export const ORDERS_QUERY_KEY = ['admin', 'orders'] as const;

export const customerName = (customer?: OrderCustomer | null): string => {
  const name = [customer?.first_name, customer?.last_name].filter(Boolean).join(' ').trim();
  return name || 'Walk-in customer';
};

/** Profit for one order, ignoring lines whose cost was never recorded. */
export const orderProfit = (order: OrderRow): { profit: number; complete: boolean } => {
  const items = order.order_items ?? [];
  let profit = 0;
  let complete = items.length > 0;

  for (const item of items) {
    if (item.unit_cost === null || item.unit_cost === undefined) {
      complete = false;
      continue;
    }
    profit += (Number(item.unit_price) - Number(item.unit_cost)) * item.quantity;
  }

  return { profit, complete };
};

const fetchOrders = async (): Promise<OrderRow[]> => {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      id, order_number, status, payment_method, subtotal, shipping_fee,
      tax_amount, total, notes, stock_committed, delivered_at, cancelled_at, created_at,
      customers ( first_name, last_name, phone, email, address, city, district ),
      order_items (
        id, product_id, quantity, unit_price, total_price, unit_cost,
        products ( name, sku, images )
      )
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as OrderRow[];
};

export const useOrders = () => {
  const query = useQuery({
    queryKey: ORDERS_QUERY_KEY,
    queryFn: fetchOrders,
    // Orders are the one thing worth seeing fresh — acting on a stale queue is
    // how two people end up fulfilling the same order.
    staleTime: 30 * 1000,
  });

  return {
    orders: query.data ?? [],
    loading: query.isLoading,
    isError: query.isError,
    error: query.isError ? (query.error as Error)?.message ?? 'Failed to load orders' : null,
    refetch: query.refetch,
  };
};

/**
 * Moves an order through its lifecycle.
 *
 * Stock is NOT touched here. A database trigger writes the stock movements
 * when an order reaches `delivered`, and reverses them if it is later
 * cancelled — so stock stays correct even when an order is changed from the
 * Supabase dashboard, a script, or anywhere that isn't this screen.
 */
export const useUpdateOrderStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: OrderStatus }) => {
      const { error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId);

      if (error) throw error;
      return { orderId, status };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY });
      // Delivering an order moves stock, so anything showing stock is now stale.
      queryClient.invalidateQueries({ queryKey: ['admin', 'inventory'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    },
  });
};
