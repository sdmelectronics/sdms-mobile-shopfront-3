import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Filter, Grid, List, Star, ShoppingCart, Eye, Heart, Phone, Zap, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, PaginationEllipsis } from "@/components/ui/pagination";
import { useCart } from "@/hooks/useCart";
import { useWishlist } from "@/hooks/useWishlist";
import { useProductDetail } from "@/hooks/useProductDetail";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { generateProductRatings } from "@/lib/ratingUtils";

interface Product {
  id: string;
  name: string;
  price: number;
  original_price?: number;
  description: string;
  short_description?: string;
  images: string[];
  category: string;
  stock_quantity: number;
  rating?: number;
  reviews_count?: number;
  slug: string;
  sku?: string;
  view_count?: number;
  is_preorder: boolean;
  preorder_availability_date?: string;
  condition?: 'new' | 'used' | 'like_new' | 'refurbished' | 'open_box';
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

const PRODUCTS_PER_PAGE = 20; // Increased from 12 for fewer requests

// Cache for products and categories
const cache = {
  products: new Map<string, { data: Product[], count: number, timestamp: number }>(),
  categories: null as Category[] | null,
  categoriesTimestamp: 0
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Loading skeleton component - optimized
const ProductSkeleton = ({ viewMode }: { viewMode: 'grid' | 'list' }) => (
  <div className={`bg-warm-surface border border-warm-line rounded-2xl shadow-sm animate-pulse ${
    viewMode === 'list' ? 'flex gap-4 p-3' : 'flex flex-col overflow-hidden'
  }`}>
    <div className={`bg-warm-line ${
      viewMode === 'list' ? 'w-24 h-24 rounded-xl flex-shrink-0' : 'aspect-square'
    }`}></div>
    <div className={`flex flex-col flex-1 min-w-0 gap-2 ${viewMode === 'list' ? '' : 'px-4 pt-3.5 pb-4'}`}>
      <div className="h-2.5 bg-warm-line rounded w-16"></div>
      <div className="h-4 bg-warm-line rounded w-3/4"></div>
      <div className="h-4 bg-warm-line rounded w-1/2"></div>
      <div className="h-3 bg-warm-line rounded w-12 mt-0.5"></div>
      <div className="flex items-end justify-between pt-2">
        <div className="h-5 bg-warm-line rounded w-24"></div>
        <div className="h-10 w-10 bg-warm-line rounded-lg"></div>
      </div>
    </div>
  </div>
);

// Optimized product card with lazy image loading
const ProductCard = ({ product, viewMode, onAddToCart }: {
  product: Product;
  viewMode: 'grid' | 'list';
  onAddToCart: (product: Product) => void;
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageSrc, setImageSrc] = useState<string>('');
  const containerRef = useRef<HTMLDivElement>(null);

  const { items: cartItems } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { openDetail } = useProductDetail();
  const inCart = cartItems.some((i) => i.id === product.id);
  const wished = isInWishlist(product.id);

  const formatPrice = useCallback((price: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0
    }).format(price);
  }, []);

