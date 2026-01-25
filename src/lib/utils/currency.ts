// Currency formatting utilities
// KHR (Khmer Riel) is the PRIMARY display currency

const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

/**
 * Format USD cents to display string
 * @param cents Amount in cents
 * @returns Formatted string like "$2.50"
 */
export function formatUSD(cents: number): string {
  return usdFormatter.format(cents / 100);
}

/**
 * Format KHR amount to display string
 * @param riels Amount in riels
 * @returns Formatted string like "៛10,250"
 */
export function formatKHR(riels: number): string {
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(Math.round(riels));
  return `៛${formatted}`;
}

/**
 * Convert USD cents to KHR riels
 * @param usdCents Amount in USD cents
 * @param exchangeRate KHR per 1 USD (e.g., 4000)
 * @returns Amount in KHR riels (rounded)
 */
export function usdToKHR(usdCents: number, exchangeRate: number): number {
  return Math.round((usdCents / 100) * exchangeRate);
}

/**
 * Format both currencies for display - KHR PRIMARY
 * @param usdCents Amount in USD cents
 * @param exchangeRate KHR per 1 USD
 * @returns Object with formatted strings for both currencies
 */
export function formatDualCurrency(usdCents: number, exchangeRate: number): { khr: string; usd: string } {
  const khrAmount = usdToKHR(usdCents, exchangeRate);
  return {
    khr: formatKHR(khrAmount),
    usd: formatUSD(usdCents)
  };
}

/**
 * Parse a decimal USD string to cents
 * @param input User input like "2.50"
 * @returns Amount in cents (250)
 */
export function parseUSDToCents(input: string): number {
  const num = parseFloat(input);
  if (isNaN(num)) return 0;
  return Math.round(num * 100);
}

/**
 * Format exchange rate for display
 * @param rate KHR per 1 USD
 * @returns Formatted string like "1 USD = ៛4,100"
 */
export function formatExchangeRate(rate: number): string {
  const formatted = new Intl.NumberFormat('en-US').format(rate);
  return `1 USD = ៛${formatted}`;
}
