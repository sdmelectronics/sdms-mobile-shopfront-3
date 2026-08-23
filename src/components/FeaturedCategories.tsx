import { Link } from "react-router-dom";
import {
  Smartphone,
  Tv,
  Wrench,
  Monitor,
  Tablet,
  Headphones,
  Camera,
  Gamepad2,
  Laptop,
  Watch
} from "lucide-react";
import { useActiveCategories } from "@/hooks/useCategories";

// Icon mapping for categories
const iconMap = {
  "phones": Smartphone,
  "televisions": Tv,
  "repair": Wrench,
  "systems": Monitor,
  "tablets": Tablet,
  "audio": Headphones,
  "cameras": Camera,
  "gaming": Gamepad2,
  "laptops": Laptop,
  "wearables": Watch,
};

export const FeaturedCategories = () => {
  const { categories, loading, isError, refetch } = useActiveCategories();

  const getIconForCategory = (categoryName) => {
    const key = categoryName.toLowerCase().replace(/\s+/g, '');
    return iconMap[key] || Monitor;
  };

  return (
    <section className="max-w-[1240px] mx-auto px-4 md:px-8 pt-10 md:pt-14">
      {/* Section header */}
      <div className="flex items-end justify-between gap-3 mb-5 md:mb-6">
        <div>
          <h2 className="font-display font-bold text-warm-ink text-[22px] md:text-[28px] tracking-tight">
            Shop by category
          </h2>
          <p className="hidden md:block text-sm text-warm-muted mt-1.5">
            Everything from flagship phones to home entertainment.
          </p>
        </div>
        <Link to="/products" className="text-sm font-semibold text-warm-accent whitespace-nowrap hover:text-warm-accentPress transition-colors">
          View all →
        </Link>
      </div>

      {/* Category tiles */}
      {loading ? (
        <div className="flex md:grid md:grid-cols-6 gap-3 md:gap-3.5 overflow-x-auto md:overflow-visible pb-1 md:pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex-shrink-0 w-[88px] md:w-auto bg-warm-surface border border-warm-line rounded-2xl py-5 px-2 flex flex-col items-center gap-3 shadow-sm">
              <div className="w-12 h-12 md:w-[52px] md:h-[52px] rounded-full bg-warm-line animate-pulse" />
              <div className="w-14 h-3 bg-warm-line rounded animate-pulse" />
            </div>
          ))}
        </div>
      ) : isError && categories.length === 0 ? (
        /* Previously this rendered an empty grid and gave the user no clue
           anything had failed, let alone a way to recover without reloading. */
        <div className="bg-warm-surface border border-warm-line rounded-2xl py-8 px-4 text-center">
          <p className="text-sm text-warm-muted mb-3">Couldn't load categories.</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="text-sm font-semibold text-warm-accent hover:text-warm-accentPress transition-colors"
          >
            Try again
          </button>
        </div>
      ) : (
        <div className="flex md:grid md:grid-cols-6 gap-3 md:gap-3.5 overflow-x-auto md:overflow-visible pb-1 md:pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {categories.slice(0, 12).map((category) => {
            const IconComponent = getIconForCategory(category.name);
            return (
              <Link
                key={category.id}
                to={`/products?category=${encodeURIComponent(category.slug || category.name)}`}
                className="group flex-shrink-0 w-[88px] md:w-auto bg-warm-surface border border-warm-line rounded-2xl py-5 px-2 flex flex-col items-center gap-3 shadow-sm hover:shadow-md hover:border-warm-accent/40 hover:-translate-y-1 transition-all duration-200"
                onClick={() => window.scrollTo(0, 0)}
              >
                <span className="w-12 h-12 md:w-[52px] md:h-[52px] rounded-full bg-warm-accentSoft text-warm-accent flex items-center justify-center overflow-hidden">
                  {category.image_url ? (
                    <img
                      src={category.image_url}
                      alt={category.name}
                      className="w-full h-full object-cover rounded-full"
                      loading="lazy"
                    />
                  ) : (
                    <IconComponent className="w-6 h-6 md:w-7 md:h-7" />
                  )}
                </span>
                <span className="text-xs md:text-[13px] font-semibold text-warm-ink text-center leading-tight">
                  {category.name}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
};
