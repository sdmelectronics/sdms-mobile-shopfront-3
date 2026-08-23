import { useState, useEffect, useCallback, useMemo, Suspense, lazy, memo, startTransition } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Star, ShoppingCart, ArrowLeft, Share2, Eye, Phone, Zap, ImageIcon, VideoIcon, Truck, ShieldCheck, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useCart } from '@/hooks/useCart';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getProductRating, generateSingleProductRating } from '@/lib/ratingUtils';
import { CallMenu } from '@/components/CallMenu';
import { WHATSAPP_URL } from '@/lib/contact';

// Lazy load heavy components with preload
const SpecificationsCard = lazy(() => 
  import('./SpecificationsCard').then(module => ({ default: module.SpecificationsCard }))
);

// Preload SpecificationsCard on user interaction
const preloadSpecifications = () => {
  const componentImport = () => import('./SpecificationsCard');
  componentImport();
};
interface Product {
  id: string;
  name: string;
  price: number;
  original_price?: number;
  description: string;
  short_description?: string;
  images: string[];
  video_url?: string;
  features?: string[];
  specifications?: Record<string, any>;
  stock_quantity: number;
  rating?: number;
  reviews_count?: number;
  slug: string;
  sku?: string;
  view_count?: number;
  is_preorder?: boolean;
  preorder_availability_date?: string;
  condition?: 'new' | 'used' | 'like_new' | 'refurbished' | 'open_box';
  categories?: {
    name: string;
    slug: string;
  }
}

interface MediaItem {
  type: 'image' | 'video';
  src: string;
  alt: string;
}

// Optimized image component with lazy loading and blur placeholder
const OptimizedImage = memo(({ 
  src, 
  alt, 
  className, 
  onLoad, 
  onError,
  sizes,
  priority = false 
}: {
  src: string;
  alt: string;
  className?: string;
  onLoad?: () => void;
  onError?: () => void;
  sizes?: string;
  priority?: boolean;
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setHasError(true);
    onError?.();
  }, [onError]);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse" />
      )}
      <img
        src={hasError ? '/placeholder.svg' : src}
        alt={alt}
        className={`transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'} ${className}`}
        onLoad={handleLoad}
        onError={handleError}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        sizes={sizes}
      />
    </div>
  );
});

// Media thumbnail component with intersection observer
const MediaThumbnail = memo(({ 
  type, 
  src, 
  alt, 
  isSelected, 
  onClick,
  index 
}: {
  type: 'image' | 'video';
  src: string;
  alt: string;
  isSelected: boolean;
  onClick: () => void;
  index: number;
}) => {
  const [isVisible, setIsVisible] = useState(index < 4); // Load first 4 immediately

  useEffect(() => {
    if (isVisible || index < 4) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '50px' }
    );

    const element = document.querySelector(`[data-thumbnail="${index}"]`);
    if (element) observer.observe(element);

    return () => observer.disconnect();
  }, [index, isVisible]);

  return (
    <button
      data-thumbnail={index}
      onClick={onClick}
      className={`relative aspect-square overflow-hidden rounded border-2 transition-all duration-200 hover:opacity-80 ${
        isSelected ? 'border-warm-accent ring-2 ring-warm-accent/30' : 'border-warm-line hover:border-warm-line2'
      }`}
      aria-label={`View ${type}: ${alt}`}
    >
      {isVisible ? (
        type === 'video' ? (
          <>
            <video
              src={src}
              className="w-full h-full object-cover"
              preload="none"
              muted
              aria-hidden="true"
            />
            <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
              <VideoIcon className="w-6 h-6 text-white" />
            </div>
          </>
        ) : (
          <>
            <OptimizedImage
              src={src}
              alt={alt}
              className="w-full h-full object-cover"
              sizes="(max-width: 640px) 25vw, 15vw"
            />
            <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-10 transition-all duration-200 flex items-center justify-center">
              <ImageIcon className="w-6 h-6 text-white opacity-0 hover:opacity-100 transition-opacity duration-200" />
            </div>
          </>
        )
      ) : (
        <div className="w-full h-full bg-gray-200 animate-pulse" />
      )}
    </button>
  );
});

