"use client";
import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Zap, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface PromoBanner {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  image_url: string;
  cta_text: string;
  badge_text?: string;
  category_slug?: string;
  link_url?: string;
  sort_order: number;
}

function PromoBanners() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  // Storefront view: active banners only, via RPC. React Query handles caching,
  // dedup, retry and loading state (shared key namespace with the admin hook so
  // admin edits invalidate this automatically).
  const {
    data: banners = [],
    isLoading: loading,
    error: queryError,
  } = useQuery<PromoBanner[]>({
    queryKey: ["promo-banners", "active"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_active_promo_banners');
      if (error) throw error;
      return (data || []) as PromoBanner[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const error = queryError ? (queryError as any)?.message || 'Failed to load promo banners' : null;

  const nextSlide = () => {
    if (banners.length === 0) return;
    setCurrentIndex((prevIndex) =>
      prevIndex === banners.length - 1 ? 0 : prevIndex + 1
    );
  };

  const prevSlide = () => {
    if (banners.length === 0) return;
    setCurrentIndex((prevIndex) =>
      prevIndex === 0 ? banners.length - 1 : prevIndex - 1
    );
  };

  const goToSlide = (index: number) => {
    if (index >= 0 && index < banners.length) {
      setCurrentIndex(index);
    }
  };

  useEffect(() => {
    if (banners.length === 0) return;
    
    const autoSlide = setInterval(() => {
      nextSlide();
    }, 4000);
    return () => clearInterval(autoSlide);
  }, [banners.length]);

  // Reset current index when banners change
  useEffect(() => {
    setCurrentIndex(0);
  }, [banners.length]);

  if (loading) {
    return (
      <div className="max-w-[1240px] mx-auto px-4 md:px-8">
        <div className="text-center mb-6">
          <h2 className="font-display text-[22px] md:text-[28px] font-bold text-warm-ink inline-flex items-center gap-2.5 tracking-tight">
            <Zap className="text-warm-accent fill-warm-accent w-[22px] h-[22px]" />
            Featured Promotions
          </h2>
          <p className="text-warm-muted text-sm mt-1.5">Discover our latest deals and premium products.</p>
        </div>
        <div className="bg-warm-surface rounded-2xl md:rounded-[26px] shadow-md border border-warm-line p-8 md:p-10 md:min-h-[230px]">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-warm-line rounded w-1/3"></div>
            <div className="h-4 bg-warm-line rounded w-1/2"></div>
            <div className="h-4 bg-warm-line rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || banners.length === 0) {
    return (
      <div className="max-w-[1240px] mx-auto px-4 md:px-8">
        <div className="text-center mb-6">
          <h2 className="font-display text-[22px] md:text-[28px] font-bold text-warm-ink inline-flex items-center gap-2.5 tracking-tight">
            <Zap className="text-warm-accent fill-warm-accent w-[22px] h-[22px]" />
            Featured Promotions
          </h2>
          <p className="text-warm-muted text-sm mt-1.5">
            {error ? 'Unable to load promotions' : 'No promotions available'}
          </p>
        </div>
        <div className="bg-warm-surface rounded-2xl md:rounded-[26px] shadow-md border border-warm-line p-8 md:p-10 text-center md:min-h-[230px] flex items-center justify-center">
          <p className="text-warm-muted">
            {error || 'Check back later for exciting promotions!'}
          </p>
        </div>
      </div>
    );
  }

  const banner = banners[currentIndex];
  const bannerLink = banner.link_url || `/products?category=${banner.category_slug}`;

  return (
    <div className="max-w-[1240px] mx-auto px-4 md:px-8">
      {/* Head */}
      <div className="text-center mb-6">
        <h2 className="font-display text-[22px] md:text-[28px] font-bold text-warm-ink inline-flex items-center gap-2.5 tracking-tight">
          <Zap className="text-warm-accent fill-warm-accent w-[22px] h-[22px]" />
          Featured Promotions
        </h2>
        <p className="text-warm-muted text-sm mt-1.5">
          Discover our latest deals and premium products.
        </p>
      </div>

      {/* Stage */}
      <div className="relative">
        <div
          className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr] items-stretch bg-warm-surface border border-warm-line rounded-2xl md:rounded-[26px] overflow-hidden shadow-md md:min-h-[230px]"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Text */}
          <div className="order-2 md:order-1 flex flex-col items-start justify-center gap-2.5 md:gap-3.5 p-6 md:p-10 bg-gradient-to-br from-warm-hero to-warm-surface">
            {banner.badge_text && (
              <span className="text-[11px] font-bold uppercase tracking-wide text-warm-accent bg-warm-accentSoft px-3 py-[5px] rounded-full">
                {banner.badge_text}
              </span>
            )}
            <h3 className="font-display font-extrabold text-warm-ink text-[23px] md:text-[30px] leading-[1.1] tracking-tight m-0">
              {banner.title}
            </h3>
            {banner.subtitle && (
              <p className="text-sm font-bold text-warm-accent -mt-1.5">{banner.subtitle}</p>
            )}
            {banner.description && (
              <p className="text-sm leading-relaxed text-warm-muted m-0">{banner.description}</p>
            )}
            <a href={bannerLink}>
              <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-warm-accent text-white font-semibold text-sm px-[22px] py-3 hover:bg-warm-accentPress active:scale-[0.97] transition-all">
                {banner.cta_text}
              </button>
            </a>
          </div>

          {/* Media */}
          <div className="order-1 md:order-2 relative overflow-hidden aspect-[16/9] md:aspect-auto">
            <img
              src={banner.image_url}
              alt={banner.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = '/placeholder.svg';
              }}
            />
          </div>
        </div>

        {/* Arrows */}
        {banners.length > 1 && (
          <>
            <button
              onClick={prevSlide}
              aria-label="Previous"
              className="absolute top-1/2 left-3.5 -translate-y-1/2 w-10 h-10 rounded-full bg-white/95 shadow-md text-warm-ink hover:bg-warm-accent hover:text-white flex items-center justify-center transition-colors z-[2]"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={nextSlide}
              aria-label="Next"
              className="absolute top-1/2 right-3.5 -translate-y-1/2 w-10 h-10 rounded-full bg-white/95 shadow-md text-warm-ink hover:bg-warm-accent hover:text-white flex items-center justify-center transition-colors z-[2]"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {/* Dots */}
      {banners.length > 1 && (
        <div className="flex justify-center gap-2 mt-[18px]">
          {banners.map((b, index) => (
            <button
              key={b.id}
              onClick={() => goToSlide(index)}
              aria-label={`Slide ${index + 1}`}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? "bg-warm-accent w-[22px]"
                  : "bg-warm-line2 hover:bg-warm-faint w-2"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default PromoBanners;