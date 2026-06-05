import { Link } from "react-router-dom";
import { Heart, ShoppingCart, Trash2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWishlist } from "@/hooks/useWishlist";
import { useCart } from "@/hooks/useCart";

const formatPrice = (price: number) =>
  new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency: "UGX",
    minimumFractionDigits: 0,
  }).format(price);

const Wishlist = () => {
  const { items, removeFromWishlist, clearWishlist } = useWishlist();
  const { items: cartItems, addToCart } = useCart();

  if (items.length === 0) {
    return (
      <div className="max-w-[1240px] mx-auto px-4 md:px-8 py-16 text-center">
        <Heart className="w-12 h-12 mx-auto text-warm-faint mb-4" />
        <h1 className="font-display text-2xl font-bold text-warm-ink mb-2">
          Your wishlist is empty
        </h1>
        <p className="text-warm-muted mb-6">
          Tap the heart on any product to save it here for later.
        </p>
        <Link to="/products">
          <Button className="bg-warm-accent text-white hover:bg-warm-accentPress">
            Browse products
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-[1240px] mx-auto px-4 md:px-8 py-8">
      <div className="flex items-end justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display text-[22px] md:text-[28px] font-bold text-warm-ink tracking-tight">
            My wishlist
          </h1>
          <p className="text-sm text-warm-muted mt-1.5">
            {items.length} saved item{items.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearWishlist}
          className="text-warm-muted hover:text-warm-accent"
        >
          <Trash2 className="h-4 w-4 mr-1" />
          Clear all
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-[22px]">
        {items.map((product) => {
          const inCart = cartItems.some((i) => i.id === product.id);
          const productUrl = product.slug ? `/products/${product.slug}` : "/products";

          return (
            <div
              key={product.id}
              className="group relative flex flex-col bg-warm-surface border border-warm-line rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200"
            >
              <Link
                to={productUrl}
                className="relative block aspect-square bg-[#F1ECE5] overflow-hidden"
              >
                <img
                  src={product.images?.[0] || "/placeholder.svg"}
                  alt={product.name}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />
              </Link>

              {/* Remove from wishlist */}
              <button
                onClick={() => removeFromWishlist(product.id)}
                aria-label={`Remove ${product.name} from wishlist`}
                className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 text-warm-accent flex items-center justify-center shadow-sm hover:bg-warm-accent hover:text-white transition-colors"
              >
                <Heart className="w-[17px] h-[17px] fill-current" />
              </button>

              <div className="flex flex-col flex-1 gap-1.5 px-4 pt-3.5 pb-4">
                <Link to={productUrl}>
                  <h3 className="text-[15px] font-semibold text-warm-ink leading-snug line-clamp-2">
                    {product.name}
                  </h3>
                </Link>

                <div className="flex items-end justify-between gap-2 mt-auto pt-1.5">
                  <span className="font-display font-extrabold text-[18px] leading-tight text-warm-ink tabular-nums">
                    {formatPrice(product.price)}
                  </span>

                  <button
                    onClick={() =>
                      addToCart({
                        id: product.id,
                        name: product.name,
                        price: product.price,
                        images: product.images,
                      })
                    }
                    aria-label={
                      inCart
                        ? `${product.name} is in your cart — add another`
                        : `Add ${product.name} to cart`
                    }
                    title={inCart ? "In your cart" : undefined}
                    className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                      inCart
                        ? "bg-warm-accent text-white hover:bg-warm-accentPress"
                        : "bg-warm-accentSoft text-warm-accent hover:bg-warm-accent hover:text-white"
                    }`}
                  >
                    {inCart ? (
                      <Check className="w-[18px] h-[18px]" />
                    ) : (
                      <ShoppingCart className="w-[18px] h-[18px]" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Wishlist;
