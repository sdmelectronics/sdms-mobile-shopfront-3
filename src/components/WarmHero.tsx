import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface BannerSlide {
  id: string;
  image_url: string;
  title?: string;
  display_order?: number;
}

// Fallback slides (used until banners load / if none are configured).
const fallbackSlides: BannerSlide[] = [
  { id: "fallback-1", image_url: "/phone.jpeg", title: "Latest smartphones" },
  { id: "fallback-2", image_url: "/headphones.jpeg", title: "Premium audio" },
  { id: "fallback-3", image_url: "/smarttv.jpeg", title: "Home entertainment" },
];

/**
 * WarmHero — the "Warm Premium" split hero (design) with the media panel
 * running a slideshow of the store's hero images, fetched from the `banners`
 * table just like the old HeroBanner (auto-advancing, arrows + dots, .mp4 aware).
 */
export const WarmHero = () => {
  const navigate = useNavigate();
  const onShop = () => navigate("/products");

  const [slides, setSlides] = useState<BannerSlide[]>(fallbackSlides);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("banners")
          .select("id, image_url, title, display_order")
          .eq("is_active", true)
          .order("display_order", { ascending: true });
        if (error) throw error;
        if (active && data && data.length > 0) {
          setSlides(data as BannerSlide[]);
          setCurrent(0);
        }
      } catch (err) {
        console.error("Error fetching hero banners:", err);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const prev = () => setCurrent((p) => (p - 1 + slides.length) % slides.length);
  const next = () => setCurrent((p) => (p + 1) % slides.length);

  return (
    <section className="px-4 md:px-8 pt-4 md:pt-7">
      <div className="max-w-[1240px] mx-auto bg-warm-hero rounded-2xl md:rounded-[26px] overflow-hidden grid grid-cols-1 md:grid-cols-[1.04fr_0.96fr] items-stretch md:min-h-[430px]">
        {/* Copy */}
        <div className="flex flex-col items-start gap-3.5 md:gap-[18px] px-[22px] py-[30px] pb-[26px] md:pl-14 md:pr-3 md:py-14">
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-warm-accent">
            Free delivery in Kampala
          </span>
          <h1 className="font-display font-extrabold text-warm-ink text-[32px] md:text-[50px] leading-[1.03] tracking-[-0.03em] m-0">
            Latest tech,
            <br />
            <span className="text-warm-accent">delivered today.</span>
          </h1>
          <p className="text-sm md:text-[17px] leading-relaxed text-warm-muted m-0 max-w-[430px]">
            Genuine smartphones, audio, laptops and more — curated for Uganda,
            backed by real warranty and expert support.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onShop}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-warm-accent text-white font-semibold text-[15px] px-[26px] py-[15px] hover:bg-warm-accentPress active:scale-[0.97] transition-all"
            >
              Shop Now
            </button>
            <button
              onClick={onShop}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-transparent text-warm-ink font-semibold text-[15px] px-[26px] py-[15px] border border-warm-line2 hover:border-warm-accent hover:text-warm-accent active:scale-[0.97] transition-all"
            >
              Browse Deals
            </button>
          </div>
          <div className="flex gap-[22px] md:gap-[30px] mt-1 md:mt-2">
            <div>
              <span className="block font-display font-extrabold text-warm-ink text-lg md:text-[22px]">10k+</span>
              <small className="text-xs text-warm-muted">Products sold</small>
            </div>
            <div>
              <span className="block font-display font-extrabold text-warm-ink text-lg md:text-[22px]">4.8★</span>
              <small className="text-xs text-warm-muted">Customer rating</small>
            </div>
            <div>
              <span className="block font-display font-extrabold text-warm-ink text-lg md:text-[22px]">24h</span>
              <small className="text-xs text-warm-muted">Kampala delivery</small>
            </div>
          </div>
        </div>

        {/* Media slideshow */}
        <div className="relative aspect-[16/10] md:aspect-auto overflow-hidden group">
          {slides.map((slide, i) => {
            const isVideo = slide.image_url?.toLowerCase().includes(".mp4");
            return (
              <div
                key={slide.id}
                className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                  i === current ? "opacity-100" : "opacity-0"
                }`}
                aria-hidden={i !== current}
              >
                {isVideo ? (
                  <video
                    className="w-full h-full object-cover"
                    src={slide.image_url}
                    autoPlay
                    muted
                    loop
                    playsInline
                  />
                ) : (
                  <img
                    src={slide.image_url}
                    alt={slide.title || "Hero image"}
                    className="w-full h-full object-cover"
                    loading={i === 0 ? "eager" : "lazy"}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/placeholder.svg";
                    }}
                  />
                )}
              </div>
            );
          })}

          {slides.length > 1 && (
            <>
              <button
                onClick={prev}
                aria-label="Previous image"
                className="absolute top-1/2 left-3 -translate-y-1/2 w-9 h-9 rounded-full bg-white/85 text-warm-ink shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-warm-accent hover:text-white transition-all z-[2]"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={next}
                aria-label="Next image"
                className="absolute top-1/2 right-3 -translate-y-1/2 w-9 h-9 rounded-full bg-white/85 text-warm-ink shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-warm-accent hover:text-white transition-all z-[2]"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 z-[2]">
                {slides.map((slide, i) => (
                  <button
                    key={slide.id}
                    onClick={() => setCurrent(i)}
                    aria-label={`Go to image ${i + 1}`}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      i === current ? "bg-white w-[22px]" : "bg-white/60 hover:bg-white/80 w-2"
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
};

export default WarmHero;
