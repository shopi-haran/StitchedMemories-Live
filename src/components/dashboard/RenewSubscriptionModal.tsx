import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Sparkles, Calendar } from 'lucide-react';
import { useModalStack } from '../../hooks/useModalStack';
import { LkrPriceDisplay } from '../LkrPriceDisplay';
import { fetchSubscriptionPlans } from '../../lib/supabase';
import { PaymentGatewayModal } from '../PaymentGatewayModal';

interface RenewSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTier?: 'pro' | 'studio';
  user: { id?: string; name: string; email: string; avatar_url?: string } | null;
  onSuccess: (newAccessUntil: string) => void;
  refreshProfile: () => Promise<void>;
}

export const RenewSubscriptionModal: React.FC<RenewSubscriptionModalProps> = ({
  isOpen,
  onClose,
  defaultTier = 'pro',
  user,
  onSuccess,
  refreshProfile,
}) => {
  const { zIndex, modalId } = useModalStack(isOpen, { onClose, id: 'renew-subscription-modal' });
  const [tier, setTier] = useState<'pro' | 'studio'>(defaultTier);
  const [period, setPeriod] = useState<'monthly' | 'annual'>('monthly');
  const [planPrices, setPlanPrices] = useState<Record<string, { price_lkr: number; yearly_price_lkr: number | null }>>({
    pro: { price_lkr: 2700, yearly_price_lkr: null },
    studio: { price_lkr: 5700, yearly_price_lkr: null },
  });
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTier(defaultTier === 'studio' ? 'studio' : 'pro');
      setPeriod('monthly');
      let active = true;
      async function loadPrices() {
        try {
          const rows = await fetchSubscriptionPlans();
          if (active && rows.length > 0) {
            const map: Record<string, { price_lkr: number; yearly_price_lkr: number | null }> = {};
            rows.forEach((r) => {
              if (r.tier) {
                const key = r.tier.toLowerCase().trim();
                const priceMonthly = Number(r.price_lkr ?? (key === 'pro' ? 2700 : 5700));
                const priceYearly = r.yearly_price_lkr != null ? Number(r.yearly_price_lkr) : null;
                map[key] = {
                  price_lkr: priceMonthly,
                  yearly_price_lkr: priceYearly,
                };
              }
            });
            setPlanPrices((prev) => ({ ...prev, ...map }));
          }
        } catch (e) {
          console.warn('[RenewSubscriptionModal] Error loading plan prices:', e);
        }
      }
      loadPrices();
      return () => {
        active = false;
      };
    }
  }, [isOpen, defaultTier]);

  if (!isOpen || typeof document === 'undefined') return null;

  const currentPlanPricing = planPrices[tier] || { price_lkr: tier === 'pro' ? 2700 : 5700, yearly_price_lkr: null };
  const hasYearly = currentPlanPricing.yearly_price_lkr != null && currentPlanPricing.yearly_price_lkr > 0;
  const activePriceLkr = period === 'annual' && hasYearly ? currentPlanPricing.yearly_price_lkr! : currentPlanPricing.price_lkr;

  const daysToAdd = period === 'annual' ? 365 : 30;
  const accessUntilDate = new Date(Date.now() + daysToAdd * 86400000);
  const formattedAccessDate = accessUntilDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const handleContinueToPayment = () => {
    setIsPaymentOpen(true);
  };

  const handlePaymentSuccess = async () => {
    await refreshProfile();
    setIsPaymentOpen(false);
    onSuccess(formattedAccessDate);
    onClose();
  };

  return (
    <>
      <div
        className="fixed inset-0 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
        style={{ zIndex }}
        data-modal-id={modalId}
      >
        <div
          className="w-full max-w-md bg-white border border-[#E8E1D2] rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden text-[#1D231E]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full text-[#6B7869] hover:text-[#1D231E] hover:bg-[#FAF6EE] transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-2xl bg-[#E06C38]/10 text-[#E06C38] flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#E06C38] bg-[#E06C38]/10 px-2 py-0.5 rounded-full border border-[#E06C38]/20">
                Subscription Renewal
              </span>
              <h3 className="text-xl font-bold text-[#1D231E] mt-0.5">
                Renew Your Subscription
              </h3>
            </div>
          </div>

          <div className="space-y-5">
            {/* 1. Package Selection */}
            <div>
              <label className="block text-xs font-bold text-[#3A4538] mb-1.5">
                Choose Package
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTier('pro')}
                  className={`py-2.5 px-4 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    tier === 'pro'
                      ? 'bg-[#1D231E] text-white border-[#1D231E] shadow-sm'
                      : 'bg-[#FAF6EE] text-[#5A6659] border-[#D5CDBC] hover:border-[#1D231E]'
                  }`}
                >
                  Pro Crafter
                </button>
                <button
                  type="button"
                  onClick={() => setTier('studio')}
                  className={`py-2.5 px-4 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    tier === 'studio'
                      ? 'bg-[#1D231E] text-white border-[#1D231E] shadow-sm'
                      : 'bg-[#FAF6EE] text-[#5A6659] border-[#D5CDBC] hover:border-[#1D231E]'
                  }`}
                >
                  Studio Plan
                </button>
              </div>
            </div>

            {/* 2. Period Selection */}
            <div>
              <label className="block text-xs font-bold text-[#3A4538] mb-1.5">
                Billing Period
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPeriod('monthly')}
                  className={`py-2.5 px-4 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    period === 'monthly'
                      ? 'bg-[#1D231E] text-white border-[#1D231E] shadow-sm'
                      : 'bg-[#FAF6EE] text-[#5A6659] border-[#D5CDBC] hover:border-[#1D231E]'
                  }`}
                >
                  Monthly
                </button>
                {hasYearly && (
                  <button
                    type="button"
                    onClick={() => setPeriod('annual')}
                    className={`py-2.5 px-4 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      period === 'annual'
                        ? 'bg-[#1D231E] text-white border-[#1D231E] shadow-sm'
                        : 'bg-[#FAF6EE] text-[#5A6659] border-[#D5CDBC] hover:border-[#1D231E]'
                    }`}
                  >
                    Annual (Save 20%)
                  </button>
                )}
              </div>
            </div>

            {/* 3. Summary & Charge Details Card */}
            <div className="bg-[#FAF6EE] border border-[#E8E1D2] rounded-2xl p-4 space-y-2.5 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-[#E8E1D2]">
                <span className="text-[#6B7869]">Amount Charged Now</span>
                <div className="text-right">
                  <LkrPriceDisplay
                    priceLkr={activePriceLkr}
                    layout="inline"
                    lkrClassName="font-bold text-[#1D231E]"
                    usdClassName="text-xs text-[#6B7869]"
                  />
                </div>
              </div>

              {period === 'annual' && hasYearly && (
                <div className="flex items-center justify-between pb-2 border-b border-[#E8E1D2]">
                  <span className="text-[#6B7869]">Per-Month Breakdown</span>
                  <div className="text-right">
                    <LkrPriceDisplay
                      priceLkr={Math.round(activePriceLkr / 12)}
                      layout="inline"
                      lkrClassName="font-semibold text-[#1D231E]"
                      usdClassName="text-[11px] text-[#6B7869]"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <span className="text-[#6B7869] flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#E06C38]" />
                  <span>Access Until</span>
                </span>
                <span className="font-bold text-[#1D231E]">{formattedAccessDate}</span>
              </div>
            </div>

            {/* 4. Continue to Payment Button */}
            <button
              type="button"
              onClick={handleContinueToPayment}
              className="w-full py-3 bg-[#E06C38] hover:bg-[#d05c28] text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Continue to Payment</span>
            </button>
          </div>
        </div>
      </div>

      {/* Payment Gateway Modal for Renewal Checkout */}
      {isPaymentOpen && (
        <PaymentGatewayModal
          isOpen={isPaymentOpen}
          onClose={() => setIsPaymentOpen(false)}
          plan={tier}
          billingCycle={period}
          user={user}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}
    </>
  );
};
