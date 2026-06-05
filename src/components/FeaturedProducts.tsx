import { Suspense, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/useCart";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { ProductCard } from "./ProductCard";
import { useFeaturedProducts } from "@/hooks/useFeaturedProducts";
import { FeaturedProductsSectionSkeleton } from "./SkeletonComponents";

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
    transition: { delay: i * 0.05 }, // Reduced delay for faster animation
  }),
};

export const FeaturedProducts = () => {
  const { products, loading, loadingMore, hasMore, loadMore, refresh, error } = useFeaturedProducts();
  const { addToCart } = useCart();
  const { toast } = useToast();

  // Memoized utility functions
  const formatPrice = useCallback((price: number): string =>
    new Intl.NumberFormat("en-UG", {
      style: "currency",
      currency: "UGX",
      minimumFractionDigits: 0,
    }).format(price), []);

  const formatViewCount = useCallback((count: number): string =>
    count >= 1_000_000
      ? `${(count / 1_000_000).toFixed(1)}M`
      : count >= 1000
      ? `${(count / 1000).toFixed(1)}k`
      : count.toString(), []);

  const getDiscountPercentage = useCallback((original: number, current: number): number =>
    Math.round(((original - current) / original) * 100), []);

  const formatAvailabilityDate = useCallback((dateString?: string): string | null =>
    dateString
      ? new Date(dateString).toLocaleDateString("en-UG", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : null, []);

  const incrementViewCount = useCallback(async (productId: string): Promise<void> => {
    const viewedKey = `viewed-${productId}`;
    if (sessionStorage.getItem(viewedKey)) return;

    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { error } = await supabase.rpc("increment_product_view", {
        product_id: productId,
      });
      if (error) throw error;
      sessionStorage.setItem(viewedKey, "true");
    } catch (error) {
      console.error("Failed to increment view count:", error);
    }
  }, []);

  // Show loading skeleton while the first page is loading.
  if (loading) {
    return <FeaturedProductsSectionSkeleton />;
  }

  // Show an actionable error state (with retry) if the fetch failed.
  if (error && products.length === 0) {
    return (
      <section className="py-8 bg-transparent">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-600 mb-3">Unable to load featured products.</p>
          <Button
            onClick={refresh}
            variant="outline"
            className="bg-warm-surface text-warm-accent border-warm-line2 hover:bg-warm-accentSoft"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try again
          </Button>
        </div>
      </section>
    );
  }

  // Nothing featured — render nothing rather than an empty shell.
  if (products.length === 0) {
    return null;
  }

  return (
    <section className="py-8 bg-transparent">
      <div className="max-w-[1240px] mx-auto px-4 md:px-8">
        <div className="flex items-end justify-between gap-3 mb-5 md:mb-6">
          <div>
            <h2 className="font-display font-bold text-warm-ink text-[22px] md:text-[28px] tracking-tight">
              Featured products
            </h2>
            <p className="hidden md:block text-sm text-warm-muted mt-1.5">
              Hand-picked deals from our catalog.
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              onClick={refresh}
              disabled={loading}
              variant="ghost"
              size="sm"
              className="text-warm-accent hover:bg-warm-accentSoft"
              aria-label="Refresh featured products"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Link to="/products" className="text-sm font-semibold text-warm-accent whitespace-nowrap hover:text-warm-accentPress transition-colors">
              View all →
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-[22px]">
          <AnimatePresence>
            <Suspense fallback={<div>Loading...</div>}>
              {products.map((product, i) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  index={i}
                  formatPrice={formatPrice}
                  formatViewCount={formatViewCount}
                  incrementViewCount={incrementViewCount}
                  addToCart={addToCart}
                  toast={toast}
                  getDiscountPercentage={getDiscountPercentage}
                  formatAvailabilityDate={formatAvailabilityDate}
                />
              ))}
            </Suspense>
          </AnimatePresence>
        </div>

        {/* Load More Button */}
        {hasMore && (
          <div className="text-center mt-8">
            <Button
              onClick={loadMore}
              disabled={loadingMore}
              variant="outline"
              className="bg-warm-surface text-warm-accent border-warm-line2 hover:bg-warm-accentSoft"
            >
              {loadingMore ? "Loading..." : "Load More Products"}
            </Button>
          </div>
        )}
      </div>
    </section>
  );
};