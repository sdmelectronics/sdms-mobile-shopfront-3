import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const Marquee = () => {
  const [marqueeText, setMarqueeText] = useState('🔥 Welcome to SDM Electronics - Your trusted source for quality electronics in Uganda! 📱💻 Free delivery within Kampala 🔥');
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    fetchMarqueeText();
  }, []);

  const fetchMarqueeText = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('setting_value, is_active')
        .eq('setting_key', 'marquee_text')
        .single();

      if (error) {
        if (import.meta.env.DEV) {
          console.log('Using fallback marquee text');
        }
        return;
      }

      if (data && data.is_active && data.setting_value) {
        setMarqueeText(data.setting_value);
      }
      setIsVisible(data?.is_active || false);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.log('Error fetching marquee text:', error);
      }
    }
  };

  if (!isVisible || !marqueeText) {
    return null;
  }

  return (
    <div
      className="bg-warm-panel text-white py-2 overflow-hidden lg:flex lg:justify-center"
      role="status"
      aria-label="Notification banner"
    >
      <div className="relative whitespace-nowrap min-w-max lg:min-w-0 flex items-center justify-center">
        {/* Left decorative SVG */}
        <svg
          className="hidden lg:block absolute left-0 top-1/2 transform -translate-y-1/2 w-8 h-8 text-orange-400 opacity-50"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>

        {/* Text with bounce on large screens, marquee on small */}
        <span className="text-md font-medium mx-4 animate-marquee lg:animate-bounce-text">
          {marqueeText}{" "}
          <a
            href="tel:+256-755-869-853"
            className="underline text-warm-accent hover:text-orange-300"
            onClick={(e) => e.stopPropagation()} // prevent marquee pause or other side effects
          >
            Call us at +256 755 869 853
          </a>{" "}
          | Email: sdmelectronics256@gmail.com
        </span>

        {/* Right decorative SVG */}
        <svg
          className="hidden lg:block absolute right-0 top-1/2 transform -translate-y-1/2 w-8 h-8 text-orange-400 opacity-50"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <circle cx="12" cy="12" r="10" />
        </svg>
      </div>
    </div>
  );
}; 