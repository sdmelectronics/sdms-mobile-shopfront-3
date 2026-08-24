import { useState, useEffect } from "react";
import { WHATSAPP_URL } from '@/lib/contact';
import { Link } from "react-router-dom";
import { X, Star, Minus, Plus, ShoppingCart, Truck, ShieldCheck, MessageCircle } from "lucide-react";
import { useCart } from "@/hooks/useCart";

const formatUGX = (n: number) => "UGX " + Number(n || 0).toLocaleString("en-US");

const conditionLabel = (condition?: string) => {
  if (!condition) return null;
  if (condition === "like_new") return "LIKE NEW";
  if (condition === "open_box") return "OPEN BOX";
  return condition.toUpperCase();
};

interface PanelProps {
  product: any | null;
  open: boolean;
  onClose: () => void;
}

/**
 * ProductDetailPanel — the Warm Premium right slide-in product detail (.w-panel):
 * overlay + panel with gallery + thumbnails, price/save, stock, trust row,
 * quantity stepper and Add to Cart. Full width on phones, 460px from sm up.
 */
export const ProductDetailPanel = ({ product, open, onClose }: PanelProps) => {
  const { items, addToCart, updateQuantity } = useCart();
  const [qty, setQty] = useState(1);
  const [thumb, setThumb] = useState(0);

  useEffect(() => {
    if (open) {
      setQty(1);
      setThumb(0);
    }
  }, [open, product?.id]);

  // Lock body scroll while the panel is open
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const p = product;
  const images: string[] = p?.images && p.images.length ? p.images : ["/placeholder.svg"];
  const category = p?.categories?.name || p?.category || "";
  const rating = p?.rating;
  const reviews = p?.reviews_count;
  const original = p?.original_price;
  const price = p?.price ?? 0;
  const disc = original && original > price && !p?.is_preorder;
  const pct = disc ? Math.floor(((original - price) / original) * 100) : 0;
  const stock = p?.stock_quantity ?? 0;
  const soldOut = stock === 0 && !p?.is_preorder;
  const cond = conditionLabel(p?.condition);
  const desc = p?.description || p?.short_description || "";

  const stockInfo = (() => {
    if (p?.is_preorder) {
      const date = p?.preorder_availability_date
        ? new Date(p.preorder_availability_date).toLocaleDateString("en-UG", { month: "short", day: "numeric" })
        : null;
      return { label: date ? `Available ${date}` : "Pre-order available", color: "text-warm-accent" };
    }
    if (stock === 0) return { label: "Out of stock", color: "text-warm-accent" };
    if (stock > 8) return { label: "In stock · ready to ship", color: "text-warm-ok" };
    return { label: `Only ${stock} left`, color: "text-[#B7791F]" };
  })();

  const handleAdd = () => {
    if (soldOut || !p) return;
    const existing = items.find((i) => i.id === p.id)?.quantity ?? 0;
    addToCart({ id: p.id, name: p.name, price: p.price, images: p.images || [] });
    if (qty > 1) updateQuantity(p.id, existing + qty);
    onClose();
  };

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-[60] bg-[rgba(33,28,24,0.46)] backdrop-blur-[2px] transition-opacity duration-300 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={p?.name || "Product details"}
        className={`fixed top-0 right-0 bottom-0 z-[61] w-full sm:w-[460px] max-w-full bg-warm-surface shadow-2xl flex flex-col transition-transform duration-[360ms] [transition-timing-function:cubic-bezier(.32,.72,0,1)] ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {p && (
          <>
            {/* Top bar */}
            <div className="flex items-center justify-between px-5 py-[18px] border-b border-warm-line flex-shrink-0">
              <span className="text-xs font-bold uppercase tracking-[0.1em] text-warm-faint truncate">{category}</span>
              <button
                onClick={onClose}
                aria-label="Close"
                className="w-9 h-9 rounded-full flex items-center justify-center text-warm-ink hover:bg-warm-accentSoft hover:text-warm-accent transition flex-shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scroll */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden">
              {/* Media */}
              <div className="relative aspect-[4/3] bg-[#F1ECE5]">
                <img
                  src={images[thumb] || images[0]}
                  alt={p.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/placeholder.svg";
                  }}
                />
                {cond && (
                  <span className="absolute top-4 left-4 text-[11px] font-bold px-2.5 py-1 rounded-full bg-warm-accent text-white">
                    {cond}
                  </span>
                )}
              </div>

              {/* Thumbnails */}
              {images.length > 1 && (
                <div className="flex gap-2.5 px-6 pt-4">
                  {images.slice(0, 4).map((g, i) => (
                    <button
                      key={i}
                      onClick={() => setThumb(i)}
                      aria-label={`Image ${i + 1}`}
                      className={`w-[58px] h-[58px] rounded-xl overflow-hidden border-2 transition-colors ${
                        i === thumb ? "border-warm-accent" : "border-transparent"
                      }`}
                    >
                      <img src={g} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {/* Body */}
              <div className="px-6 pt-[18px] pb-2 flex flex-col gap-3">
                <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-warm-accent">
                  {p.is_preorder ? "Pre-order" : "Featured"}
                </span>
                <h2 className="font-display font-bold text-warm-ink text-2xl leading-tight tracking-tight -mt-1">
                  {p.name}
                </h2>
                {rating ? (
                  <span className="flex items-center gap-1.5 text-[13px] text-warm-muted">
                    <Star className="w-3.5 h-3.5 text-warm-star fill-current" />
                    {Number(rating).toFixed(1)}
                    {reviews ? ` · ${Number(reviews).toLocaleString()} reviews` : ""}
                  </span>
                ) : null}

                <div className="flex items-baseline gap-3 flex-wrap">
                  <span className="font-display font-extrabold text-warm-ink text-[28px] tabular-nums">
                    {formatUGX(price)}
                  </span>
                  {disc && <span className="text-[15px] text-warm-faint line-through">{formatUGX(original)}</span>}
                  {disc && (
                    <span className="text-xs font-bold text-warm-accent bg-warm-accentSoft px-2.5 py-1 rounded-full">
                      Save {pct}%
                    </span>
                  )}
                </div>

                <span className={`flex items-center gap-2 text-[13px] font-semibold ${stockInfo.color}`}>
                  <span className="w-2 h-2 rounded-full bg-current" />
                  {stockInfo.label}
                </span>

                {desc && (
                  <p className="text-sm leading-[1.65] text-warm-muted m-0">
                    {desc} Genuine product with manufacturer warranty and free delivery within Kampala.
                  </p>
                )}

                {/* Trust row */}
                <div className="grid grid-cols-3 gap-2.5 mt-1">
                  <div className="flex flex-col items-center text-center gap-1.5 rounded-xl border border-warm-line px-2 py-3">
                    <Truck className="w-[18px] h-[18px] text-warm-accent" />
                    <span className="text-[11px] font-semibold text-warm-ink leading-tight">Free Kampala<br />delivery</span>
                  </div>
                  <div className="flex flex-col items-center text-center gap-1.5 rounded-xl border border-warm-line px-2 py-3">
                    <ShieldCheck className="w-[18px] h-[18px] text-warm-accent" />
                    <span className="text-[11px] font-semibold text-warm-ink leading-tight">Genuine<br />warranty</span>
                  </div>
                  <a
                    href={WHATSAPP_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center text-center gap-1.5 rounded-xl border border-warm-line px-2 py-3 hover:border-warm-accent/40 transition"
                  >
                    <MessageCircle className="w-[18px] h-[18px] text-[#25D366]" />
                    <span className="text-[11px] font-semibold text-warm-ink leading-tight">Order via<br />WhatsApp</span>
                  </a>
                </div>

                {p.slug && (
                  <Link
                    to={`/products/${p.slug}`}
                    onClick={onClose}
                    className="text-sm font-semibold text-warm-accent hover:text-warm-accentPress mt-1"
                  >
                    View full details & reviews →
                  </Link>
                )}
              </div>
            </div>

            {/* Footer: qty + add to cart */}
            <div className="flex items-center gap-3 px-6 py-4 border-t border-warm-line flex-shrink-0">
              <div className="flex items-center gap-1 border border-warm-line2 rounded-xl p-1">
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  aria-label="Decrease quantity"
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-warm-ink hover:bg-warm-bg"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="min-w-[30px] text-center font-bold text-warm-ink">{qty}</span>
                <button
                  onClick={() => setQty((q) => q + 1)}
                  aria-label="Increase quantity"
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-warm-ink hover:bg-warm-bg"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={handleAdd}
                disabled={soldOut}
                className={`flex-1 inline-flex items-center justify-center gap-2 rounded-xl font-semibold text-[15px] px-6 py-[13px] transition-colors ${
                  soldOut
                    ? "bg-warm-line text-warm-faint cursor-not-allowed"
                    : "bg-warm-accent text-white hover:bg-warm-accentPress"
                }`}
              >
                <ShoppingCart className="w-[17px] h-[17px]" />
                {soldOut ? "Out of Stock" : p.is_preorder ? "Pre-order Now" : "Add to Cart"}
              </button>
            </div>
          </>
        )}
      </aside>
    </>
  );
};

export default ProductDetailPanel;
