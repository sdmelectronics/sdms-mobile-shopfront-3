import React, { useEffect, useState, useCallback, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPhone,
  faHome,
  faTh,
  faTimes,
  faChevronRight,
  faListAlt,
  faShoppingCart,
} from '@fortawesome/free-solid-svg-icons';
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons';
import { useNavigate } from 'react-router-dom';
import { useCart } from '@/hooks/useCart';
import clsx from 'clsx';

const NAV_HEIGHT = 66;

// Cache for categories data
const categoriesCache = {
  data: null,
  timestamp: 0,
  loading: false,
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface CategoryDrawerProps {
  open: boolean;
  onClose: () => void;
  categories: Array<{
    id: string;
    name: string;
    slug?: string;
    image_url?: string;
    is_active: boolean;
    count?: number;
  }>;
  loading: boolean;
  onCategoryClick: (cat: any) => void;
}

// Category drawer — matches the design's .w-drawer (left slide-in, warm list)
const CategoryDrawer = React.memo(({ open, onClose, categories, loading, onCategoryClick }: CategoryDrawerProps) => (
  <div
    className={clsx(
      'fixed inset-0 z-50 transition-all duration-300',
      open ? 'pointer-events-auto' : 'pointer-events-none'
    )}
    style={{ background: open ? 'rgba(33,28,24,0.42)' : 'rgba(33,28,24,0)' }}
    onClick={onClose}
  >
    <div
      className={clsx(
        'absolute left-0 top-0 h-full w-[82%] max-w-[320px] bg-warm-surface shadow-2xl rounded-r-[26px] transition-transform duration-300 flex flex-col',
        open ? 'translate-x-0' : '-translate-x-full'
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-warm-line flex-shrink-0">
        <span className="font-display text-[17px] font-bold text-warm-ink">All Categories</span>
        <button
          className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-warm-accentSoft text-warm-muted hover:text-warm-accent transition"
          onClick={onClose}
          aria-label="Close categories"
        >
          <FontAwesomeIcon icon={faTimes} />
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-3">
        {loading ? (
          <div className="text-center text-warm-faint py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-warm-accent mx-auto mb-2"></div>
            Loading categories...
          </div>
        ) : (
          <ul className="space-y-1">
            {categories.map((cat) => (
              <li key={cat.id}>
                <button
                  className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-warm-accentSoft transition group"
                  onClick={() => {
                    onCategoryClick(cat);
                    onClose();
                  }}
                >
                  <span className="w-[38px] h-[38px] rounded-xl bg-warm-accentSoft text-warm-accent flex items-center justify-center overflow-hidden flex-shrink-0">
                    {cat.image_url ? (
                      <img src={cat.image_url} alt={cat.name} loading="lazy" className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      <FontAwesomeIcon icon={faListAlt} />
                    )}
                  </span>
                  <b className="flex-1 text-left text-sm font-semibold text-warm-ink">{cat.name}</b>
                  {cat.count > 0 && (
                    <small className="text-[11px] font-bold text-warm-accent bg-warm-accentSoft rounded-full px-2.5 py-0.5">
                      {cat.count}
                    </small>
                  )}
                  <FontAwesomeIcon icon={faChevronRight} className="text-warm-faint" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  </div>
));

CategoryDrawer.displayName = 'CategoryDrawer';

type NavId = 'home' | 'categories' | 'cart' | 'call' | 'whatsapp';

const MobileBottomNavigation = () => {
  const [activeTab, setActiveTab] = useState<NavId>('home');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [categories, setCategories] = useState<Array<{
    id: string;
    name: string;
    slug?: string;
    image_url?: string;
    is_active: boolean;
    count?: number;
  }>>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { itemCount } = useCart();
  const abortControllerRef = useRef<AbortController | null>(null);

  const isCacheValid = useCallback(() => {
    return (
      categoriesCache.data &&
      categoriesCache.timestamp &&
      Date.now() - categoriesCache.timestamp < CACHE_DURATION
    );
  }, []);

  const fetchCategories = useCallback(async () => {
    if (isCacheValid()) {
      setCategories(categoriesCache.data);
      setLoading(false);
      return;
    }

    if (categoriesCache.loading) return;
    categoriesCache.loading = true;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setLoading(true);

    try {
      const { supabase } = await import('@/integrations/supabase/client');

      const { data, error } = await supabase
        .from('categories')
        .select('id, name, slug, image_url, is_active')
        .eq('is_active', true)
        .order('name')
        .abortSignal(abortControllerRef.current.signal);

      if (error) throw error;

      const filteredCategories = data || [];
      categoriesCache.data = filteredCategories;
      categoriesCache.timestamp = Date.now();
      setCategories(filteredCategories);
    } catch (error) {
      if (error.name === 'AbortError') return;
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
      categoriesCache.loading = false;
      abortControllerRef.current = null;
    }
  }, [isCacheValid]);

  const closeDrawer = useCallback(() => {
    setSidebarOpen(false);
    document.body.style.overflow = '';
  }, []);

  const handleNavClick = useCallback((id: NavId) => {
    setActiveTab(id);
    switch (id) {
      case 'home':
        navigate('/');
        break;
      case 'categories':
        setSidebarOpen(true);
        document.body.style.overflow = 'hidden';
        fetchCategories();
        break;
      case 'cart':
        navigate('/checkout');
        break;
      case 'call':
        window.location.href = 'tel:+256755869853';
        break;
      case 'whatsapp':
        window.open('https://wa.me/256755869853', '_blank');
        break;
    }
  }, [navigate, fetchCategories]);

  const handleCategoryClick = useCallback((cat) => {
    const categoryParam = cat.slug || cat.name;
    navigate(`/products?category=${encodeURIComponent(categoryParam)}`);
  }, [navigate]);

  useEffect(() => {
    return () => {
      document.body.style.overflow = '';
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const items: { id: NavId; label: string; icon: typeof faHome; wa?: boolean }[] = [
    { id: 'home', label: 'Home', icon: faHome },
    { id: 'categories', label: 'Shop', icon: faTh },
    { id: 'cart', label: 'Cart', icon: faShoppingCart },
    { id: 'call', label: 'Call', icon: faPhone },
    { id: 'whatsapp', label: 'WhatsApp', icon: faWhatsapp, wa: true },
  ];

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 w-full md:hidden bg-warm-surface2/95 backdrop-blur-md border-t border-warm-line flex items-center justify-around px-1"
        style={{ height: NAV_HEIGHT, boxShadow: '0 -2px 20px 0 rgba(80,55,35,0.10)' }}
      >
        {items.map((item) => {
          const active = activeTab === item.id;
          const colorClass = item.wa
            ? 'text-warm-ok'
            : active
            ? 'text-warm-accent'
            : 'text-warm-muted';
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={clsx('flex flex-col items-center justify-center flex-1 gap-[3px] py-[5px] relative focus:outline-none', colorClass)}
              style={{ minWidth: 0 }}
              aria-label={item.label}
            >
              <span
                className={clsx(
                  'relative w-[42px] h-10 rounded-full flex items-center justify-center transition-all duration-200',
                  active ? 'bg-warm-accentSoft scale-[1.08]' : 'bg-transparent'
                )}
              >
                <FontAwesomeIcon icon={item.icon} className="text-xl" />
                {item.id === 'cart' && itemCount > 0 && (
                  <span className="absolute -top-1 right-0.5 min-w-[16px] h-4 px-1 bg-warm-accent text-white rounded-full text-[9px] font-bold flex items-center justify-center border-2 border-warm-surface2">
                    {itemCount}
                  </span>
                )}
              </span>
              <span className="text-[10.5px] font-semibold">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <CategoryDrawer
        open={sidebarOpen}
        onClose={closeDrawer}
        categories={categories}
        loading={loading}
        onCategoryClick={handleCategoryClick}
      />

      {/* Spacer so content isn't hidden behind the fixed nav */}
      <div className="h-[66px] md:hidden" />
    </>
  );
};

export default React.memo(MobileBottomNavigation);
