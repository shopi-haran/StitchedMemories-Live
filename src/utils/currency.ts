/**
 * Stitchara Shared Currency & Exchange Rate Utilities
 * 
 * Provides dual-currency (USD / LKR) formatting across the entire application:
 * - USD as the primary amount: e.g. "$9.00"
 * - LKR in parentheses: e.g. "(LKR 2,700)"
 * - Combined output: "$9.00 (LKR 2,700)"
 * - Graceful fallback: If exchange rate is not yet loaded, shows just "$9.00"
 */

const STORAGE_KEY = 'stitchara_usd_to_lkr_rate';

// In-memory cached rate for synchronous formatDualPrice calls
let cachedRate: number | null = (() => {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = parseFloat(saved);
        if (!isNaN(parsed) && parsed > 0) return parsed;
      }
    } catch {
      // Ignore storage errors
    }
  }
  return 300; // Sensible initial default while fetching from app_settings
})();

const listeners = new Set<(rate: number | null) => void>();

/**
 * Get current in-memory cached exchange rate
 */
export function getExchangeRate(): number | null {
  return cachedRate;
}

/**
 * Update the in-memory cache and notify any active listeners/hooks
 */
export function setExchangeRateCache(newRate: number | null): void {
  cachedRate = newRate;
  if (typeof window !== 'undefined') {
    try {
      if (newRate !== null && newRate > 0) {
        localStorage.setItem(STORAGE_KEY, String(newRate));
      }
    } catch {
      // Ignore storage errors
    }
    // Dispatch custom event for immediate multi-component synchronization
    window.dispatchEvent(new CustomEvent('stitchara:exchange-rate-updated', { detail: { rate: newRate } }));
  }
  listeners.forEach((listener) => {
    try {
      listener(newRate);
    } catch (e) {
      console.error('[currency] Listener error:', e);
    }
  });
}

/**
 * Subscribe to exchange rate changes
 */
export function subscribeToExchangeRate(listener: (rate: number | null) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Format USD amount to standard string with thousand separators & 2 decimals
 * e.g. 9 -> "$9.00", 1234.5 -> "$1,234.50", -10 -> "-$10.00"
 */
export function formatUsd(usdAmount: number): string {
  const isNegative = usdAmount < 0;
  const abs = Math.abs(usdAmount);
  const formatted = abs.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return isNegative ? `-$${formatted}` : `$${formatted}`;
}

/**
 * Format LKR amount to standard string with thousand separators & whole number
 * e.g. 2700 -> "LKR 2,700", -2700 -> "LKR -2,700"
 */
export function formatLkr(usdAmount: number, rate: number = cachedRate || 300): string {
  const lkrVal = Math.round(usdAmount * rate);
  const isNegative = lkrVal < 0;
  const abs = Math.abs(lkrVal);
  const formatted = abs.toLocaleString('en-US');
  return isNegative ? `LKR -${formatted}` : `LKR ${formatted}`;
}

/**
 * Main dual-currency formatter:
 * Returns "$9.00 (≈ LKR 2,700)"
 * Gracefully displays just "$9.00" if the exchange rate is not available.
 * 
 * @param usdAmount - Amount in USD (number or string representation)
 * @param overrideRate - Optional rate override; defaults to cachedRate
 * @param approxSymbol - Whether to prepend the approx symbol '≈ ' (defaults to true)
 */
export function formatDualPrice(
  usdAmount: number | string | undefined | null,
  overrideRate?: number | null,
  approxSymbol: boolean = true
): string {
  const num = typeof usdAmount === 'number' ? usdAmount : parseFloat(String(usdAmount ?? 0));
  if (isNaN(num)) return '$0.00';

  const usdPart = formatUsd(num);
  const effectiveRate = overrideRate !== undefined ? overrideRate : cachedRate;

  if (effectiveRate === null || effectiveRate <= 0) {
    return usdPart;
  }

  const lkrPart = formatLkr(num, effectiveRate);
  const approx = approxSymbol ? '≈ ' : '';
  return `${usdPart} (${approx}${lkrPart})`;
}
