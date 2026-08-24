import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/** Everything ProductCard needs, so results can be rendered with it directly. */
const BASE_FIELDS = `
  id, name, price, original_price, description, short_description,
  images, stock_quantity, rating, reviews_count, slug, view_count,
  is_preorder, preorder_availability_date, condition
`;

const CARD_FIELDS = `${BASE_FIELDS}, categories(name, slug)`;

// `!inner` makes the category filter an actual join. Without it PostgREST
// returns every product and merely nulls out the embedded categories object
// for non-matches, which would pull the whole catalogue over the wire.
const CARD_FIELDS_IN_CATEGORY = `${BASE_FIELDS}, categories!inner(name, slug)`;

export interface RelatedProduct {
  id: string;
  name: string;
  price: number;
  original_price?: number;
  description: string;
  short_description?: string;
  images: string[];
  stock_quantity: number;
  rating?: number;
  reviews_count?: number;
  slug: string;
  view_count: number;
  is_preorder: boolean;
  preorder_availability_date?: string;
  condition?: 'new' | 'used' | 'like_new' | 'refurbished' | 'open_box';
  categories?: { name: string; slug: string };
}

export interface RelatedProductsResult {
  products: RelatedProduct[];
  /** Which heading to show — the list may be topped up from outside the category. */
  source: 'category' | 'popular';
}

/** How many cards the section aims to show. */
const TARGET = 6;
/** Below this, a same-category list looks broken, so it gets topped up. */
const MIN_FROM_CATEGORY = 4;

const normalise = (rows: any[]): RelatedProduct[] =>
  (rows ?? []).map((row) => ({
    ...row,
    images: row.images ?? [],
    view_count: row.view_count ?? 0,
    is_preorder: row.is_preorder ?? false,
    description: row.description ?? row.short_description ?? '',
    rating: row.rating ?? 4.0,
    reviews_count: row.reviews_count ?? 0,
  })) as RelatedProduct[];

/**
 * Sorts what a shopper is most likely to buy to the front.
 *
 * In-stock first: leading with something unavailable wastes the slot and
 * frustrates the customer. Within that, most-viewed first, because view_count
 * is the only genuine popularity signal the shop has.
 */
const rank = (products: RelatedProduct[]): RelatedProduct[] =>
  [...products].sort((a, b) => {
    const aAvailable = a.stock_quantity > 0 || a.is_preorder;
    const bAvailable = b.stock_quantity > 0 || b.is_preorder;
    if (aAvailable !== bAvailable) return aAvailable ? -1 : 1;
    return (b.view_count ?? 0) - (a.view_count ?? 0);
  });

/**
 * Products to show alongside the one being viewed.
 *
 * Prefers the same category, then tops up with the most-viewed products
 * elsewhere so the section is never empty or nearly empty — several categories
 * hold only one or two products, and those pages are otherwise dead ends.
 */
export const useRelatedProducts = (productId?: string, categorySlug?: string) => {
  const query = useQuery({
    queryKey: ['related-products', productId ?? 'none', categorySlug ?? 'none'],
    enabled: Boolean(productId),
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<RelatedProductsResult> => {
      let sameCategory: RelatedProduct[] = [];

      if (categorySlug) {
        const { data, error } = await supabase
          .from('products')
          .select(CARD_FIELDS_IN_CATEGORY)
          .eq('is_active', true)
          .neq('id', productId!)
          .eq('categories.slug', categorySlug)
          .order('view_count', { ascending: false })
          .limit(TARGET * 2);

        if (error) throw error;
        sameCategory = normalise(data);
      }

      const ranked = rank(sameCategory);

      if (ranked.length >= MIN_FROM_CATEGORY) {
        return { products: ranked.slice(0, TARGET), source: 'category' };
      }

      // Top up from the most-viewed products anywhere, skipping anything
      // already chosen and the product being viewed.
      const exclude = [productId!, ...ranked.map((p) => p.id)];
      const { data, error } = await supabase
        .from('products')
        .select(CARD_FIELDS)
        .eq('is_active', true)
        .not('id', 'in', `(${exclude.join(',')})`)
        .order('view_count', { ascending: false })
        .limit(TARGET);

      if (error) throw error;

      const combined = [...ranked, ...rank(normalise(data))].slice(0, TARGET);

      return {
        products: combined,
        // If nothing came from the category, do not claim it did.
        source: ranked.length > 0 ? 'category' : 'popular',
      };
    },
  });

  return {
    products: query.data?.products ?? [],
    source: query.data?.source ?? 'category',
    loading: query.isLoading,
    isError: query.isError,
  };
};
