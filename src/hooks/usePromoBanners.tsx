import { useState, useEffect, useCallback, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase, ensureConnection } from "@/integrations/supabase/client";

// Cache for promo banners
const promoBannersCache = {
  data: null,
  timestamp: null,
  loading: false,
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const isCacheValid = () => {
  return (
    promoBannersCache.data &&
    promoBannersCache.timestamp &&
    Date.now() - promoBannersCache.timestamp < CACHE_DURATION
  );
};

export const usePromoBanners = () => {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { toast } = useToast();
  
  const abortControllerRef = useRef(null);

  const fetchBanners = useCallback(async () => {
    // Check cache first
    if (isCacheValid()) {
      setBanners(promoBannersCache.data!);
      setLoading(false);
      return;
    }

    // Prevent multiple simultaneous requests
    if (promoBannersCache.loading) return;
    promoBannersCache.loading = true;

    // Cancel previous request if it exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setError(null);

    try {
      // Ensure Supabase connection is ready
      const isConnected = await ensureConnection();
      if (!isConnected) {
        throw new Error('Unable to connect to database');
      }
      
      const { data, error } = await supabase
        .from('promo_banners')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false })
        .abortSignal(abortControllerRef.current.signal);

      if (error) throw error;

      const transformedBanners = data || [];
      
      // Update cache
      promoBannersCache.data = transformedBanners;
      promoBannersCache.timestamp = Date.now();
      
      setBanners(transformedBanners);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return; // Request was cancelled
      }
      
      console.error("Error fetching promo banners:", err);
      setError(err.message || 'Failed to load promo banners');
      
      toast({
        title: "Error",
        description: "Failed to load promo banners",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      promoBannersCache.loading = false;
      abortControllerRef.current = null;
    }
  }, [toast]);

  useEffect(() => {
    fetchBanners();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchBanners]);

  // Helper to sanitize banner data before sending to DB
  const sanitizeBannerData = (bannerData: any) => {
    const sanitized = { ...bannerData };

    // Postgres timestamptz columns should get null (not empty string) when no date is provided
    if (!sanitized.start_date) sanitized.start_date = null;
    if (!sanitized.end_date) sanitized.end_date = null;

    // Ensure numeric and boolean fields are well-typed
    if (sanitized.sort_order === '') sanitized.sort_order = 0;
    if (sanitized.sort_order !== undefined) sanitized.sort_order = Number(sanitized.sort_order) || 0;
    if (sanitized.is_active !== undefined) sanitized.is_active = Boolean(sanitized.is_active);

    return sanitized;
  };

  // Create a new banner
  const createBanner = useCallback(async (bannerData: any) => {
    try {
      await ensureConnection();
      const payload = sanitizeBannerData(bannerData);
      const { data, error } = await supabase
        .from('promo_banners')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      // Invalidate cache and refresh
      promoBannersCache.data = null;
      promoBannersCache.timestamp = null;
      await fetchBanners();

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
  }, [fetchBanners, toast]);

  // Update an existing banner
  const updateBanner = useCallback(async (id: string, bannerData: any) => {
    try {
      await ensureConnection();
      const payload = sanitizeBannerData(bannerData);
      const { data, error } = await supabase
        .from('promo_banners')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      promoBannersCache.data = null;
      promoBannersCache.timestamp = null;
      await fetchBanners();

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
  }, [fetchBanners, toast]);

  // Delete a banner
  const deleteBanner = useCallback(async (id: string) => {
    try {
      await ensureConnection();
      const { data, error } = await supabase
        .from('promo_banners')
        .delete()
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      promoBannersCache.data = null;
      promoBannersCache.timestamp = null;
      await fetchBanners();

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
  }, [fetchBanners, toast]);

  // Toggle active status
  const toggleBannerStatus = useCallback(async (id: string, isActive: boolean) => {
    try {
      await ensureConnection();
      const { data, error } = await supabase
        .from('promo_banners')
        .update({ is_active: isActive })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      promoBannersCache.data = null;
      promoBannersCache.timestamp = null;
      await fetchBanners();

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
  }, [fetchBanners, toast]);

  return {
    banners,
    loading,
    error,
    refresh: fetchBanners,
    createBanner,
    updateBanner,
    deleteBanner,
    toggleBannerStatus,
  };
}; 