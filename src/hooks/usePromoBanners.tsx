import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

// Admin-facing hook: reads ALL promo banners (active + inactive) from the
// table and exposes CRUD mutations. The storefront uses a separate, active-only
// query (see PromoBanners.tsx). Both share the ["promo-banners", ...] key
// namespace so a mutation here invalidates the storefront view too.
const BANNERS_KEY = ["promo-banners", "all"];

// Postgres timestamptz columns should get null (not empty string) when no date
// is provided, and numeric/boolean fields must be well-typed.
const sanitizeBannerData = (bannerData: any) => {
  const sanitized = { ...bannerData };

  if (!sanitized.start_date) sanitized.start_date = null;
  if (!sanitized.end_date) sanitized.end_date = null;

  if (sanitized.sort_order === '') sanitized.sort_order = 0;
  if (sanitized.sort_order !== undefined) sanitized.sort_order = Number(sanitized.sort_order) || 0;
  if (sanitized.is_active !== undefined) sanitized.is_active = Boolean(sanitized.is_active);

  return sanitized;
};

export const usePromoBanners = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: BANNERS_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('promo_banners')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Invalidate the whole promo-banners namespace so both the admin list and the
  // storefront carousel refetch.
  const invalidate = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ["promo-banners"] }),
    [queryClient]
  );

  const createBanner = useCallback(async (bannerData: any) => {
    try {
      const payload = sanitizeBannerData(bannerData);
      const { data, error } = await supabase
        .from('promo_banners')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;
      await invalidate();
      return data;
    } catch (err: any) {
      console.error('Error creating promo banner:', err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to create banner',
        variant: 'destructive',
      });
      throw err;
    }
  }, [invalidate, toast]);

  const updateBanner = useCallback(async (id: string, bannerData: any) => {
    try {
      const payload = sanitizeBannerData(bannerData);
      const { data, error } = await supabase
        .from('promo_banners')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      await invalidate();
      return data;
    } catch (err: any) {
      console.error('Error updating promo banner:', err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to update banner',
        variant: 'destructive',
      });
      throw err;
    }
  }, [invalidate, toast]);

  const deleteBanner = useCallback(async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('promo_banners')
        .delete()
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      await invalidate();
      return data;
    } catch (err: any) {
      console.error('Error deleting promo banner:', err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to delete banner',
        variant: 'destructive',
      });
      throw err;
    }
  }, [invalidate, toast]);

  const toggleBannerStatus = useCallback(async (id: string, isActive: boolean) => {
    try {
      const { data, error } = await supabase
        .from('promo_banners')
        .update({ is_active: isActive })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      await invalidate();
      return data;
    } catch (err: any) {
      console.error('Error toggling promo banner status:', err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to update banner status',
        variant: 'destructive',
      });
      throw err;
    }
  }, [invalidate, toast]);

  return {
    banners: query.data || [],
    loading: query.isLoading,
    error: query.isError ? (query.error as any)?.message || 'Failed to load promo banners' : null,
    refresh: query.refetch,
    createBanner,
    updateBanner,
    deleteBanner,
    toggleBannerStatus,
  };
};
