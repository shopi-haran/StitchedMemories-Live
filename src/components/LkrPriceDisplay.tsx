import React from 'react';
import { getExchangeRate, formatLkrPrice, formatUsdEquivalent, formatOrderDualPrice, resolveQuoteAmountToLkr } from '../utils/currency';
import { useCurrency } from '../context/CurrencyContext';

export { formatLkrPrice, formatUsdEquivalent, formatOrderDualPrice, resolveQuoteAmountToLkr };

export interface LkrPriceDisplayProps {
  priceLkr: number | string | undefined | null;
  period?: React.ReactNode;
  layout?: 'stacked' | 'inline';
  lkrClassName?: string;
  usdClassName?: string;
  periodClassName?: string;
  showDecimals?: boolean;
  wrapInParens?: boolean;
}

/**
 * Renders LKR as primary amount (bold, e.g. "LKR 7,500.00")
 * and USD as secondary amount (muted, smaller, prefixed with "≈", e.g. "≈ $24.50")
 * computed on the fly as LKR ÷ usd_to_lkr_rate from app_settings / context.
 */
export const LkrPriceDisplay: React.FC<LkrPriceDisplayProps> = ({
  priceLkr,
  period,
  layout = 'stacked',
  lkrClassName,
  usdClassName,
  periodClassName = 'text-xs text-[#A5B3A2] font-medium',
  showDecimals = true,
  wrapInParens = false,
}) => {
  let rate = 300;
  try {
    const cur = useCurrency();
    if (cur.rate && cur.rate > 0) rate = cur.rate;
  } catch {
    const cached = getExchangeRate();
    if (cached && cached > 0) rate = cached;
  }

  const num = typeof priceLkr === 'number' ? priceLkr : parseFloat(String(priceLkr ?? 0));
  const validNum = isNaN(num) ? 0 : num;

  const defaultLkrClass = layout === 'stacked'
    ? 'text-3xl lg:text-4xl font-extrabold text-[#FAF6EE]'
    : 'font-bold text-[#1D231E]';
  const defaultUsdClass = layout === 'stacked'
    ? 'text-xs text-[#A5B3A2] font-normal'
    : 'text-xs text-[#5A6659] font-normal';

  const finalLkrClass = lkrClassName !== undefined ? lkrClassName : defaultLkrClass;
  const finalUsdClass = usdClassName !== undefined ? usdClassName : defaultUsdClass;
  const shouldWrap = wrapInParens;

  const lkrFormatted = formatLkrPrice(validNum, showDecimals);
  const rawUsdFormatted = formatUsdEquivalent(validNum, rate);
  const usdFormatted = shouldWrap ? `(${rawUsdFormatted})` : rawUsdFormatted;

  if (layout === 'stacked') {
    return (
      <div className="inline-flex flex-col items-start">
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className={finalLkrClass}>{lkrFormatted}</span>
          {period && <span className={periodClassName}>{period}</span>}
        </div>
        {validNum > 0 && (
          <span className={`mt-0.5 ${finalUsdClass}`}>
            {usdFormatted}
          </span>
        )}
      </div>
    );
  }

  return (
    <span className="inline-flex items-baseline flex-wrap gap-x-1.5">
      <span className={finalLkrClass}>{lkrFormatted}</span>
      {period && <span className={periodClassName}>{period}</span>}
      {validNum > 0 && <span className={finalUsdClass}>{usdFormatted}</span>}
    </span>
  );
};

export default LkrPriceDisplay;