  const formatViewCount = useCallback((count: number) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count.toString();
  }, []);

  const formatAvailabilityDate = useCallback((dateString?: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString('en-UG', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  }, []);

  const discountPercentage = useMemo(() => {
    if (!product.original_price || product.original_price <= product.price) return 0;
    return Math.round(((product.original_price - product.price) / product.original_price) * 100);
  }, [product.original_price, product.price]);

  const stockStatus = useMemo(() => {
    if (product.is_preorder) {
      return {
        text: product.preorder_availability_date
          ? `Available ${formatAvailabilityDate(product.preorder_availability_date)}`
          : 'Pre-order Available',
        className: 'text-warm-accent'
      };
    }
    
    if (product.stock_quantity > 0) {
      return {
        text: product.stock_quantity < 10 
          ? `Only ${product.stock_quantity} left!` 
          : 'In Stock',
        className: 'text-green-600'
      };
    }
    
    return {
      text: 'Out of Stock',
      className: 'text-red-600'
    };
  }, [product.stock_quantity, product.is_preorder, product.preorder_availability_date, formatAvailabilityDate]);

  const isOutOfStock = product.stock_quantity === 0 && !product.is_preorder;

  // Optimized image loading with intersection observer on container
  useEffect(() => {
    const container = containerRef.current;
    if (!container || imageSrc) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setImageSrc(product.images[0] || '/placeholder.svg');
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, [product.images, imageSrc]);

  return (
    <div
      className={`group bg-warm-surface border border-warm-line rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-[3px] transition-all duration-200 ${
        viewMode === 'list' ? 'flex gap-4 p-3' : 'flex flex-col overflow-hidden'
      }`}
    >
      {/* Product Image */}
      <div
        ref={containerRef}
        className={`relative overflow-hidden ${
          viewMode === 'list' ? 'w-24 h-24 rounded-xl flex-shrink-0' : 'aspect-square bg-[#F1ECE5]'
        }`}
      >
        <Link
          to={`/products/${product.slug}`}
          onClick={(e) => { e.preventDefault(); openDetail(product); }}
          className="block w-full h-full"
        >
          <div className="w-full h-full overflow-hidden">
            {!imageSrc && (
              <div className="w-full h-full bg-warm-line animate-pulse" />
            )}
            {imageSrc && (
              <img
                src={imageSrc}
                alt={product.name}
                className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-200 ${
                  imageLoaded ? 'opacity-100' : 'opacity-0'
                }`}
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
                loading="lazy"
                decoding="async"
              />
            )}
            {imageError && imageSrc && (
              <div className="w-full h-full bg-warm-line flex items-center justify-center text-warm-faint text-xs">
                No Image
              </div>
            )}
          </div>
        </Link>

        {/* Tags (top-left): pre-order / discount */}
        <div className="absolute top-3 left-3">
          {product.is_preorder ? (
            <Badge className="bg-warm-accent text-white text-[10.5px] font-bold tracking-wide px-2.5 py-1 rounded-full">
              <span className="flex items-center gap-1">
                <Zap className="w-3 h-3" />
                PRE-ORDER
              </span>
            </Badge>
          ) : (
            discountPercentage > 0 && (
              <Badge className="bg-warm-accent text-white text-[10.5px] font-bold tracking-wide px-2.5 py-1 rounded-full">
                -{discountPercentage}%
              </Badge>
            )
          )}
        </div>

        {/* Condition pill (top-right) */}
        {product.condition && (
          <div className="absolute top-3 right-3">
            <Badge className="bg-white/95 text-warm-ink text-[10.5px] px-2.5 py-1 rounded-full shadow-sm font-bold tracking-wide">
              {product.condition === 'like_new' ? 'LIKE NEW' :
               product.condition === 'open_box' ? 'OPEN BOX' :
               product.condition.toUpperCase()}
            </Badge>
          </div>
        )}

        {/* Wishlist toggle (grid) — stays visible (filled) once saved, otherwise fades in on hover */}
        {viewMode === 'grid' && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleWishlist({
                id: product.id,
                name: product.name,
                price: product.price,
                images: product.images,
                slug: product.slug,
              });
            }}
            aria-label={wished ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
            aria-pressed={wished}
            className={`absolute bottom-3 right-3 w-9 h-9 rounded-full bg-white/90 flex items-center justify-center transition-all duration-200 ${
              wished
                ? 'opacity-100 translate-y-0 text-warm-accent'
                : 'opacity-0 translate-y-1.5 text-warm-ink group-hover:opacity-100 group-hover:translate-y-0 hover:text-warm-accent'
            }`}
          >
            <Heart className={`w-[17px] h-[17px] ${wished ? 'fill-current' : ''}`} />
          </button>
        )}
      </div>

      {/* Product Info */}
      <div className={`flex flex-col flex-1 min-w-0 gap-1 md:gap-1.5 ${viewMode === 'list' ? '' : 'px-3 md:px-4 pt-3 md:pt-3.5 pb-3.5 md:pb-4'}`}>
        {product.category && (
          <span className="text-[10px] md:text-[11px] font-bold uppercase tracking-[0.08em] text-warm-faint truncate">
            {product.category}
          </span>
        )}

        <Link
          to={`/products/${product.slug}`}
          onClick={(e) => { e.preventDefault(); openDetail(product); }}
        >
          <h3 className="text-[13px] md:text-[15px] font-semibold text-warm-ink leading-snug line-clamp-2 hover:text-warm-accent transition-colors">
            {product.name}
          </h3>
        </Link>

        {product.rating ? (
          <span className="flex items-center gap-1.5 text-xs text-warm-muted">
            <Star className="w-[13px] h-[13px] text-warm-star fill-current" aria-hidden="true" />
            {product.rating.toFixed(1)}
            {product.reviews_count ? <span className="text-warm-faint">({product.reviews_count})</span> : null}
          </span>
        ) : null}

        {/* Footer: price + icon add button */}
        <div className="flex items-end justify-between gap-2 mt-auto pt-1.5 min-w-0">
          <span className="min-w-0 font-display font-extrabold text-[15px] md:text-[18px] leading-tight text-warm-ink tabular-nums break-words">
            {formatPrice(product.price)}
            {product.original_price && discountPercentage > 0 && (
              <small className="block font-sans font-medium text-[11px] md:text-xs text-warm-faint line-through">
                {formatPrice(product.original_price)}
              </small>
            )}
          </span>

          <button
            onClick={() => { if (isOutOfStock) return; onAddToCart(product); }}
            disabled={isOutOfStock}
            aria-label={
              isOutOfStock
                ? 'Out of stock'
                : inCart
                ? `${product.name} is in your cart — add another`
                : product.is_preorder ? 'Pre-order item' : 'Add to cart'
            }
            title={inCart ? 'In your cart' : undefined}
            className={`w-9 h-9 md:w-10 md:h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
              isOutOfStock
                ? 'bg-warm-line text-warm-faint cursor-not-allowed'
                : inCart
                ? 'bg-warm-accent text-white hover:bg-warm-accentPress'
                : 'bg-warm-accentSoft text-warm-accent hover:bg-warm-accent hover:text-white'
            }`}
          >
            {inCart ? <Check className="w-4 h-4 md:w-[18px] md:h-[18px]" /> : <ShoppingCart className="w-4 h-4 md:w-[18px] md:h-[18px]" />}
          </button>
        </div>
      </div>
    </div>
  );
};

const Products = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const { addToCart } = useCart();
  const { toast } = useToast();
  const abortControllerRef = useRef<AbortController | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Memoized search parameters
  const searchState = useMemo(() => ({
    category: searchParams.get('category') || 'all',
    sortBy: searchParams.get('sort') || 'newest',
    page: parseInt(searchParams.get('page') || '1'),
    searchQuery: searchParams.get('search') || '',
  }), [searchParams]);

  useEffect(() => {
    setCurrentPage(searchState.page);
  }, [searchState.page]);

  // Generate cache key
  const generateCacheKey = useCallback((params: any) => {
    return JSON.stringify({
      ...params,
      priceMin: priceRange.min,
      priceMax: priceRange.max,
      page: currentPage
    });
  }, [priceRange, currentPage]);

  // Check if cache is valid
  const isCacheValid = useCallback((timestamp: number) => {
    return Date.now() - timestamp < CACHE_DURATION;
  }, []);

  const fetchCategories = useCallback(async () => {
    // Check cache first
    if (cache.categories && isCacheValid(cache.categoriesTimestamp)) {
      setCategories(cache.categories);
      setCategoriesLoading(false);
      return;
    }

    try {
      setCategoriesLoading(true);
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, slug')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      
      const allCategories = [{ id: 'all', name: 'All Categories', slug: 'all' }, ...(data || [])];
      
      // Update cache
      cache.categories = allCategories;
      cache.categoriesTimestamp = Date.now();
      
      setCategories(allCategories);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast({
        title: "Error",
        description: "Failed to load categories",
        variant: "destructive",
      });
    } finally {
      setCategoriesLoading(false);
    }
  }, [toast, isCacheValid]);

  const fetchProducts = useCallback(async () => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // Clear search timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Debounce search for better performance
    if (searchState.searchQuery) {
      searchTimeoutRef.current = setTimeout(() => {
        performFetch();
      }, 300);
      return;
    }

    performFetch();

    async function performFetch() {
      try {
        // Check cache first
        const cacheKey = generateCacheKey(searchState);
        const cachedData = cache.products.get(cacheKey);
        
        if (cachedData && isCacheValid(cachedData.timestamp)) {
          setProducts(cachedData.data);
          setTotalProducts(cachedData.count);
          setLoading(false);
          return;
        }

        setLoading(true);
        
        // Optimized query - select only needed fields
        let query = supabase
          .from('products')
          .select(`
            id,
            name,
            price,
            original_price,
            short_description,
            images,
            stock_quantity,
            rating,
            reviews_count,
            slug,
            view_count,
            is_preorder,
            preorder_availability_date,
            condition,
            categories(id, name, slug)
          `, { count: 'exact' })
          .eq('is_active', true);

        if (searchState.category && searchState.category !== 'all') {
          console.log('Filtering by category:', searchState.category);
          // First get the category ID for the given slug
          const { data: categoryData, error: categoryError } = await supabase
            .from('categories')
            .select('id, name, slug')
            .eq('slug', searchState.category)
            .eq('is_active', true)
            .single();
          
          if (categoryError) {
            console.error('Error fetching category:', categoryError);
          }
          
          if (categoryData) {
            console.log('Found category:', categoryData);
            query = query.eq('category_id', categoryData.id);
          } else {
            console.log('No category found for slug:', searchState.category);
          }
        }
        if (searchState.searchQuery) {
          query = query.ilike('name', `%${searchState.searchQuery}%`);
        }

        if (priceRange.min) {
          query = query.gte('price', parseInt(priceRange.min));
        }
        if (priceRange.max) {
          query = query.lte('price', parseInt(priceRange.max));
        }

        // Apply sorting
        switch (searchState.sortBy) {
          case 'price-low':
            query = query.order('price', { ascending: true });
            break;
          case 'price-high':
            query = query.order('price', { ascending: false });
            break;
          case 'rating':
            query = query.order('rating', { ascending: false });
            break;
          case 'popular':
            query = query.order('view_count', { ascending: false });
            break;
          case 'newest':
          default:
            query = query.order('created_at', { ascending: false });
            break;
        }

        // Get total count first for validation
        const { count: totalCount } = await query.abortSignal(abortController.signal);
        const totalAvailable = totalCount || 0;
        const maxPage = Math.max(1, Math.ceil(totalAvailable / PRODUCTS_PER_PAGE));
        
        // Ensure currentPage doesn't exceed available pages
        const validPage = Math.min(currentPage, maxPage);
        
        // If the current page is invalid, update it
        if (validPage !== currentPage) {
          setCurrentPage(validPage);
          const params = new URLSearchParams(searchParams);
          params.set('page', validPage.toString());
          setSearchParams(params);
          return;
        }

        const from = (validPage - 1) * PRODUCTS_PER_PAGE;
        const to = from + PRODUCTS_PER_PAGE - 1;
        
        // Only apply range if there are products to fetch
        if (totalAvailable > 0) {
          query = query.range(from, to);
        }

        const { data, error } = await query.abortSignal(abortController.signal);

        if (error) {
          if (error.name === 'AbortError') return;
          throw error;
        }

        const transformedProducts = data?.map((product: any) => ({
          id: product.id,
          name: product.name,
          price: product.price,
          original_price: product.original_price,
          description: product.short_description || '',
          short_description: product.short_description,
          images: product.images || [],
          category: product.categories?.slug || '',
          stock_quantity: product.stock_quantity || 0,
          rating: product.rating || 4.0,
          reviews_count: product.reviews_count || 0,
          slug: product.slug,
          view_count: product.view_count || 0,
          is_preorder: product.is_preorder || false,
          preorder_availability_date: product.preorder_availability_date,
          condition: product.condition,
        })) || [];

        // Synthesize ratings ONLY as a fallback. Real rating/reviews_count
        // values from the database must be preserved, not overwritten.
        const ratingsMap = generateProductRatings(transformedProducts);

        const productsWithRatings = transformedProducts.map(product => {
          const generated = ratingsMap.get(product.id);
          const hasRealRating = typeof product.rating === 'number' && product.rating > 0;
          return {
            ...product,
            rating: hasRealRating ? product.rating : generated?.rating ?? 4.0,
            reviews_count: hasRealRating
              ? product.reviews_count ?? generated?.reviews_count ?? 0
              : generated?.reviews_count ?? 50,
          };
        });

        // Update cache
        cache.products.set(cacheKey, {
          data: productsWithRatings,
          count: totalAvailable,
          timestamp: Date.now()
        });

        // Limit cache size (keep last 20 entries)
        if (cache.products.size > 20) {
          const firstKey = cache.products.keys().next().value;
          cache.products.delete(firstKey);
        }

        setProducts(productsWithRatings);
        setTotalProducts(totalAvailable);
      } catch (error: any) {
        if (error.name === 'AbortError') return;
        console.error('Error fetching products:', error);
        toast({
          title: "Error",
          description: "Failed to load products",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }
  }, [searchState, priceRange, currentPage, toast, searchParams, setSearchParams, generateCacheKey, isCacheValid]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    fetchProducts();
    
    // Cleanup on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [fetchProducts]);

  const handleAddToCart = useCallback((product: Product) => {
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      images: product.images || []
    });

    const actionText = product.is_preorder ? "Pre-ordered" : "Added to Cart";
    const descriptionText = product.is_preorder 
      ? `${product.name} has been added to your pre-orders`
      : `${product.name} has been added to your cart`;
    
    toast({
      title: actionText,
      description: descriptionText,
    });
  }, [addToCart, toast]);

  const handlePageChange = useCallback((newPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', newPage.toString());
    setSearchParams(params);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [searchParams, setSearchParams]);

  const handleSearchParamChange = useCallback((key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams);
    if (value && value !== 'all') {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete('page');
    setSearchParams(params);
  }, [searchParams, setSearchParams]);

  const clearFilters = useCallback(() => {
    setPriceRange({ min: '', max: '' });
    setSearchParams({});
  }, [setSearchParams]);

  // Memoized calculations
  const totalPages = useMemo(() => Math.ceil(totalProducts / PRODUCTS_PER_PAGE), [totalProducts]);
  
  const currentCategory = useMemo(() => {
    return searchState.category && searchState.category !== 'all' 
      ? categories.find(c => c.slug === searchState.category)?.name || 'Products'
      : 'All Products';
  }, [searchState.category, categories]);

  const renderPaginationItems = useCallback(() => {
    const items = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        items.push(
          <PaginationItem key={i}>
            <PaginationLink
              onClick={() => handlePageChange(i)}
              isActive={currentPage === i}
              className="cursor-pointer"
            >
              {i}
            </PaginationLink>
          </PaginationItem>
        );
      }
    } else {
      items.push(
        <PaginationItem key={1}>
          <PaginationLink
            onClick={() => handlePageChange(1)}
            isActive={currentPage === 1}
            className="cursor-pointer"
          >
            1
          </PaginationLink>
        </PaginationItem>
      );

      if (currentPage > 3) {
        items.push(<PaginationEllipsis key="ellipsis1" />);
      }

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        if (i !== 1 && i !== totalPages) {
          items.push(
            <PaginationItem key={i}>
              <PaginationLink
                onClick={() => handlePageChange(i)}
                isActive={currentPage === i}
                className="cursor-pointer"
              >
                {i}
              </PaginationLink>
            </PaginationItem>
          );
        }
      }

      if (currentPage < totalPages - 2) {
        items.push(<PaginationEllipsis key="ellipsis2" />);
      }

      if (totalPages > 1) {
        items.push(
          <PaginationItem key={totalPages}>
            <PaginationLink
              onClick={() => handlePageChange(totalPages)}
              isActive={currentPage === totalPages}
              className="cursor-pointer"
            >
              {totalPages}
            </PaginationLink>
          </PaginationItem>
        );
      }
    }

    return items;
  }, [totalPages, currentPage, handlePageChange]);

  if (loading && products.length === 0) {
    return (
      <div className="min-h-screen bg-warm-bg">
        <div className="container mx-auto px-4 py-6">
          <div className={
            viewMode === 'grid' 
              ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4" 
              : "space-y-4"
          }>
            {[...Array(12)].map((_, i) => (
              <ProductSkeleton key={i} viewMode={viewMode} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-warm-bg">
      {/* Header Section */}
      <div className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">
            {currentCategory}
          </h1>
          <p className="text-sm text-gray-600">
            {totalProducts} product{totalProducts !== 1 ? 's' : ''} found
            {loading && products.length > 0 && <span className="ml-2 text-warm-accent">Updating...</span>}
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar Filters */}
          <div className="lg:w-64 space-y-4">
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-3 text-sm">CATEGORY</h3>
              {categoriesLoading ? (
                <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
              ) : (
                <Select
                  value={searchState.category}
                  onValueChange={(value) => handleSearchParamChange('category', value)}
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.slug}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-3 text-sm">PRICE RANGE</h3>
              <div className="space-y-2">
                <Input
                  type="number"
                  placeholder="Min price"
                  value={priceRange.min}
                  onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value }))}
                  className="text-sm"
                  min="0"
                />
                <Input
                  type="number"
                  placeholder="Max price"
                  value={priceRange.max}
                  onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value }))}
                  className="text-sm"
                  min="0"
                />
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {/* Controls Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <Select
                value={searchState.sortBy}
                onValueChange={(value) => handleSearchParamChange('sort', value)}
              >
                <SelectTrigger className="w-48 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="popular">Most Popular</SelectItem>
                  <SelectItem value="price-low">Price: Low to High</SelectItem>
                  <SelectItem value="price-high">Price: High to Low</SelectItem>
                  <SelectItem value="rating">Highest Rated</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  aria-label="Grid view"
                >
                  <Grid className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  aria-label="List view"
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Products Grid/List */}
            <div className={
              viewMode === 'grid' 
                ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4" 
                : "space-y-4"
            }>
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  viewMode={viewMode}
                  onAddToCart={handleAddToCart}
                />
              ))}
            </div>

            {/* Loading indicator for pagination */}
            {loading && products.length > 0 && (
              <div className="mt-8 text-center">
                <div className="inline-flex items-center gap-2 text-warm-accent">
                  <div className="w-4 h-4 border-2 border-warm-accent border-t-transparent rounded-full animate-spin"></div>
                  Loading more products...
                </div>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
                        className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                    
                    {renderPaginationItems()}
                    
                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => currentPage < totalPages && handlePageChange(currentPage + 1)}
                        className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}

            {/* No Products Found */}
            {products.length === 0 && !loading && (
              <div className="text-center py-12 bg-white rounded-xl">
                <div className="text-gray-400 mb-4">
                  <Filter className="w-12 h-12 mx-auto" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No products found</h3>
                <p className="text-gray-600 mb-4">
                  Try adjusting your filters or search terms
                </p>
                <Button
                  onClick={clearFilters}
                  variant="outline"
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Products;