import React from 'react';
import { LkrPriceDisplay } from './LkrPriceDisplay';

export interface DualPriceProps {
  amount?: number | string | undefined | null;
  priceLkr?: number | string | undefined | null;
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
  showDecimals?: boolean;
  wrapInParens?: boolean;
}

/**
 * Standard Stitchara Money Formatter / Dual-Price Component
 * Renders LKR as primary amount (bold, thousands separators, 2 decimals, e.g. "LKR 23,340.00")
 * and USD as secondary amount (muted, smaller, e.g. "≈ $77.80") computed on the fly.
 */
export const DualPrice: React.FC<DualPriceProps> = ({
  amount,
  priceLkr,
  period,
  suffix,
  prefix,
  layout = 'inline',
  className = '',
  usdClassName = 'text-xs text-[#5A6659] font-normal',
  lkrClassName = 'font-bold text-[#1D231E]',
  periodClassName = 'text-xs text-[#A5B3A2] font-medium',
  showDecimals = true,
  wrapInParens = false,
}) => {
  const targetPrice = priceLkr !== undefined ? priceLkr : amount;

  return (
    <span className={`inline-flex items-baseline ${className}`}>
      {prefix && <span className="mr-1">{prefix}</span>}
      <LkrPriceDisplay
        priceLkr={targetPrice}
        period={period || suffix}
        layout={layout === 'stacked' ? 'stacked' : 'inline'}
        lkrClassName={lkrClassName}
        usdClassName={usdClassName}
        periodClassName={periodClassName}
        showDecimals={showDecimals}
        wrapInParens={wrapInParens}
      />
    </span>
  );
};

export default DualPrice;
