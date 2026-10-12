import React from 'react';
import { getExchangeRate } from '../utils/currency';
import { useCurrency } from '../context/CurrencyContext';

interface LkrPriceDisplayProps {
  priceLkr: number;
  period?: React.ReactNode;
  layout?: 'stacked' | 'inline';
  lkrClassName?: string;
  usdClassName?: string;
  periodClassName?: string;
}

/**
 * Renders LKR-primary and USD-secondary price display.
 * Computes USD from the current usd_to_lkr_rate.
 */
export const LkrPriceDisplay: React.FC<LkrPriceDisplayProps> = ({
  priceLkr,
  period,
  layout = 'stacked',
  lkrClassName = 'text-3xl lg:text-4xl font-extrabold text-[#FAF6EE]',
  usdClassName = 'text-xs text-[#A5B3A2] font-normal',
  periodClassName = 'text-xs text-[#A5B3A2] font-medium',
}) => {
  let rate = 300;
  try {
    const cur = useCurrency();
    if (cur.rate && cur.rate > 0) rate = cur.rate;
  } catch {
    const cached = getExchangeRate();
    if (cached && cached > 0) rate = cached;
  }

  const usdAmount = priceLkr > 0 ? (priceLkr / rate).toFixed(2) : '0.00';
  const lkrFormatted = `LKR ${Number(priceLkr).toLocaleString('en-US')}`;
  const usdFormatted = `≈ $${usdAmount} USD`;

  if (layout === 'stacked') {
    return (
      <div className="inline-flex flex-col items-start">
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className={lkrClassName}>{lkrFormatted}</span>
          {period && <span className={periodClassName}>{period}</span>}
        </div>
        {priceLkr > 0 && (
          <span className={`mt-0.5 ${usdClassName}`}>
            ({usdFormatted})
          </span>
        )}
      </div>
    );
  }

  return (
    <span className="inline-flex items-baseline flex-wrap gap-x-1.5">
      <span className={lkrClassName}>{lkrFormatted}</span>
      {period && <span className={periodClassName}>{period}</span>}
      {priceLkr > 0 && <span className={usdClassName}>({usdFormatted})</span>}
    </span>
  );
};

export default LkrPriceDisplay;
