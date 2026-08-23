import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Single source of truth for the active category list.
 *
 * This used to be fetched independently in three places (the homepage tiles,
 * the bottom nav drawer, and the products page), each with its own hand-rolled
 * module-level cache and none with a retry. On a flaky connection they could
 * disagree with each other, and any one of them that failed stayed empty until
 * the user reloaded the page.
 *
 * React Query gives all callers one in-flight request, one cache, and the
 * retry/backoff policy configured in App.tsx.
 */
export interface Category {
  id: string;
  name: string;
  slug: string;
  image_url?: string | null;
  is_active: boolean | null;
  count?: number | null;
}

export const CATEGORIES_QUERY_KEY = ["categories", "active"] as const;

const fetchActiveCategories = async (): Promise<Category[]> => {
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug, image_url, is_active, count")
    .eq("is_active", true)
    .order("name");

  if (error) throw error;

  return (data ?? []) as Category[];
};

export const useActiveCategories = () => {
  const query = useQuery({
    queryKey: CATEGORIES_QUERY_KEY,
    queryFn: fetchActiveCategories,
    // Categories change rarely; don't re-request them on every mount.
    staleTime: 10 * 60 * 1000,
  });

  return {
    categories: query.data ?? [],
    loading: query.isLoading,
    isError: query.isError,
    error: query.isError ? (query.error as Error)?.message ?? "Failed to load categories" : null,
    refetch: query.refetch,
  };
};
