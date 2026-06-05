import { Skeleton } from '@/components/ui/skeleton';

// Product Card Skeleton — matches the Warm Premium product card
export const ProductCardSkeleton = () => (
  <div className="flex flex-col bg-warm-surface border border-warm-line rounded-2xl overflow-hidden shadow-sm">
    <Skeleton className="aspect-square w-full rounded-none" />
    <div className="px-4 pt-3.5 pb-4 flex flex-col gap-2">
      <Skeleton className="h-2.5 w-16" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-3 w-12 mt-0.5" />
      <div className="flex items-end justify-between pt-2">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-10 w-10 rounded-lg" />
      </div>
    </div>
  </div>
);

// Category Card Skeleton — matches the "Shop by category" tile
export const CategoryCardSkeleton = () => (
  <div className="bg-warm-surface border border-warm-line rounded-2xl py-5 px-2 flex flex-col items-center gap-3 shadow-sm">
    <Skeleton className="w-12 h-12 md:w-[52px] md:h-[52px] rounded-full" />
    <Skeleton className="h-3 w-14" />
  </div>
);

// Banner Skeleton (admin grids / generic)
export const BannerSkeleton = () => (
  <div className="bg-warm-surface border border-warm-line rounded-2xl overflow-hidden shadow-sm">
    <Skeleton className="h-32 w-full rounded-none" />
    <div className="p-4">
      <Skeleton className="h-4 w-3/4 mb-2" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  </div>
);

// Hero Skeleton — matches the Warm Premium split hero
export const HeroBannerSkeleton = () => (
  <section className="px-4 md:px-8 pt-4 md:pt-7">
    <div className="max-w-[1240px] mx-auto bg-warm-hero rounded-2xl md:rounded-[26px] overflow-hidden grid grid-cols-1 md:grid-cols-[1.04fr_0.96fr] items-stretch md:min-h-[430px]">
      <div className="flex flex-col items-start gap-4 px-[22px] py-[30px] md:pl-14 md:pr-3 md:py-14">
        <Skeleton className="h-3 w-40 bg-warm-line2" />
        <Skeleton className="h-9 md:h-12 w-3/4 bg-warm-line2" />
        <Skeleton className="h-9 md:h-12 w-1/2 bg-warm-line2" />
        <Skeleton className="h-4 w-full max-w-[430px] bg-warm-line2" />
        <Skeleton className="h-4 w-2/3 max-w-[430px] bg-warm-line2" />
        <div className="flex gap-3 mt-2">
          <Skeleton className="h-12 w-32 rounded-xl bg-warm-line2" />
          <Skeleton className="h-12 w-32 rounded-xl bg-warm-line2" />
        </div>
        <div className="flex gap-[30px] mt-2">
          <Skeleton className="h-10 w-16 bg-warm-line2" />
          <Skeleton className="h-10 w-16 bg-warm-line2" />
          <Skeleton className="h-10 w-16 bg-warm-line2" />
        </div>
      </div>
      <Skeleton className="w-full aspect-[16/10] md:aspect-auto md:h-full rounded-none" />
    </div>
  </section>
);

// Section Header Skeleton — left-aligned header + "view all"
export const SectionHeaderSkeleton = ({ className = "" }: { className?: string }) => (
  <div className={`flex items-end justify-between gap-3 mb-5 md:mb-6 ${className}`}>
    <div className="space-y-2">
      <Skeleton className="h-6 md:h-7 w-44" />
      <Skeleton className="hidden md:block h-3 w-60" />
    </div>
    <Skeleton className="h-4 w-16" />
  </div>
);

// Products Grid Skeleton — 4-col (2 on mobile), matching .w-grid
export const ProductsGridSkeleton = ({ count = 8, className = "" }: { count?: number; className?: string }) => (
  <div className={`grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-[22px] ${className}`}>
    {[...Array(count)].map((_, i) => (
      <ProductCardSkeleton key={i} />
    ))}
  </div>
);

