import { Link } from 'react-router-dom';
import { ProductCard } from '@/components/ProductCard';
import { useCart } from '@/hooks/useCart';
import { useToast } from '@/hooks/use-toast';
import { useRelatedProducts } from '@/hooks/useRelatedProducts';
import {
  formatAvailabilityDate,
  formatPrice,
  formatViewCount,
  getDiscountPercentage,
  incrementProductView,
} from '@/lib/productDisplay';

interface RelatedProductsProps {
  productId: string;
  categoryName?: string;
  categorySlug?: string;
}

/**
 * "More in <category>" below a product.
 *
 * The product page used to end at the specifications card, so every visitor
 * who did not buy immediately hit a dead end. This gives them somewhere to go
 * that is still on the site.
 */
export const RelatedProducts = ({ productId, categoryName, categorySlug }: RelatedProductsProps) => {
  const { products, source, loading, isError } = useRelatedProducts(productId, categorySlug);
  const { addToCart } = useCart();
  const { toast } = useToast();

  // A recommendations strip is a nice-to-have: if it fails, say nothing rather
  // than show an error under someone's product.
  if (isError) return null;

  if (loading) {
    return (
      <section className="max-w-[1240px] mx-auto px-4 md:px-8 pt-10 md:pt-14">
        <div className="h-6 w-48 bg-warm-line rounded animate-pulse mb-5" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-warm-surface border border-warm-line rounded-2xl h-64 animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  if (products.length === 0) return null;

  const showingCategory = source === 'category' && categoryName;

  return (
    <section className="max-w-[1240px] mx-auto px-4 md:px-8 pt-10 md:pt-14">
      <div className="flex items-end justify-between gap-3 mb-5 md:mb-6">
        <div>
          <h2 className="font-display font-bold text-warm-ink text-[22px] md:text-[28px] tracking-tight">
            {showingCategory ? `More in ${categoryName}` : 'Popular right now'}
          </h2>
          <p className="hidden md:block text-sm text-warm-muted mt-1.5">
            {showingCategory
              ? 'Other options customers are looking at.'
              : 'The products people are viewing most.'}
          </p>
        </div>

        {showingCategory && categorySlug && (
          <Link
            to={`/products?category=${encodeURIComponent(categorySlug)}`}
            className="text-sm font-semibold text-warm-accent whitespace-nowrap hover:text-warm-accentPress transition-colors"
          >
            View all →
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
        {products.map((product, index) => (
          <ProductCard
            key={product.id}
            product={product as any}
            index={index}
            formatPrice={formatPrice}
            formatViewCount={formatViewCount}
            incrementViewCount={incrementProductView}
            addToCart={addToCart}
            toast={toast}
            getDiscountPercentage={getDiscountPercentage}
            formatAvailabilityDate={formatAvailabilityDate}
          />
        ))}
      </div>
    </section>
  );
};
