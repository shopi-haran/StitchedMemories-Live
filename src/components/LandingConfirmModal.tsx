import React from 'react';
import { createPortal } from 'react-dom';
import { X, Sparkles, ShieldCheck } from 'lucide-react';
import { useModalStack } from '../hooks/useModalStack';
import { LkrPriceDisplay } from './LkrPriceDisplay';

interface LandingConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: 'pro' | 'studio';
  period: 'monthly' | 'annual';
  planPrices: Record<string, { price_lkr: number; yearly_price_lkr: number | null }>;
  onConfirm: () => void;
}

export const LandingConfirmModal: React.FC<LandingConfirmModalProps> = ({
  isOpen,
  onClose,
  plan,
  period,
  planPrices,
  onConfirm,
}) => {
  const { zIndex, modalId } = useModalStack(isOpen, { onClose, id: 'landing-confirm-modal' });

  if (!isOpen || typeof document === 'undefined') return null;

  const planName = plan === 'pro' ? 'Pro Plan' : 'Studio Plan';
  const pricingData = planPrices[plan] || (plan === 'pro' ? { price_lkr: 2700, yearly_price_lkr: null } : { price_lkr: 5700, yearly_price_lkr: null });
  const isAnnual = period === 'annual';
  const amountLkr = isAnnual && pricingData.yearly_price_lkr ? pricingData.yearly_price_lkr : pricingData.price_lkr;

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
      style={{ zIndex }}
      data-modal-id={modalId}
    >
      <div
        className="w-full max-w-md bg-white border border-[#E8E1D2] rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden text-[#1D231E]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-[#6B7869] hover:text-[#1D231E] hover:bg-[#FAF6EE] transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-[#E06C38]/10 text-[#E06C38] flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#E06C38] bg-[#E06C38]/10 px-2 py-0.5 rounded-full border border-[#E06C38]/20">
              Confirm Upgrade
            </span>
            <h3 className="text-xl font-bold text-[#1D231E] mt-0.5">
              Confirm {planName}
            </h3>
          </div>
        </div>

        <div className="space-y-5">
          <div className="bg-[#FAF6EE] border border-[#E8E1D2] rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#5A6659]">Selected Plan</span>
              <span className="text-xs font-bold text-[#1D231E]">{planName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#5A6659]">Billing Period</span>
              <span className="text-xs font-bold text-[#1D231E] capitalize">{period}</span>
            </div>
            <div className="pt-2 border-t border-[#E8E1D2]">
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-xs font-bold text-[#5A6659]">Amount Charged Now</span>
                <LkrPriceDisplay
                  priceLkr={amountLkr}
                  layout="inline"
                  lkrClassName="text-base font-black text-[#1D231E]"
                  usdClassName="text-xs text-[#5A6659]"
                />
              </div>
              {isAnnual && (
                <div className="flex items-center justify-between text-[11px] text-[#6B7869] pt-1 border-t border-[#E8E1D2]/60">
                  <span>Per-month breakdown</span>
                  <LkrPriceDisplay
                    priceLkr={Math.round(amountLkr / 12)}
                    layout="inline"
                    lkrClassName="font-semibold text-[#1D231E]"
                    usdClassName="text-[10px] text-[#6B7869]"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2.5">
            <button
              type="button"
              onClick={onConfirm}
              className="w-full py-3.5 px-4 rounded-2xl font-bold text-xs bg-[#E06C38] hover:bg-[#d05c28] text-white shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Confirm and continue</span>
              <Sparkles className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 px-4 rounded-2xl font-bold text-xs bg-[#FAF6EE] hover:bg-[#F0EBE1] text-[#5A6659] border border-[#E8E1D2] transition-all cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
