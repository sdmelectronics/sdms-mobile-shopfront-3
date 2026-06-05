import { Skeleton } from '@/components/ui/skeleton';
import {
  HeroBannerSkeleton,
  SectionHeaderSkeleton,
  CategoriesGridSkeleton,
  PromoBannerSkeleton,
  FeaturedProductsSectionSkeleton,
  ProductsGridSkeleton,
  NewsletterSectionSkeleton,
} from './SkeletonComponents';

// Value band skeleton (3 cards)
const ValueBandSkeleton = () => (
  <section className="max-w-[1240px] mx-auto px-4 md:px-8 pt-10 md:pt-14">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex items-center gap-3.5 p-5 md:p-[22px] bg-warm-surface border border-warm-line rounded-2xl">
          <Skeleton className="w-[46px] h-[46px] rounded-xl flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-1/2" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  </section>
);

// Main App Skeleton — mirrors the Warm Premium homepage
export const AppSkeleton = () => {
  return (
    <div className="min-h-screen bg-warm-bg">
      {/* Hero */}
      <HeroBannerSkeleton />

      {/* Shop by category */}
      <section className="max-w-[1240px] mx-auto px-4 md:px-8 pt-10 md:pt-14">
        <SectionHeaderSkeleton />
        <CategoriesGridSkeleton />
      </section>

      {/* Featured Promotions */}
      <section className="pt-10 md:pt-14">
        <PromoBannerSkeleton />
      </section>

      {/* Featured products */}
      <FeaturedProductsSectionSkeleton />

      {/* Value band */}
      <ValueBandSkeleton />

      {/* Recently added */}
      <section className="max-w-[1240px] mx-auto px-4 md:px-8 pt-10 md:pt-14">
        <SectionHeaderSkeleton />
        <ProductsGridSkeleton count={8} />
      </section>

      {/* Newsletter */}
      <NewsletterSectionSkeleton />
    </div>
  );
};

export default AppSkeleton;
