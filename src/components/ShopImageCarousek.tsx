import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const ShopImageCarousel = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(true);
  const [touchStartX, setTouchStartX] = useState(null);
  // Use Supabase to fetch carousel images, fallback to static images if none
  const [carouselImages, setCarouselImages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function fetchCarouselImages() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('carousel_images')
          .select('id, image_url, alt_text')
          .eq('is_active', true)
          .order('display_order', { ascending: true });
        
        if (!error && Array.isArray(data) && isMounted) {
          setCarouselImages(data.filter(img => !!img.image_url));
        }
      } catch (err) {
        console.error('Error fetching carousel images:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchCarouselImages();
    return () => { isMounted = false; };
  }, []);

  // Use uploaded images if available, otherwise fallback to static images
  const images = useMemo(() => {
    return (carouselImages && carouselImages.length > 0)
      ? carouselImages.map(img => ({
          id: img.id,
          src: img.image_url,
          alt: img.alt_text || 'Shop carousel image',
        }))
      : [
          {
            id: 1,
            src: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&h=400&fit=crop&crop=center',
            alt: 'Modern retail store interior',
          },
          {
            id: 2,
            src: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&h=400&fit=crop&crop=center',
            alt: 'Boutique clothing display',
          },
          {
            id: 3,
            src: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&h=400&fit=crop&crop=center',
            alt: 'Electronics store showcase',
          },
          {
            id: 4,
            src: 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=800&h=400&fit=crop&crop=center',
            alt: 'Bookstore interior',
          },
          {
            id: 5,
            src: 'https://images.unsplash.com/photo-1528698827591-e19ccd7bc23d?w=800&h=400&fit=crop&crop=center',
            alt: 'Coffee shop atmosphere',
          },
        ];
  }, [carouselImages]);

  // Autoplay
  useEffect(() => {
    if (!isAutoPlay) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    }, 4000);

    return () => clearInterval(interval);
  }, [isAutoPlay, images.length]);

  const goToPrevious = () => {
    setCurrentIndex(currentIndex === 0 ? images.length - 1 : currentIndex - 1);
  };

  const goToNext = () => {
    setCurrentIndex(currentIndex === images.length - 1 ? 0 : currentIndex + 1);
  };

  const goToSlide = (index) => {
    setCurrentIndex(index);
  };

  // Swipe logic
  const handleTouchStart = (e) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e) => {
    if (touchStartX === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const deltaX = touchStartX - touchEndX;

    if (deltaX > 50) goToNext();       // swipe left
    else if (deltaX < -50) goToPrevious(); // swipe right

    setTouchStartX(null);
  };

  const handleFocus = () => setIsAutoPlay(false);
  const handleBlur = () => setIsAutoPlay(true);

  return (
    <div className="relative w-full max-w-6xl mx-auto bg-gray-100 rounded-lg overflow-hidden shadow-lg pb-5">
      <h1 className="text-center text-2xl font-bold py-4">Our Shop </h1>
      {/* Main carousel */}
      <div
        className="relative h-48 sm:h-64 md:h-72 lg:h-96 overflow-hidden"
        onMouseEnter={() => setIsAutoPlay(false)}
        onMouseLeave={() => setIsAutoPlay(true)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="flex transition-transform duration-500 ease-in-out h-full"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {images.map((image) => (
            <div key={image.id} className="w-full h-full flex-shrink-0">
              <img
                loading="lazy"
                src={image.src}
                alt={image.alt}
                className="w-full h-full object-cover"
                draggable={false}
              />
            </div>
          ))}
        </div>

        {/* Arrows */}
        <button
          onClick={goToPrevious}
          onFocus={handleFocus}
          onBlur={handleBlur}
          role="button"
          tabIndex={0}
          className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-1.5 sm:p-2 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white"
          aria-label="Previous image"
        >
          <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        <button
          onClick={goToNext}
          onFocus={handleFocus}
          onBlur={handleBlur}
          role="button"
          tabIndex={0}
          className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-1.5 sm:p-2 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white"
          aria-label="Next image"
        >
          <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        {/* Counter */}
        <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs sm:text-sm">
          {currentIndex + 1} / {images.length}
        </div>
      </div>

      {/* Dots */}
      <div className="flex justify-center space-x-2 py-3 sm:py-4 bg-white">
        {images.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            role="button"
            tabIndex={0}
            aria-label={`Go to slide ${index + 1}`}
            className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-warm-accent ${
              currentIndex === index
                ? 'bg-warm-accent scale-110'
                : 'bg-warm-line2 hover:bg-warm-faint'
            }`}
          />
        ))}
      </div>

      {/* Mobile swipe hint */}
      <div className="sm:hidden text-center text-xs text-gray-500 pb-2">
        Swipe left or right to navigate
      </div>
    </div>
  );
};

export default ShopImageCarousel;