// Memoized stock status component
const StockStatus = memo(({ product }: { product: Product }) => {
  const stockInfo = useMemo(() => {
    if (product.is_preorder) {
      return {
        icon: <Zap className="w-3 h-3" />,
        text: product.preorder_availability_date
          ? `Pre-order - Available ${new Date(product.preorder_availability_date).toLocaleDateString('en-UG', { month: 'short', day: 'numeric', year: 'numeric' })}`
          : 'Pre-order Available',
        className: 'text-warm-accent',
      };
    }

    if (product.stock_quantity > 0) {
      return {
        icon: <div className="w-3 h-3 bg-green-500 rounded-full" />,
        text: product.stock_quantity < 10 ? `Only ${product.stock_quantity} left!` : 'In Stock',
        className: 'text-green-600',
      };
    }

    return {
      icon: <div className="w-3 h-3 bg-red-500 rounded-full" />,
      text: 'Out of Stock',
      className: 'text-red-600',
    };
  }, [product.stock_quantity, product.is_preorder, product.preorder_availability_date]);

  return (
    <div className="flex items-center gap-2">
      {stockInfo.icon}
      <span className={`font-medium ${stockInfo.className}`}>{stockInfo.text}</span>
    </div>
  );
});

// Memoized rating component
const RatingDisplay = memo(({ rating, reviewsCount }: { rating: number; reviewsCount: number }) => (
  <div className="flex items-center gap-2">
    <div className="flex" role="img" aria-label={`Rating: ${rating} out of 5 stars`}>
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={`w-5 h-5 ${i < Math.floor(rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
        />
      ))}
    </div>
    <span className="text-sm text-gray-600">
      {rating.toFixed(1)} ({reviewsCount} review{reviewsCount !== 1 ? 's' : ''})
    </span>
  </div>
));

// Optimized loading skeleton
const ProductSkeleton = memo(() => (
  <div className="container mx-auto px-4 py-8">
    <div className="h-10 w-24 mb-6 bg-gray-200 rounded animate-pulse" />
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="space-y-4">
        <div className="aspect-square rounded-lg bg-gray-200 animate-pulse" />
        <div className="grid grid-cols-4 gap-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="aspect-square rounded bg-gray-200 animate-pulse" />
          ))}
        </div>
      </div>
      <div className="space-y-4">
        <div className="h-8 w-3/4 bg-gray-200 rounded animate-pulse" />
        <div className="h-4 w-1/2 bg-gray-200 rounded animate-pulse" />
        <div className="h-6 w-1/4 bg-gray-200 rounded animate-pulse" />
        <div className="h-20 w-full bg-gray-200 rounded animate-pulse" />
        <div className="flex gap-4">
          <div className="h-12 flex-1 bg-gray-200 rounded animate-pulse" />
          <div className="h-12 w-12 bg-gray-200 rounded animate-pulse" />
          <div className="h-12 w-12 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
    </div>
  </div>
));

export default function ProductDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMedia, setSelectedMedia] = useState<number | 'video'>(0);
  const [imageLoading, setImageLoading] = useState(true);
  const { addToCart } = useCart();
  const { toast } = useToast();

  // Optimized format functions with memoization
  const formatPrice = useMemo(
    () => (price: number) =>
      new Intl.NumberFormat('en-UG', { 
        style: 'currency', 
        currency: 'UGX', 
        minimumFractionDigits: 0 
      }).format(price),
    []
  );

  const formatViewCount = useMemo(
    () => (count: number) => {
      if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
      if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
      return count.toString();
    },
    []
  );

  // Memoized calculations
  const discountPercentage = useMemo(
    () => (product?.original_price && product.original_price > product.price
      ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
      : 0),
    [product?.original_price, product?.price]
  );

  const mediaItems = useMemo<MediaItem[]>(() => {
    if (!product) return [];
    const items: MediaItem[] = [];
    if (product.video_url) items.push({ type: 'video', src: product.video_url, alt: `${product.name} video` });
    product.images?.forEach((image, index) =>
      items.push({ type: 'image', src: image, alt: `${product.name} image ${index + 1}` })
    );
    return items;
  }, [product?.video_url, product?.images, product?.name]);

  // Debounced view count increment
  const incrementViewCount = useCallback(async (productId: string) => {
    const viewedKey = `viewed-${productId}`;
    if (sessionStorage.getItem(viewedKey)) return;

    try {
      // Use startTransition for non-urgent update
      startTransition(() => {
        supabase.rpc('increment_product_view', { product_id: productId }).then(({ error }) => {
          if (!error) {
            sessionStorage.setItem(viewedKey, 'true');
            setProduct((prev) => (prev ? { ...prev, view_count: (prev.view_count || 0) + 1 } : null));
          }
        });
      });
    } catch (error) {
      console.error('Failed to increment view count:', error);
    }
  }, []);

  // Optimized fetch with better caching strategy
  const fetchProduct = useCallback(async (productSlug: string) => {
    const cacheKey = `product-${productSlug}`;
    const cacheTimeKey = `product-${productSlug}-time`;
    const cacheDuration = 1000 * 60 * 5; // Reduced to 5 minutes for fresher data

    // Check cache first
    const cachedData = localStorage.getItem(cacheKey);
    const cacheTime = localStorage.getItem(cacheTimeKey);

    if (cachedData && cacheTime && Date.now() - parseInt(cacheTime) < cacheDuration) {
      const parsedData = JSON.parse(cachedData);
      setProduct(parsedData);
      setLoading(false);
      incrementViewCount(parsedData.id);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select(`
          id, name, price, original_price, description, short_description,
          images, video_url, features, specifications, stock_quantity,
          rating, reviews_count, slug, sku, view_count, is_preorder,
          preorder_availability_date, condition,
          categories(name, slug)
        `)
        .eq('slug', productSlug)
        .eq('is_active', true)
        // LEFT join (not !inner) so uncategorized products still load, and
        // maybeSingle() returns null for 0 rows instead of throwing a 406.
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        toast({
          title: 'Product not found',
          description: 'This product is no longer available.',
          variant: 'destructive',
        });
        navigate('/products');
        return;
      }

      {
        // Get or generate rating for this product
        let rating = getProductRating(data.id);
        if (!rating) {
          rating = generateSingleProductRating();
        }

        const productData: Product = {
          ...data,
          specifications: typeof data.specifications === 'string' 
            ? JSON.parse(data.specifications) 
            : data.specifications,
          rating: rating.rating,
          reviews_count: rating.reviews_count,
          view_count: data.view_count || 0,
          images: data.images || [],
          is_preorder: data.is_preorder || false,
          categories: (Array.isArray(data.categories) ? data.categories[0] : data.categories) || { name: '', slug: '' },
        };

        setProduct(productData);
        
        // Cache the data
        try {
          localStorage.setItem(cacheKey, JSON.stringify(productData));
          localStorage.setItem(cacheTimeKey, Date.now().toString());
        } catch (e) {
          // Handle localStorage errors silently
        }
        
        incrementViewCount(data.id);
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      toast({
        title: 'Error',
        description: 'Product not found',
        variant: 'destructive',
      });
      navigate('/products');
    } finally {
      setLoading(false);
    }
  }, [incrementViewCount, toast, navigate]);

  useEffect(() => {
    if (slug) fetchProduct(slug);
  }, [slug, fetchProduct]);

  useEffect(() => {
    if (product) {
      setSelectedMedia(product.video_url ? 'video' : 0);
      // Preload specifications component on mount
      preloadSpecifications();
    }
  }, [product]);

  const handleAddToCart = useCallback(() => {
    if (!product) return;
    addToCart({ 
      id: product.id, 
      name: product.name, 
      price: product.price, 
      images: product.images 
    });
    toast({
      title: product.is_preorder ? 'Pre-ordered' : 'Added to Cart',
      description: product.is_preorder
        ? `${product.name} has been added to your pre-orders`
        : `${product.name} has been added to your cart`,
    });
  }, [product, addToCart, toast]);

  const handleShare = useCallback(async () => {
    if (!product) return;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.name,
          text: product.short_description || product.description,
          url: window.location.href,
        });
      } catch (error) {
        // Silently handle share cancellation
      }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href);
        toast({
          title: 'Link Copied',
          description: 'Product link has been copied to clipboard',
        });
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to copy link to clipboard',
          variant: 'destructive',
        });
      }
    }
  }, [product, toast]);

  const handleMediaSelect = useCallback((index: number | 'video') => {
    startTransition(() => {
      setSelectedMedia(index);
      setImageLoading(true);
    });
  }, []);

  if (loading) return <ProductSkeleton />;

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Product Not Found</h1>
          <Button onClick={() => navigate('/products')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Products
          </Button>
        </div>
      </div>
    );
  }

  const currentMedia = selectedMedia === 'video'
    ? { type: 'video' as const, src: product.video_url!, alt: `${product.name} video` }
    : { type: 'image' as const, src: product.images?.[selectedMedia as number] || '/placeholder.svg', alt: product.name };

  const isOutOfStock = product.stock_quantity === 0 && !product.is_preorder;

  return (
    <div className="container mx-auto px-4 pt-8 pb-40 md:pb-8">
      <nav className="mb-6" aria-label="Breadcrumb">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-2">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        {product.categories && (
          <div className="text-sm text-gray-500">
            <span>Products</span> / <span>{product.categories.name}</span> / <span className="text-gray-900">{product.name}</span>
          </div>
        )}
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="aspect-square overflow-hidden rounded-lg bg-gray-100 relative" aria-describedby={`product-desc-${product.id}`}>
            {imageLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-warm-accent"></div>
              </div>
            )}
            {currentMedia.type === 'video' ? (
              <video
                controls
                loop
                muted
                className="w-full h-full object-cover"
                src={currentMedia.src}
                onLoadedData={() => setImageLoading(false)}
                poster={product.images?.[0]}
                preload="metadata"
              >
                Your browser does not support the video tag.
              </video>
            ) : (
              <OptimizedImage
                src={currentMedia.src}
                alt={currentMedia.alt}
                className="w-full h-full object-cover"
                onLoad={() => setImageLoading(false)}
                onError={() => setImageLoading(false)}
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority={true}
              />
            )}
            <div className="absolute top-4 right-4">
              <div className="bg-black bg-opacity-70 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2">
                <Eye className="w-4 h-4" />
                {formatViewCount(product.view_count || 0)} views
              </div>
            </div>
            {discountPercentage > 0 && (
              <div className="absolute top-4 left-4">
                <Badge className="bg-warm-accent text-white">-{discountPercentage}%</Badge>
              </div>
            )}
            {product.is_preorder && (
              <div className="absolute bottom-4 left-4">
                <Badge className="bg-warm-accent text-white">
                  <Zap className="w-3 h-3 mr-1" />
                  PRE-ORDER
                </Badge>
              </div>
            )}
          </div>
          <div className="grid grid-cols-4 gap-2">
            {mediaItems.map((media, index) => (
              <MediaThumbnail
                key={`${media.type}-${index}`}
                type={media.type}
                src={media.src}
                alt={media.alt}
                index={index}
                isSelected={
                  media.type === 'video' ? selectedMedia === 'video' : selectedMedia === (product.video_url ? index - 1 : index)
                }
                onClick={() => handleMediaSelect(media.type === 'video' ? 'video' : product.video_url ? index - 1 : index)}
              />
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {product.categories && <Badge variant="outline">{product.categories.name}</Badge>}
                {product.condition && (
                  <Badge className="bg-warm-accentSoft text-warm-accent text-xs px-2 py-1 font-semibold">
                    {product.condition === 'like_new' ? 'LIKE NEW' :
                     product.condition === 'open_box' ? 'OPEN BOX' :
                     product.condition.toUpperCase()}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Eye className="w-4 h-4" />
                {formatViewCount(product.view_count || 0)} views
              </div>
            </div>
            <h1 id={`product-desc-${product.id}`} className="font-display text-2xl md:text-3xl font-bold text-warm-ink leading-tight mb-2">
              {product.name}
            </h1>
            {product.sku && <p className="text-sm text-gray-500">SKU: {product.sku}</p>}
          </div>
          
          <RatingDisplay rating={product.rating || 4.0} reviewsCount={product.reviews_count || 0} />
          
          <div className="space-y-2">
            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="font-display text-3xl font-extrabold text-warm-ink tabular-nums">{formatPrice(product.price)}</span>
              {product.original_price && discountPercentage > 0 && (
                <>
                  <span className="text-lg text-warm-faint line-through">{formatPrice(product.original_price)}</span>
                  <span className="text-xs font-bold text-warm-accent bg-warm-accentSoft px-2.5 py-1 rounded-full">Save {discountPercentage}%</span>
                </>
              )}
            </div>
          </div>
          
          <StockStatus product={product} />
          
          <div>
            <h3 className="text-lg font-semibold mb-2">Description</h3>
            <p className="text-gray-600 leading-relaxed">{product.description || product.short_description}</p>
          </div>
          
          {product.features && product.features.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-2">Features</h3>
              <ul className="list-disc list-inside space-y-1 text-gray-600">
                {product.features.map((feature, index) => (
                  <li key={index}>{feature}</li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Trust row — old-design (free delivery / genuine warranty / WhatsApp) */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="flex flex-col items-center text-center gap-1.5 rounded-xl border border-warm-line bg-warm-bg px-2 py-3">
              <Truck className="w-[18px] h-[18px] text-warm-accent" />
              <span className="text-[11px] font-semibold text-warm-ink leading-tight">
                Free delivery<br /><span className="font-normal text-warm-faint">within Kampala</span>
              </span>
            </div>
            <div className="flex flex-col items-center text-center gap-1.5 rounded-xl border border-warm-line bg-warm-bg px-2 py-3">
              <ShieldCheck className="w-[18px] h-[18px] text-warm-accent" />
              <span className="text-[11px] font-semibold text-warm-ink leading-tight">
                Genuine<br /><span className="font-normal text-warm-faint">warranty</span>
              </span>
            </div>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center text-center gap-1.5 rounded-xl border border-warm-line bg-warm-bg px-2 py-3 hover:border-warm-accent/40 transition-colors"
            >
              <MessageCircle className="w-[18px] h-[18px] text-[#25D366]" />
              <span className="text-[11px] font-semibold text-warm-ink leading-tight">
                Order via<br /><span className="font-normal text-warm-faint">WhatsApp</span>
              </span>
            </a>
          </div>

          {/* CTA — sticky bottom bar on mobile (above the tab bar), inline on desktop */}
          <div className="fixed bottom-[66px] left-0 right-0 z-30 flex gap-3 items-center bg-warm-surface border-t border-warm-line px-4 py-3 shadow-[0_-2px_20px_rgba(80,55,35,0.10)] md:static md:bottom-auto md:z-auto md:px-0 md:py-0 md:border-0 md:bg-transparent md:shadow-none">
            <CallMenu side="top" align="start" className="flex-shrink-0">
              <Button size="lg" aria-label="Call to order" className="bg-warm-ok hover:opacity-90 text-white px-4">
                <Phone className="w-5 h-5" />
              </Button>
            </CallMenu>
            <Button
              onClick={handleAddToCart}
              className="flex-1 bg-warm-accent hover:bg-warm-accentPress text-white"
              size="lg"
              disabled={isOutOfStock}
              aria-label={isOutOfStock ? 'Out of Stock' : product.is_preorder ? `Pre-order ${product.name}` : `Add ${product.name} to cart`}
            >
              <ShoppingCart className="w-5 h-5 mr-2" />
              {isOutOfStock ? 'Out of Stock' : product.is_preorder ? 'Pre-order Now' : 'Add to Cart'}
            </Button>
            <Button variant="outline" size="lg" onClick={handleShare} aria-label="Share product" className="flex-shrink-0">
              <Share2 className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
      
      {product.specifications && Object.keys(product.specifications).length > 0 && (
        <Suspense fallback={<div className="mt-8 h-40 w-full bg-gray-200 rounded animate-pulse" />}>
          <SpecificationsCard specifications={product.specifications} />
        </Suspense>
      )}
    </div>
  );
}