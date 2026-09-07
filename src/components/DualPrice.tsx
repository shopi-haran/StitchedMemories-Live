import React from 'react';
import { formatUsd, formatLkr, getExchangeRate } from '../utils/currency';
import { useCurrency } from '../context/CurrencyContext';

export interface DualPriceProps {
  amount: number | string | undefined | null;
  overrideRate?: number | null;
  period?: React.ReactNode;
  suffix?: React.ReactNode;
  prefix?: React.ReactNode;
  layout?: 'inline' | 'stacked' | 'auto';
  className?: string;
  usdClassName?: string;
  lkrClassName?: string;
  periodClassName?: string;
  approx?: boolean;
  showLkr?: boolean;
}

export const DualPrice: React.FC<DualPriceProps> = ({
  amount,
  overrideRate,
  period,
  suffix,
  prefix,
  layout = 'inline',
  className = '',
  usdClassName = '',
  lkrClassName = '',
  periodClassName = '',
  approx = true,
  showLkr = true,
}) => {
  let contextRate: number | null = null;
  try {
    const currency = useCurrency();
    contextRate = currency.rate;
  } catch {
    contextRate = getExchangeRate();
  }

  const num = typeof amount === 'number' ? amount : parseFloat(String(amount ?? 0));
  const validNum = isNaN(num) ? 0 : num;
  const effectiveRate = overrideRate !== undefined && overrideRate !== null ? overrideRate : contextRate;

  const usdText = formatUsd(validNum);
  const hasLkr = showLkr && effectiveRate !== null && effectiveRate !== undefined && effectiveRate > 0;
  const lkrRaw = hasLkr ? formatLkr(validNum, effectiveRate) : null;
  const lkrText = lkrRaw ? (approx ? `≈ ${lkrRaw}` : lkrRaw) : null;

  if (layout === 'stacked') {
    return (
      <div className={`inline-flex flex-col items-start ${className}`}>
        <div className="flex items-baseline gap-1 flex-wrap">
          {prefix && <span className={usdClassName}>{prefix}</span>}
          <span className={usdClassName || 'font-bold'}>{usdText}</span>
          {period && <span className={periodClassName || 'text-xs opacity-75 font-medium ml-0.5'}>{period}</span>}
          {suffix && <span className={periodClassName || 'text-xs opacity-75 font-medium ml-1'}>{suffix}</span>}
        </div>
        {lkrText && (
          <span className={`text-[0.75em] leading-tight font-normal opacity-70 tracking-tight mt-0.5 ${lkrClassName}`}>
            {lkrText}
          </span>
        )}
      </div>
    );
  }

  // Inline layout
  return (
    <span className={`inline-flex items-baseline flex-wrap gap-x-1.5 gap-y-0.5 ${className}`}>
      <span className="inline-flex items-baseline gap-0.5">
        {prefix && <span className={usdClassName}>{prefix}</span>}
        <span className={usdClassName || 'font-bold'}>{usdText}</span>
        {period && <span className={periodClassName || 'text-xs opacity-75 font-medium ml-0.5'}>{period}</span>}
      </span>
      {lkrText && (
        <span className={`text-[0.8em] font-normal opacity-65 tracking-tight whitespace-nowrap ${lkrClassName}`}>
          ({lkrText})
        </span>
      )}
      {suffix && <span className={periodClassName || 'text-xs opacity-75 font-medium ml-1'}>{suffix}</span>}
    </span>
  );
};

export default DualPrice;
