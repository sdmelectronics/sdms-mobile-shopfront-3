import { WarmHero } from "@/components/WarmHero";
import { FeaturedCategories } from "@/components/FeaturedCategories";
import { FeaturedProducts } from "@/components/FeaturedProducts";
import { ValueBand } from "@/components/ValueBand";
import PromoBanners from "@/components/PromoBanners";
import RecentProducts from "@/components/RecentProducts";

const Index = () => {
  return (
    <main className="min-h-screen bg-transparent">
      {/* Hero — Warm Premium split hero (design) */}
      <WarmHero />

      {/* Shop by category */}
      <FeaturedCategories />

      {/* Featured Promotions */}
      <section className="pt-10 md:pt-14">
        <PromoBanners />
      </section>

      {/* Featured products */}
      <FeaturedProducts />

      {/* Value band */}
      <ValueBand />

      {/* Recently added */}
      <RecentProducts />

      {/* Newsletter */}
      <section className="max-w-[1240px] mx-auto px-4 md:px-8 pt-10 md:pt-14 pb-4">
        <div className="bg-warm-panel text-white rounded-[26px] px-6 py-10 md:p-[52px] text-center relative overflow-hidden">
          <span className="text-warm-accent font-bold uppercase tracking-[0.14em] text-xs">
            Stay in the loop
          </span>
          <h2 className="font-display text-[22px] md:text-[28px] font-bold mb-2 mt-2 tracking-tight">
            Latest tech, exclusive deals.
          </h2>
          <p className="text-white/70 mb-6 max-w-[440px] mx-auto text-sm md:text-[15px]">
            Subscribe for product launches, price drops, and insider offers across Uganda.
          </p>
          <form className="max-w-[460px] mx-auto flex flex-col sm:flex-row items-center gap-2.5">
            <input
              type="email"
              aria-label="Email for newsletter"
              placeholder="Enter your email"
              className="flex-1 w-full h-[50px] px-[18px] rounded-xl text-warm-ink focus:outline-none focus:ring-2 focus:ring-warm-accent text-sm"
            />
            <button
              type="submit"
              className="bg-warm-accent text-white px-[26px] h-[50px] rounded-xl font-bold hover:bg-warm-accentPress transition-colors w-full sm:w-auto text-sm"
            >
              Subscribe
            </button>
          </form>
        </div>
      </section>
    </main>
  );
};

export default Index;
