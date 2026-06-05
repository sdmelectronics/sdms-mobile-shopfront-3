import { useState, memo } from "react";
import { Link } from "react-router-dom";
import { Star, ShoppingCart, Heart, Check } from "lucide-react";
import { motion } from "framer-motion";
import { useCart } from "@/hooks/useCart";
import { useWishlist } from "@/hooks/useWishlist";
import { useProductDetail } from "@/hooks/useProductDetail";

interface Product {
  view_count: number;
  id: string;
  name: string;
  price: number;
  original_price?: number;
  description: string;
  short_description?: string;
  images: string[];
  stock_quantity: number;
  rating?: number;
  reviews_count?: number;
  slug: string;
  is_preorder: boolean;
  preorder_availability_date?: string;
  condition?: 'new' | 'used' | 'like_new' | 'refurbished' | 'open_box';
  categories?: { name: string; slug: string };
}

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1 },
  }),
};

const conditionLabel = (condition?: string) => {
  if (!condition) return null;
  if (condition === 'like_new') return 'LIKE NEW';
  if (condition === 'open_box') return 'OPEN BOX';
  return condition.toUpperCase();
};

export const ProductCard = memo(
  ({
    product,
    index,
    formatPrice,
    formatViewCount,
    incrementViewCount,
    addToCart,
    toast,
    getDiscountPercentage,
    formatAvailabilityDate,
  }: {
    product: Product;
    index: number;
    formatPrice: (price: number) => string;
    formatViewCount: (count: number) => string;
    incrementViewCount: (productId: string) => void;
    addToCart: (item: {
      id: string;
      name: string;
      price: number;
      images: string[];
    }) => void;
    toast: (options: { title: string; description: string }) => void;
    getDiscountPercentage: (original: number, current: number) => number;
    formatAvailabilityDate: (dateString?: string) => string | null;
  }) => {
    const [isImageLoaded, setIsImageLoaded] = useState(false);
    const productUrl = `/products/${product.slug}`;

    const { items: cartItems } = useCart();
    const { isInWishlist, toggleWishlist } = useWishlist();
    const { openDetail } = useProductDetail();
    const inCart = cartItems.some((i) => i.id === product.id);
    const wished = isInWishlist(product.id);

    const hasDiscount =
      !!product.original_price &&
      product.original_price > product.price &&
      !product.is_preorder;
    const discountPct = hasDiscount
      ? Math.floor(getDiscountPercentage(product.original_price!, product.price))
      : 0;
    const cond = conditionLabel(product.condition);
    const isOutOfStock = product.stock_quantity === 0 && !product.is_preorder;
    const categoryName = product.categories?.name;

    return (
      <motion.div
        custom={index}
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        className="group relative"
        role="region"
        aria-label={`Product: ${product.name}`}
      >
        <div className="flex flex-col h-full bg-warm-surface border border-warm-line rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-[3px] transition-all duration-200">
          {/* Media */}
          <Link
            to={productUrl}
            onClick={(e) => {
              e.preventDefault();
              incrementViewCount(product.id);
              openDetail(product);
            }}
            aria-label={`View ${product.name}`}
            className="relative block aspect-square bg-[#F1ECE5] overflow-hidden"
          >
            {!isImageLoaded && (
              <div className="absolute inset-0 bg-warm-line animate-pulse" />
            )}
            <img
              src={product.images?.[0] || "/placeholder.svg"}
              alt={product.name || "Product image"}
              loading="lazy"
              sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 16vw"
              onLoad={() => setIsImageLoaded(true)}
              className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${
                isImageLoaded ? "opacity-100" : "opacity-0"
              }`}
            />

            {/* Tags (top-left): pre-order / discount */}
            {product.is_preorder && (
              <span className="absolute top-3 left-3 text-[10.5px] font-bold tracking-wide px-2.5 py-1 rounded-full bg-warm-accent text-white">
                PRE-ORDER
              </span>
            )}
            {hasDiscount && (
              <span className="absolute top-3 left-3 text-[10.5px] font-bold tracking-wide px-2.5 py-1 rounded-full bg-warm-accent text-white">
                -{discountPct}%
              </span>
            )}

            {/* Condition pill (top-right) */}
            {cond && (
              <span className="absolute top-3 right-3 text-[10.5px] font-bold tracking-wide px-2.5 py-1 rounded-full bg-white/95 text-warm-ink shadow-sm">
                {cond}
              </span>
            )}

            {/* Wishlist toggle — stays visible (filled) once saved, otherwise fades in on hover */}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleWishlist({
                  id: product.id,
                  name: product.name,
                  price: product.price,
                  images: product.images,
                  slug: product.slug,
                });
              }}
              aria-label={
                wished
                  ? `Remove ${product.name} from wishlist`
                  : `Add ${product.name} to wishlist`
              }
              aria-pressed={wished}
              className={`absolute bottom-3 right-3 w-9 h-9 rounded-full bg-white/90 flex items-center justify-center transition-all duration-200 ${
                wished
                  ? "opacity-100 translate-y-0 text-warm-accent"
                  : "opacity-0 translate-y-1.5 text-warm-ink group-hover:opacity-100 group-hover:translate-y-0 hover:text-warm-accent"
              }`}
            >
              <Heart className={`w-[17px] h-[17px] ${wished ? "fill-current" : ""}`} />
            </button>
          </Link>

          {/* Body */}
          <div className="flex flex-col flex-1 gap-1 md:gap-1.5 px-3 md:px-4 pt-3 md:pt-3.5 pb-3.5 md:pb-4">
            {categoryName && (
              <span className="text-[10px] md:text-[11px] font-bold uppercase tracking-[0.08em] text-warm-faint truncate">
                {categoryName}
              </span>
            )}

            <Link
              to={productUrl}
              onClick={(e) => {
                e.preventDefault();
                openDetail(product);
              }}
            >
              <h3
                id={`product-desc-${product.id}`}
                className="text-[13px] md:text-[15px] font-semibold text-warm-ink leading-snug line-clamp-2"
              >
                {product.name}
              </h3>
            </Link>

            {product.rating ? (
              <span className="flex items-center gap-1.5 text-xs text-warm-muted">
                <Star className="w-[13px] h-[13px] text-warm-star fill-current" aria-hidden="true" />
                {product.rating.toFixed(1)}
              </span>
            ) : null}

            {/* Footer: price + icon add button */}
            <div className="flex items-end justify-between gap-2 mt-auto pt-1.5 min-w-0">
              <span className="min-w-0 font-display font-extrabold text-[15px] md:text-[18px] leading-tight text-warm-ink tabular-nums break-words">
                {formatPrice(product.price)}
                {hasDiscount && (
                  <small className="block font-sans font-medium text-[11px] md:text-xs text-warm-faint line-through">
                    {formatPrice(product.original_price!)}
                  </small>
                )}
              </span>

              <button
                onClick={() => {
                  if (isOutOfStock) return;
                  // The cart context shows its own "Added to Cart" / "Cart Updated" toast.
                  addToCart({
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    images: product.images,
                  });
                }}
                disabled={isOutOfStock}
                aria-label={
                  isOutOfStock
                    ? `${product.name} is out of stock`
                    : inCart
                    ? `${product.name} is in your cart — add another`
                    : `${product.is_preorder ? "Pre-order" : "Add to cart"}: ${product.name}`
                }
                title={inCart ? "In your cart" : undefined}
                className={`w-9 h-9 md:w-10 md:h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                  isOutOfStock
                    ? "bg-warm-line text-warm-faint cursor-not-allowed"
                    : inCart
                    ? "bg-warm-accent text-white hover:bg-warm-accentPress"
                    : "bg-warm-accentSoft text-warm-accent hover:bg-warm-accent hover:text-white"
                }`}
              >
                {inCart ? (
                  <Check className="w-4 h-4 md:w-[18px] md:h-[18px]" />
                ) : (
                  <ShoppingCart className="w-4 h-4 md:w-[18px] md:h-[18px]" />
                )}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }
);
