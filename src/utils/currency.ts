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
export function formatUsd(usdAmount: any): string {
  const num = Number(String(usdAmount ?? '').replace(/,/g, ''));
  const isNegative = num < 0;
  const abs = Math.abs(isNegative ? num : (isNaN(num) ? 0 : num));
  if (!isFinite(abs)) return '—';
  const formatted = abs.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return isNegative ? `-$${formatted}` : `$${formatted}`;
}

/**
 * Main dual-currency formatter:
 * Returns "$9.00 (≈ LKR 2,700.00)"
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

  const lkrVal = Math.round(num * effectiveRate);
  const lkrFormatted = formatLkr(lkrVal);
  const lkrPart = lkrFormatted === '—' ? 'LKR 0.00' : `LKR ${lkrFormatted}`;
  const approx = approxSymbol ? '≈ ' : '';
  return `${usdPart} (${approx}${lkrPart})`;
}

/**
 * Format a numeric/string LKR amount to standard string with thousand separators & 2 decimals
 * e.g. 7500 -> "LKR 7,500.00"
 */
export function formatLkrPrice(
  priceLkr: number | string | undefined | null,
  decimals: boolean = true
): string {
  const num = typeof priceLkr === 'number' ? priceLkr : parseFloat(String(priceLkr ?? 0));
  const valid = isNaN(num) ? 0 : num;
  const dec = decimals ? 2 : (Number.isInteger(valid) ? 0 : 2);
  return `LKR ${valid.toLocaleString('en-US', {
    minimumFractionDigits: dec,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Format secondary USD amount prefixed with "≈", e.g. 7500 LKR @ 300 rate -> "≈ $25.00"
 */
export function formatUsdEquivalent(
  priceLkr: number | string | undefined | null,
  rate?: number | null
): string {
  const num = typeof priceLkr === 'number' ? priceLkr : parseFloat(String(priceLkr ?? 0));
  const valid = isNaN(num) ? 0 : num;
  const effectiveRate = rate && rate > 0 ? rate : (cachedRate || 300);
  const usd = valid > 0 ? (valid / effectiveRate).toFixed(2) : '0.00';
  return `≈ $${usd}`;
}

/**
 * Combined LKR-primary string helper for orders:
 * Returns "LKR 7,500.00 (≈ $25.00)"
 */
export function formatOrderDualPrice(
  priceLkr: number | string | undefined | null,
  rate?: number | null
): string {
  return `${formatLkrPrice(priceLkr)} (${formatUsdEquivalent(priceLkr, rate)})`;
}

/**
 * Resolves a stored quote amount to LKR.
 * If the quote currency is 'LKR', the amount is already in LKR.
 * If the quote currency is missing or not 'LKR' (older legacy USD quote),
 * treats the amount as USD and converts to LKR on the fly using the exchange rate.
 */
export function resolveQuoteAmountToLkr(
  amount: number | string | undefined | null,
  currency?: string | null,
  rate?: number | null
): number {
  const num = typeof amount === 'number' ? amount : parseFloat(String(amount ?? 0));
  const valid = isNaN(num) ? 0 : num;
  if (currency === 'LKR') {
    return valid;
  }
  const effectiveRate = rate && rate > 0 ? rate : (cachedRate || 300);
  return Number((valid * effectiveRate).toFixed(2));
}

/**
 * Shared helper to check if balance is due for custom stitched orders (progress >= 100)
 */
export function isBalanceDue(order: any): boolean {
  if (!order) return false;
  const details = order.request_details || {};
  const pct = Number(order.progress_percent ?? details.progress_percent ?? 0);
  return pct >= 100;
}

/**
 * Robust shared LKR number formatter:
 * Converts input with Number(String(value).replace(/,/g, '')), returns "—" if not a finite number,
 * otherwise uses toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).
 */
export function formatLkr(value: any): string {
  const num = Number(String(value ?? '').replace(/,/g, ''));
  if (!isFinite(num)) return '—';
  return num.toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Robust shared USD number formatter:
 * Converts input with Number(String(value).replace(/,/g, '')), returns "—" if not a finite number,
 * otherwise uses toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).
 */
export function formatUsdNum(value: any): string {
  const num = Number(String(value ?? '').replace(/,/g, ''));
  if (!isFinite(num)) return '—';
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}



