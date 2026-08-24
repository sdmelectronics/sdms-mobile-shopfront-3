import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useSimpleAdminAuth } from '@/hooks/useSimpleAdminAuth';
import {
  InventoryRow, MANUAL_STOCK_REASONS, StockReason,
  useAdjustStock, useInventory, useSetReorderLevel, useStockMovements,
} from '@/hooks/useInventory';
import { formatUGX } from '@/lib/money';
import { AlertTriangle, History, RefreshCw, Search, TrendingDown } from 'lucide-react';

const REASON_LABELS: Record<StockReason, string> = {
  opening_balance: 'Opening balance',
  sale: 'Sale',
  return: 'Return',
  restock: 'Restock',
  correction: 'Correction',
  damage: 'Damage/loss',
};

const AdjustDialog = ({
  product, open, onClose,
}: { product: InventoryRow | null; open: boolean; onClose: () => void }) => {
  const { toast } = useToast();
  const { admin } = useSimpleAdminAuth();
  const adjust = useAdjustStock();

  const [reason, setReason] = useState<StockReason>('restock');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  if (!product) return null;

  // Restocks and returns add units; corrections can go either way, so the
  // admin types a signed number there rather than us guessing.
  const signedDelta = () => {
    const value = parseInt(amount, 10);
    if (Number.isNaN(value)) return NaN;
    if (reason === 'restock' || reason === 'return') return Math.abs(value);
    if (reason === 'damage') return -Math.abs(value);
    return value; // correction: sign as typed
  };

  const delta = signedDelta();
  const resulting = product.stock_quantity + (Number.isNaN(delta) ? 0 : delta);

  const submit = () => {
    if (Number.isNaN(delta) || delta === 0) {
      toast({ title: 'Enter a number of units', variant: 'destructive' });
      return;
    }

    adjust.mutate(
      { productId: product.id, delta, reason, note, actorEmail: admin?.username ?? null },
      {
        onSuccess: () => {
          toast({
            title: 'Stock updated',
            description: `${product.name}: ${delta > 0 ? '+' : ''}${delta} → ${resulting} in stock`,
          });
          setAmount(''); setNote('');
          onClose();
        },
        onError: (error: any) =>
          toast({ title: 'Could not adjust stock', description: error?.message, variant: 'destructive' }),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust stock</DialogTitle>
          <DialogDescription>
            {product.name} — currently {product.stock_quantity} in stock
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Reason</label>
            <Select value={reason} onValueChange={(v) => setReason(v as StockReason)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {MANUAL_STOCK_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-warm-faint">
              {MANUAL_STOCK_REASONS.find((r) => r.value === reason)?.help}
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Units {reason === 'correction' && <span className="text-warm-faint">(use a minus sign to reduce)</span>}
            </label>
            <Input
              type="number"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={reason === 'correction' ? 'e.g. -3' : 'e.g. 10'}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Note <span className="text-warm-faint">(optional)</span></label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Supplier, reference, what happened…" />
          </div>

          {!Number.isNaN(delta) && delta !== 0 && (
            <div className={`text-sm rounded-lg p-3 ${resulting < 0 ? 'bg-red-50 text-red-800' : 'bg-warm-accentSoft text-warm-ink'}`}>
              New stock level: <strong>{resulting}</strong>
              {resulting < 0 && ' — this would leave stock negative.'}
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={submit} disabled={adjust.isPending} className="bg-warm-accent hover:bg-warm-accentPress text-white">
              {adjust.isPending ? 'Saving…' : 'Record adjustment'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const MovementsDialog = ({
  product, open, onClose,
}: { product: InventoryRow | null; open: boolean; onClose: () => void }) => {
  const { data: movements = [], isLoading } = useStockMovements(product?.id);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Stock history</DialogTitle>
          <DialogDescription>{product?.name}</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center text-warm-muted">Loading…</div>
        ) : movements.length === 0 ? (
          <div className="py-8 text-center text-warm-muted">No movements recorded yet.</div>
        ) : (
          <div className="divide-y divide-warm-line">
            {movements.map((m) => (
              <div key={m.id} className="py-3 flex items-start gap-3 text-sm">
                <span className={`font-bold w-12 flex-shrink-0 ${m.delta > 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {m.delta > 0 ? '+' : ''}{m.delta}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-warm-ink">{REASON_LABELS[m.reason] ?? m.reason}</div>
                  {m.note && <div className="text-warm-muted truncate">{m.note}</div>}
                  <div className="text-xs text-warm-faint">
                    {new Date(m.created_at).toLocaleString('en-UG')}
                    {m.actor_email && ` · ${m.actor_email}`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export const InventoryPanel = () => {
  const inventory = useInventory();
  const setReorder = useSetReorderLevel();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [view, setView] = useState<'all' | 'attention'>('attention');
  const [adjusting, setAdjusting] = useState<InventoryRow | null>(null);
  const [viewingHistory, setViewingHistory] = useState<InventoryRow | null>(null);

  const attention = useMemo(
    () => [...inventory.negative, ...inventory.outOfStock, ...inventory.lowStock],
    [inventory.negative, inventory.outOfStock, inventory.lowStock],
  );

  const rows = useMemo(() => {
    const base = view === 'attention' ? attention : inventory.items;
    const q = search.trim().toLowerCase();
    if (!q) return base;
    return base.filter(
      (i) => i.name.toLowerCase().includes(q) || (i.sku ?? '').toLowerCase().includes(q),
    );
  }, [view, attention, inventory.items, search]);

  if (inventory.loading) {
    return <div className="space-y-3">{[...Array(5)].map((_, i) => (
      <div key={i} className="h-16 bg-warm-line/40 rounded-xl animate-pulse" />
    ))}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4">
          <div className="text-2xl font-bold text-warm-ink">{formatUGX(inventory.stockValue)}</div>
          <div className="text-xs text-warm-muted">Stock value at cost</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-2xl font-bold text-amber-700">{inventory.lowStock.length}</div>
          <div className="text-xs text-warm-muted">Low stock</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-2xl font-bold text-red-700">{inventory.outOfStock.length}</div>
          <div className="text-xs text-warm-muted">Out of stock</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-2xl font-bold text-warm-ink">{inventory.missingCost.length}</div>
          <div className="text-xs text-warm-muted">No cost price</div>
        </CardContent></Card>
      </div>

      {inventory.negative.length > 0 && (
        <Card className="border-red-300 bg-red-50">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <div className="font-semibold text-red-800">
                {inventory.negative.length} product{inventory.negative.length === 1 ? ' has' : 's have'} negative stock
              </div>
              <p className="text-red-700">
                More was sold than the system knew about. Count the shelf and record a
                Correction so the ledger matches reality.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {inventory.missingCost.length > 0 && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="p-4 flex items-start gap-3">
            <TrendingDown className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <div className="font-semibold text-amber-800">
                {inventory.missingCost.length} active product{inventory.missingCost.length === 1 ? '' : 's'} have no cost price
              </div>
              <p className="text-amber-700">
                Profit can't be calculated for these. Add a cost price when editing the product.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-2 items-center">
        <button
          onClick={() => setView('attention')}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
            view === 'attention' ? 'bg-warm-accent text-white border-warm-accent'
                                 : 'bg-white text-warm-muted border-warm-line'}`}
        >
          Needs attention {attention.length > 0 && <span className="ml-1 opacity-70">{attention.length}</span>}
        </button>
        <button
          onClick={() => setView('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
            view === 'all' ? 'bg-warm-accent text-white border-warm-accent'
                           : 'bg-white text-warm-muted border-warm-line'}`}
        >
          All products {inventory.items.length}
        </button>
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-warm-faint" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or SKU"
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="sm" onClick={() => inventory.refetch()}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {rows.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-warm-muted">
          {view === 'attention' ? 'Nothing needs attention — stock levels are healthy.' : 'No products match.'}
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {rows.map((item) => {
            const negative = item.stock_quantity < 0;
            const out = item.stock_quantity === 0;
            const low = item.stock_quantity > 0 && item.stock_quantity <= item.reorder_level;

            return (
              <Card key={item.id}>
                <CardContent className="p-3 flex flex-wrap items-center gap-3">
                  <div className="flex-1 min-w-[160px]">
                    <div className="font-medium text-warm-ink truncate">{item.name}</div>
                    <div className="text-xs text-warm-faint">
                      {item.sku ?? 'no SKU'}
                      {item.categories?.name && ` · ${item.categories.name}`}
                      {item.cost_price !== null
                        ? ` · cost ${formatUGX(item.cost_price)}`
                        : ' · no cost price'}
                    </div>
                  </div>

                  <div className="text-center w-20">
                    <div className={`text-lg font-bold ${
                      negative ? 'text-red-700' : out ? 'text-red-600' : low ? 'text-amber-700' : 'text-warm-ink'
                    }`}>
                      {item.stock_quantity}
                    </div>
                    <div className="text-[10px] text-warm-faint">in stock</div>
                  </div>

                  <div className="w-24">
                    {negative ? <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">negative</Badge>
                      : out ? <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">out</Badge>
                      : low ? <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200">low</Badge>
                      : <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">ok</Badge>}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-warm-faint">alert at</span>
                    <Input
                      type="number"
                      defaultValue={item.reorder_level}
                      onBlur={(e) => {
                        const level = parseInt(e.target.value, 10);
                        if (Number.isNaN(level) || level === item.reorder_level) return;
                        setReorder.mutate({ productId: item.id, level }, {
                          onSuccess: () => toast({ title: `Alert level for ${item.name} set to ${level}` }),
                        });
                      }}
                      className="w-16 h-8 text-center"
                    />
                  </div>

                  <div className="flex gap-1.5 ml-auto">
                    <Button size="sm" variant="outline" onClick={() => setViewingHistory(item)}>
                      <History className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setAdjusting(item)}
                      className="bg-warm-accent hover:bg-warm-accentPress text-white"
                    >
                      Adjust
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AdjustDialog product={adjusting} open={!!adjusting} onClose={() => setAdjusting(null)} />
      <MovementsDialog product={viewingHistory} open={!!viewingHistory} onClose={() => setViewingHistory(null)} />
    </div>
  );
};
