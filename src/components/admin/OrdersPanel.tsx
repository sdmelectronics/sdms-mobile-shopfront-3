import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  ORDER_STATUSES, OrderRow, OrderStatus, customerName, orderProfit,
  useOrders, useUpdateOrderStatus,
} from '@/hooks/useOrders';
import { formatUGX } from '@/lib/money';
import {
  ChevronDown, ChevronRight, Package, Phone, MapPin, RefreshCw, AlertTriangle,
} from 'lucide-react';

const STATUS_STYLES: Record<OrderStatus, string> = {
  pending:    'bg-amber-100 text-amber-800 border-amber-200',
  confirmed:  'bg-blue-100 text-blue-800 border-blue-200',
  processing: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  shipped:    'bg-purple-100 text-purple-800 border-purple-200',
  delivered:  'bg-green-100 text-green-800 border-green-200',
  cancelled:  'bg-red-100 text-red-800 border-red-200',
};

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' });

const OrderCard = ({ order }: { order: OrderRow }) => {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const updateStatus = useUpdateOrderStatus();

  const items = order.order_items ?? [];
  const { profit, complete } = orderProfit(order);
  const phone = order.customers?.phone?.replace(/\D/g, '');

  const handleStatusChange = (status: OrderStatus) => {
    updateStatus.mutate(
      { orderId: order.id, status },
      {
        onSuccess: () => {
          toast({
            title: `Order ${order.order_number} → ${status}`,
            description:
              status === 'delivered'
                ? 'Stock has been deducted for the items on this order.'
                : status === 'cancelled' && order.stock_committed
                ? 'Stock has been returned to inventory.'
                : undefined,
          });
        },
        onError: (error: any) =>
          toast({
            title: 'Could not update the order',
            description: error?.message ?? 'Please try again.',
            variant: 'destructive',
          }),
      },
    );
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <button
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-start gap-3 p-4 text-left hover:bg-warm-accentSoft/40 transition-colors"
          aria-expanded={open}
        >
          {open ? <ChevronDown className="w-4 h-4 mt-1 flex-shrink-0" />
                : <ChevronRight className="w-4 h-4 mt-1 flex-shrink-0" />}

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-warm-ink">{order.order_number}</span>
              <Badge variant="outline" className={STATUS_STYLES[order.status]}>{order.status}</Badge>
              {order.stock_committed && (
                <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-200">
                  stock deducted
                </Badge>
              )}
            </div>
            <div className="text-sm text-warm-muted mt-1 truncate">
              {customerName(order.customers)} · {formatDate(order.created_at)} ·{' '}
              {items.length} item{items.length === 1 ? '' : 's'}
            </div>
          </div>

          <div className="text-right flex-shrink-0">
            <div className="font-bold text-warm-ink">{formatUGX(order.total)}</div>
            {complete && (
              <div className="text-xs text-green-700">profit {formatUGX(profit)}</div>
            )}
          </div>
        </button>

        {open && (
          <div className="border-t border-warm-line p-4 space-y-4 bg-warm-bg/40">
            {/* Customer */}
            <div className="text-sm space-y-1">
              <div className="font-semibold text-warm-ink">{customerName(order.customers)}</div>
              {order.customers?.phone && (
                <a href={`tel:${order.customers.phone}`} className="flex items-center gap-2 text-warm-accent">
                  <Phone className="w-3.5 h-3.5" /> {order.customers.phone}
                </a>
              )}
              {(order.customers?.address || order.customers?.city) && (
                <div className="flex items-start gap-2 text-warm-muted">
                  <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <span>
                    {[order.customers?.address, order.customers?.city, order.customers?.district]
                      .filter(Boolean).join(', ')}
                  </span>
                </div>
              )}
              {order.notes && (
                <div className="text-warm-muted italic pt-1">“{order.notes}”</div>
              )}
            </div>

            {/* Items */}
            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-3 text-sm">
                  <Package className="w-4 h-4 text-warm-faint flex-shrink-0" />
                  <span className="flex-1 min-w-0 truncate">
                    {item.products?.name ?? 'Product removed'}
                    {item.products?.sku && (
                      <span className="text-warm-faint"> · {item.products.sku}</span>
                    )}
                  </span>
                  <span className="text-warm-muted whitespace-nowrap">×{item.quantity}</span>
                  <span className="font-medium whitespace-nowrap w-28 text-right">
                    {formatUGX(item.total_price)}
                  </span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="text-sm space-y-1 border-t border-warm-line pt-3">
              <div className="flex justify-between text-warm-muted">
                <span>Subtotal</span><span>{formatUGX(order.subtotal)}</span>
              </div>
              {Number(order.shipping_fee) > 0 && (
                <div className="flex justify-between text-warm-muted">
                  <span>Delivery</span><span>{formatUGX(order.shipping_fee)}</span>
                </div>
              )}
              {Number(order.tax_amount) > 0 && (
                <div className="flex justify-between text-warm-muted">
                  <span>Tax</span><span>{formatUGX(order.tax_amount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-warm-ink">
                <span>Total</span><span>{formatUGX(order.total)}</span>
              </div>
              {complete ? (
                <div className="flex justify-between text-green-700 font-medium">
                  <span>Profit</span><span>{formatUGX(profit)}</span>
                </div>
              ) : (
                <div className="flex items-start gap-2 text-amber-700 text-xs pt-1">
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <span>Profit unavailable — some items have no cost price recorded.</span>
                </div>
              )}
            </div>

            {/* Status control */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <span className="text-sm font-medium text-warm-ink">Status</span>
              <Select
                value={order.status}
                onValueChange={(v) => handleStatusChange(v as OrderStatus)}
                disabled={updateStatus.isPending}
              >
                <SelectTrigger className="w-[170px] bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ORDER_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {order.status !== 'delivered' && (
                <Button
                  size="sm"
                  onClick={() => handleStatusChange('delivered')}
                  disabled={updateStatus.isPending}
                  className="bg-warm-ok hover:opacity-90 text-white"
                >
                  Mark delivered
                </Button>
              )}
            </div>
            <p className="text-xs text-warm-faint">
              Marking an order delivered deducts its items from stock. Cancelling a
              delivered order puts them back.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const OrdersPanel = () => {
  const { orders, loading, isError, refetch } = useOrders();
  const [filter, setFilter] = useState<OrderStatus | 'all' | 'open'>('open');

  const counts = useMemo(() => {
    const byStatus = Object.fromEntries(ORDER_STATUSES.map((s) => [s, 0])) as Record<OrderStatus, number>;
    orders.forEach((o) => { byStatus[o.status] = (byStatus[o.status] ?? 0) + 1; });
    return byStatus;
  }, [orders]);

  // "Open" is what actually needs attention — anything not finished.
  const openCount = orders.filter(
    (o) => o.status !== 'delivered' && o.status !== 'cancelled',
  ).length;

  const visible = useMemo(() => {
    if (filter === 'all') return orders;
    if (filter === 'open') {
      return orders.filter((o) => o.status !== 'delivered' && o.status !== 'cancelled');
    }
    return orders.filter((o) => o.status === filter);
  }, [orders, filter]);

  const deliveredRevenue = orders
    .filter((o) => o.status === 'delivered')
    .reduce((sum, o) => sum + Number(o.total), 0);

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-20 bg-warm-line/40 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <Card><CardContent className="p-8 text-center">
        <p className="text-warm-muted mb-4">Couldn't load orders.</p>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4 mr-2" /> Try again
        </Button>
      </CardContent></Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4">
          <div className="text-2xl font-bold text-warm-ink">{openCount}</div>
          <div className="text-xs text-warm-muted">Needs attention</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-2xl font-bold text-warm-ink">{orders.length}</div>
          <div className="text-xs text-warm-muted">Orders all time</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-2xl font-bold text-green-700">{counts.delivered ?? 0}</div>
          <div className="text-xs text-warm-muted">Delivered</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-2xl font-bold text-warm-ink">{formatUGX(deliveredRevenue)}</div>
          <div className="text-xs text-warm-muted">Delivered revenue</div>
        </CardContent></Card>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(['open', 'all', ...ORDER_STATUSES] as const).map((value) => (
          <button
            key={value}
            onClick={() => setFilter(value as any)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              filter === value
                ? 'bg-warm-accent text-white border-warm-accent'
                : 'bg-white text-warm-muted border-warm-line hover:border-warm-accent'
            }`}
          >
            {value}
            {value !== 'all' && value !== 'open' && counts[value as OrderStatus] > 0 && (
              <span className="ml-1 opacity-70">{counts[value as OrderStatus]}</span>
            )}
            {value === 'open' && openCount > 0 && <span className="ml-1 opacity-70">{openCount}</span>}
          </button>
        ))}
        <Button variant="outline" size="sm" onClick={() => refetch()} className="ml-auto">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {visible.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-warm-muted">
          {filter === 'open' ? 'Nothing waiting — every order is finished.' : 'No orders here.'}
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {visible.map((order) => <OrderCard key={order.id} order={order} />)}
        </div>
      )}
    </div>
  );
};
