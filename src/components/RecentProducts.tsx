import { useCart } from "@/hooks/useCart";
import { useWishlist } from "@/hooks/useWishlist";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Trash2, Heart, Check } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const RecentProducts = () => {
  const { recentProducts, addToCart, items: cartItems } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { toast } = useToast();

  if (recentProducts.length === 0) {
    return null;
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0
    }).format(price);
  };

  const handleAddToCart = (product: any) => {
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      images: product.images
    });
  };

  const handleClearRecentProducts = () => {
    localStorage.removeItem('sdms_recent_products');
    window.location.reload(); // Simple way to refresh the component
    toast({
      title: "Recent Products Cleared",
      description: "Your recent products have been cleared",
    });
  };

  return (
    <div className="pt-10 md:pt-14 pb-8">
      <div className="max-w-[1240px] mx-auto px-4 md:px-8">
        <div className="flex items-end justify-between gap-3 mb-5 md:mb-6">
          <div>
            <h2 className="font-display font-bold text-warm-ink text-[22px] md:text-[28px] tracking-tight">
              Recently added
            </h2>
            <p className="hidden md:block text-sm text-warm-muted mt-1.5">
              Fresh arrivals, just in.
            </p>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearRecentProducts}
            className="text-warm-muted hover:text-warm-accent"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Clear
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-[22px]">
          {recentProducts.map((product) => {
            const inCart = cartItems.some((i) => i.id === product.id);
            const wished = isInWishlist(product.id);
            return (
            <Card key={product.id} className="group hover:shadow-lg transition-all duration-300 overflow-hidden">
              <div className="relative aspect-square overflow-hidden">
                <img
                  src={product.images?.[0] || "/placeholder.svg"}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-300" />

                {/* Purchase time badge */}
                <div className="absolute top-2 left-2">
                  <Badge variant="secondary" className="text-xs bg-white/90 text-gray-700">
                    {formatDistanceToNow(new Date(product.purchasedAt), { addSuffix: true })}
                  </Badge>
                </div>

                {/* Wishlist toggle */}
                <button
                  onClick={() =>
                    toggleWishlist({
                      id: product.id,
                      name: product.name,
                      price: product.price,
                      images: product.images,
                    })
                  }
                  aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
                  aria-pressed={wished}
                  className={`absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center shadow-sm transition-all duration-200 ${
                    wished
                      ? "opacity-100 text-warm-accent"
                      : "opacity-0 text-gray-600 group-hover:opacity-100 hover:text-warm-accent"
                  }`}
                >
                  <Heart className={`h-4 w-4 ${wished ? "fill-current" : ""}`} />
                </button>

                {/* Add to cart button — shows a check once in cart */}
                <div
                  className={`absolute bottom-2 right-2 transition-opacity duration-300 ${
                    inCart ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  }`}
                >
                  <Button
                    size="sm"
                    onClick={() => handleAddToCart(product)}
                    title={inCart ? "In your cart" : undefined}
                    className={`h-8 w-8 p-0 rounded-full shadow-lg text-white ${
                      inCart ? "bg-warm-accent hover:bg-warm-accentPress" : "bg-orange-500 hover:bg-orange-600"
                    }`}
                  >
                    {inCart ? <Check className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <CardContent className="p-3">
                <h3 className="font-medium text-sm text-gray-900 line-clamp-2 mb-1">
                  {product.name}
                </h3>
                <p className="text-lg font-bold text-orange-600">
                  {formatPrice(product.price)}
                </p>
              </CardContent>
            </Card>
            );
          })}
        </div>

        {recentProducts.length > 0 && (
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Click the cart icon to quickly re-add items to your cart
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecentProducts; 