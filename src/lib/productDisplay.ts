/**
 * Shared formatting and view-tracking helpers for product cards.
 *
 * These were previously redefined inside each screen that renders a
 * ProductCard, so a change to price formatting had to be made in several
 * places. New consumers should import from here.
 */

export const formatPrice = (price: number): string =>
  new Intl.NumberFormat('en-UG', {
    style: 'currency',
    currency: 'UGX',
    minimumFractionDigits: 0,
  }).format(price);

export const formatViewCount = (count: number): string =>
  count >= 1_000_000
    ? `${(count / 1_000_000).toFixed(1)}M`
    : count >= 1000
    ? `${(count / 1000).toFixed(1)}k`
    : String(count ?? 0);

export const getDiscountPercentage = (original: number, current: number): number =>
  Math.round(((original - current) / original) * 100);

export const formatAvailabilityDate = (dateString?: string): string | null =>
  dateString
    ? new Date(dateString).toLocaleDateString('en-UG', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null;

/**
 * Records a product view at most once per browser session.
 *
 * view_count is the only real demand signal the shop collects, and it now
 * drives which products get recommended — so it must count interested people,
 * not page refreshes.
 */
export const incrementProductView = async (productId: string): Promise<void> => {
  const viewedKey = `viewed-${productId}`;

  try {
    if (sessionStorage.getItem(viewedKey)) return;
  } catch {
    // Storage blocked (private mode). Skip the de-duplication rather than
    // losing the view entirely.
  }

  try {
    const { supabase } = await import('@/integrations/supabase/client');
    const { error } = await supabase.rpc('increment_product_view', { product_id: productId });
    if (error) throw error;
    try {
      sessionStorage.setItem(viewedKey, 'true');
    } catch {
      /* non-fatal */
    }
  } catch (error) {
    // A missed view count must never interrupt someone's shopping.
    console.warn('Could not record product view:', error);
  }
};