// Categories Grid Skeleton — 6-col tiles (3 on mobile)
export const CategoriesGridSkeleton = ({ count = 6, className = "" }: { count?: number; className?: string }) => (
  <div className={`grid grid-cols-3 md:grid-cols-6 gap-3 md:gap-3.5 ${className}`}>
    {[...Array(count)].map((_, i) => (
      <CategoryCardSkeleton key={i} />
    ))}
  </div>
);

// Banners Grid Skeleton
export const BannersGridSkeleton = ({ count = 3, className = "" }: { count?: number; className?: string }) => (
  <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}>
    {[...Array(count)].map((_, i) => (
      <BannerSkeleton key={i} />
    ))}
  </div>
);

// Featured Products Section Skeleton (home)
export const FeaturedProductsSectionSkeleton = () => (
  <section className="py-8 bg-transparent">
    <div className="max-w-[1240px] mx-auto px-4 md:px-8">
      <SectionHeaderSkeleton />
      <ProductsGridSkeleton count={8} />
    </div>
  </section>
);

// Featured Promotions Skeleton — matches the split promo banner
export const PromoBannerSkeleton = () => (
  <div className="max-w-[1240px] mx-auto px-4 md:px-8">
    <div className="text-center mb-6">
      <Skeleton className="h-7 w-60 mx-auto" />
      <Skeleton className="h-3 w-72 max-w-full mx-auto mt-2" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr] bg-warm-surface border border-warm-line rounded-2xl md:rounded-[26px] overflow-hidden shadow-md md:min-h-[230px]">
      <div className="p-6 md:p-10 flex flex-col justify-center gap-3">
        <Skeleton className="h-5 w-24 rounded-full" />
        <Skeleton className="h-7 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-10 w-32 rounded-xl mt-2" />
      </div>
      <Skeleton className="aspect-[16/9] md:aspect-auto w-full rounded-none" />
    </div>
  </div>
);

// Image Carousel Skeleton
export const ImageCarouselSkeleton = () => (
  <section className="py-12 max-w-[1240px] mx-auto px-4 md:px-8">
    <SectionHeaderSkeleton />
    <Skeleton className="h-64 md:h-80 w-full rounded-2xl" />
  </section>
);

// Newsletter Section Skeleton — matches the warm panel
export const NewsletterSectionSkeleton = () => (
  <section className="max-w-[1240px] mx-auto px-4 md:px-8 pt-10 md:pt-14 pb-4">
    <div className="bg-warm-panel rounded-[26px] px-6 py-10 md:p-[52px] text-center">
      <Skeleton className="h-3 w-28 mx-auto mb-3 bg-white/10" />
      <Skeleton className="h-7 w-64 max-w-full mx-auto mb-3 bg-white/10" />
      <Skeleton className="h-4 w-80 max-w-full mx-auto mb-6 bg-white/10" />
      <div className="max-w-[460px] mx-auto flex flex-col sm:flex-row items-center gap-2.5">
        <Skeleton className="flex-1 w-full h-[50px] rounded-xl bg-white/10" />
        <Skeleton className="w-full sm:w-32 h-[50px] rounded-xl bg-white/10" />
      </div>
    </div>
  </section>
);

// Loading Spinner (small loading states)
export const LoadingSpinner = ({ size = "md" }: { size?: "sm" | "md" | "lg" }) => {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12"
  };

  return (
    <div className={`animate-spin rounded-full border-b-2 border-warm-accent ${sizeClasses[size]}`} />
  );
};

// Page Loading Skeleton
export const PageLoadingSkeleton = () => (
  <div className="min-h-screen bg-warm-bg">
    <div className="max-w-[1240px] mx-auto px-4 md:px-8 py-6">
      <Skeleton className="h-10 w-40 mb-6" />
      <ProductsGridSkeleton count={8} />
    </div>
  </div>
);
