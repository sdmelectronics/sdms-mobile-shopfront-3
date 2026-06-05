import { useState, useEffect } from "react";
import { Search, Heart, ShoppingCart } from "lucide-react";
import { CartButton } from "./CartButton";
import { WishlistButton } from "./WishlistButton";
import { useWishlist } from "@/hooks/useWishlist";
import { useCart } from "@/hooks/useCart";
import { useNavigate } from "react-router-dom";

export const Navbar = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isScrolled, setIsScrolled] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const { count: wishlistCount } = useWishlist();
  const { itemCount: cartCount } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let lastScrollTop = 0;
    let isScrolling = false;

    const handleScroll = () => {
      const scrollTop = window.scrollY;
      
      // Clear existing timeout
      clearTimeout(timeoutId);
      
      // Set scrolling flag
      isScrolling = true;
      
      // Debounce with timeout to prevent rapid changes
      timeoutId = setTimeout(() => {
        // Only update if scroll position is significantly different
        const scrollDifference = Math.abs(scrollTop - lastScrollTop);
        
        if (scrollDifference > 10) { // Minimum scroll threshold
          if (scrollTop > 150) {
            setIsScrolled(true);
          } else if (scrollTop < 50) {
            setIsScrolled(false);
          }
          // Do nothing in the middle range (50-150px) to prevent flickering
        }
        
        lastScrollTop = scrollTop;
        isScrolling = false;
      }, 100); // 100ms debounce delay
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener("scroll", handleScroll);
      clearTimeout(timeoutId);
    };
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
    }
  };

  return (
    <div className="sticky top-0 z-50">
      {/* Marquee Text */}
     

      {/* Main Navigation */}
      <nav className="bg-warm-bg/90 backdrop-blur-md border-b border-warm-line">
        <div className="container mx-auto px-4 lg:px-8 py-3">
          <div
            className={`flex items-center justify-between w-full flex-wrap gap-4 transition-all duration-500 ease-in-out ${
              isScrolled ? "max-h-0 opacity-0 py-0 overflow-hidden transform scale-95" : "max-h-20 opacity-100 transform scale-100"
            }`}
          >
            {/* Logo with Image */}
            <a href="/" className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
              {!imageError ? (
                                  <img 
                    src="/sdmlogo.png" 
                    alt="SDM Electronics Logo" 
                    className={`w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16 object-contain rounded-xl p-1 transition-opacity duration-200 ${
                      imageLoaded ? 'opacity-100' : 'opacity-0'
                    }`}
                  onLoad={() => setImageLoaded(true)}
                  onError={() => {
                    console.log('Logo image failed to load, using fallback');
                    setImageError(true);
                  }}
                />
                             ) : (
                 /* Fallback text logo */
                 <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16 bg-gradient-to-br from-warm-panel to-[#0F1623] rounded-xl flex items-center justify-center shadow-md">
                   <span className="text-white font-extrabold text-sm sm:text-lg lg:text-xl font-display">SDM</span>
                 </div>
               )}

              <div className="flex flex-col justify-center">
                <span className="text-sm sm:text-lg lg:text-xl font-bold text-warm-ink leading-tight font-display">
                  SDM ELECTRONICS
                </span>
                <span className="text-[10px] lg:text-xs text-warm-accent font-bold uppercase tracking-[0.14em] leading-tight hidden sm:block">
                  Quality Electronics
                </span>
              </div>
            </a>

            {/* Right side navigation items */}
            <div className="flex items-center space-x-2 lg:space-x-6 ml-auto">
              {/* Desktop Navigation Links */}
              <a
                href="/"
                className="text-warm-ink/80 hover:text-warm-accent font-semibold transition-colors text-sm lg:text-base hidden md:block"
              >
                Home
              </a>
              <a
                href="/products"
                className="text-warm-ink/80 hover:text-warm-accent font-semibold transition-colors text-sm lg:text-base hidden md:block"
              >
                Products
              </a>
              <a
                href="/aboutUsPage"
                className="text-warm-ink/80 hover:text-warm-accent font-semibold transition-colors text-sm lg:text-base hidden lg:block"
              >
                About
              </a>
              <a
                href="/contactUsPage"
                className="text-warm-ink/80 hover:text-warm-accent font-semibold transition-colors text-sm lg:text-base hidden lg:block"
              >
                Contact
              </a>
              
              {/* Mobile icons: wishlist + cart (clean, design-style) */}
              <a
                href="/wishlist"
                aria-label="Wishlist"
                className="md:hidden relative text-warm-ink/80 hover:text-warm-accent p-2 rounded-full hover:bg-warm-accentSoft transition-colors"
              >
                <Heart className={`w-5 h-5 ${wishlistCount > 0 ? "fill-warm-accent text-warm-accent" : ""}`} />
                {wishlistCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-warm-accent text-white text-[10px] font-bold flex items-center justify-center">
                    {wishlistCount}
                  </span>
                )}
              </a>
              <a
                href="/checkout"
                aria-label="Cart"
                className="md:hidden relative text-warm-ink/80 hover:text-warm-accent p-2 rounded-full hover:bg-warm-accentSoft transition-colors"
              >
                <ShoppingCart className="w-5 h-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-warm-accent text-white text-[10px] font-bold flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </a>

              {/* Wishlist + Cart Buttons - Desktop/Tablet only */}
              <div className="hidden md:block">
                <WishlistButton />
              </div>
              <div className="hidden md:block">
                <CartButton />
              </div>
              
              {/* Call to Action Button */}
              <a
                href="tel:+256755869853"
                className="hidden sm:flex items-center bg-warm-accent hover:bg-warm-accentPress text-white px-4 py-2 rounded-full text-sm font-semibold transition-colors shadow-sm"
              >
                <span className="mr-2">📞</span>
                <span className="hidden lg:inline">Call Now</span>
              </a>

              {/* Currency Display */}
              <div className="hidden md:flex bg-warm-accentSoft text-warm-accent px-3 py-1 rounded-full text-sm font-semibold">
                <span className="flex items-center space-x-1">
                  <span className="text-lg">🇺🇬</span>
                  <span className="hidden sm:inline text-xs">UGX</span>
                </span>
              </div>
            </div>
          </div>

          {/* Search bar */}
          <form onSubmit={handleSearch} className={`flex w-full relative transition-all duration-300 ${
            isScrolled ? "mt-2" : "mt-4"
          }`}>
            <div className="relative w-full max-w-2xl mx-auto">
              <input
                type="text"
                placeholder="Search for electronics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-11 rounded-full bg-warm-surface text-warm-ink px-4 pl-12 pr-4 focus:ring-2 focus:ring-warm-accent/30 focus:border-warm-accent placeholder-warm-faint text-sm lg:text-base outline-none shadow-sm border border-warm-line2 transition-all duration-200"
              />
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 lg:w-5 lg:h-5 text-warm-faint" />
              <button type="submit" className="sr-only">Search</button>
            </div>
          </form>
        </div>
      </nav>

      {/* Animation CSS */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes marquee {
              0% { transform: translate3d(0, 0, 0); }
              100% { transform: translate3d(-100%, 0, 0); }
            }
            @keyframes bounce {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-15px); }
            }
            .animate-marquee {
              animation: marquee 47s linear infinite;
              will-change: transform;
            }
            .animate-marquee:hover {
              animation-play-state: paused;
            }
            @media (min-width: 1024px) {
              .animate-marquee {
                animation: none;
              }
              .animate-bounce-text {
                animation: bounce 1.5s ease-in-out infinite;
                display: inline-block; /* Needed for transform */
              }
            }
            @media (max-width: 1023px) {
              .animate-bounce-text {
                animation: none;
              }
              .animate-marquee {
                animation: marquee 47s linear infinite;
              }
            }
          `,
        }}
      />
    </div>
  );
};