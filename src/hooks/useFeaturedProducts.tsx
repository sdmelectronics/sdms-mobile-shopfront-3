import { useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { generateProductRatings } from "@/lib/ratingUtils";

const PAGE_SIZE = 6;

const fetchFeaturedPage = async (offset: number) => {
  const { data, error } = await supabase
    .from("products")
    .select(`
      id, name, price, original_price, short_description,
      images, stock_quantity, rating, reviews_count, slug, view_count,
      is_preorder, preorder_availability_date, condition,
      categories(name, slug)
    `)
    .eq("is_active", true)
    .eq("is_featured", true)
    .range(offset, offset + PAGE_SIZE - 1)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const transformedProducts = (data || []).map((product: any) => ({
    ...product,
    description: product.short_description || "",
    images: product.images || [],
    view_count: product.view_count || 0,
    is_preorder: product.is_preorder || false,
    condition: product.condition,
  }));

  // Synthesize ratings ONLY as a fallback. Real rating/reviews_count values
  // coming from the database must be preserved, not overwritten.
  const ratingsMap = generateProductRatings(transformedProducts);

  return transformedProducts.map((product: any) => {
    const generated = ratingsMap.get(product.id);
    const hasRealRating = typeof product.rating === "number" && product.rating > 0;
    return {
      ...product,
      rating: hasRealRating ? product.rating : generated?.rating ?? 4.0,
      reviews_count: hasRealRating
        ? product.reviews_count ?? generated?.reviews_count ?? 0
        : generated?.reviews_count ?? 50,
    };
  });
};

export const useFeaturedProducts = () => {
  const query = useInfiniteQuery({
    queryKey: ["featured-products"],
    queryFn: ({ pageParam }) => fetchFeaturedPage(pageParam),
    initialPageParam: 0,
    // If the last page came back full, there may be more; the next offset is
    // simply the number of items already loaded.
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === PAGE_SIZE ? allPages.length * PAGE_SIZE : undefined,
    staleTime: 5 * 60 * 1000,
  });

  const products = query.data?.pages.flat() ?? [];

  return {
    products,
    loading: query.isLoading,
    loadingMore: query.isFetchingNextPage,
    hasMore: query.hasNextPage ?? false,
    error: query.isError
      ? (query.error as any)?.message || "Failed to load products"
      : null,
    loadMore: () => {
      if (query.hasNextPage && !query.isFetchingNextPage) {
        query.fetchNextPage();
      }
    },
    refresh: () => query.refetch(),
  };
};
