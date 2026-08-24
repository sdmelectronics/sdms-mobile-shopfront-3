/** Shop currency formatting, in one place so totals read the same everywhere. */

export const formatUGX = (value: number | null | undefined): string => {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return 'USh 0';
  return `USh ${Math.round(amount).toLocaleString('en-UG')}`;
};

/**
 * Margin as a percentage of revenue.
 *
 * Returns null rather than 0 when cost is unknown — an unknown margin and a
 * zero margin mean very different things, and showing "0%" for a product whose
 * cost was never entered would quietly understate profit across every report.
 */
export const marginPercent = (revenue: number, cost: number | null | undefined): number | null => {
  if (cost === null || cost === undefined) return null;
  if (!revenue) return null;
  return ((revenue - cost) / revenue) * 100;
};
