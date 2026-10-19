import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Sparkles, 
  Check, 
  Zap, 
  Shield, 
  Image, 
  Percent, 
  RefreshCw, 
  Calculator, 
  Sliders,
  Crown,
  ArrowRight,
  HeartHandshake,
  Loader2,
  AlertCircle,
  RotateCcw,
  CheckCircle2
} from 'lucide-react';
import { useModalStack } from '../hooks/useModalStack';
import { LkrPriceDisplay } from './LkrPriceDisplay';
import { useAuth } from '../context/AuthContext';
import { supabase, fetchUserProfile, updateUserPlanSelection, fetchSubscriptionPlans } from '../lib/supabase';
import { startPayHereCheckout, PAYHERE_NOTIFY_URL } from '../lib/payhere';

export interface UpgradePlanModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onSelectPlan: (plan: 'free' | 'pro' | 'studio', billingCycle: 'monthly' | 'annual') => void;
  currentTier?: string;
  mode?: 'upgrade' | 'onboarding';
  targetPlan?: 'studio' | null;
}

export const UpgradePlanModal: React.FC<UpgradePlanModalProps> = ({
  isOpen,
  onClose,
  onSelectPlan,
  currentTier = 'free',
  mode = 'upgrade',
  targetPlan = null,
}) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationPendingMsg, setVerificationPendingMsg] = useState<string | null>(null);
  const [selectedPlanInProgress, setSelectedPlanInProgress] = useState<'pro' | 'studio' | null>(null);
  const [paymentError, setPaymentError] = useState<{
    type: 'dismissed' | 'error';
    message: string;
    plan: 'pro' | 'studio';
  } | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const [planPrices, setPlanPrices] = useState<Record<string, { price_lkr: number; yearly_price_lkr: number | null }>>({
    pro: { price_lkr: 2700, yearly_price_lkr: null },
    studio: { price_lkr: 5700, yearly_price_lkr: null },
  });

  const hasAnnual = Boolean(
    (planPrices.pro?.yearly_price_lkr != null && planPrices.pro.yearly_price_lkr > 0) ||
    (planPrices.studio?.yearly_price_lkr != null && planPrices.studio.yearly_price_lkr > 0)
  );

  useEffect(() => {
    if (!hasAnnual && billingCycle === 'annual') {
      setBillingCycle('monthly');
    }
  }, [hasAnnual]);

  const { user, isLoggedIn, refreshProfile } = useAuth();
  const { zIndex, modalId } = useModalStack(isOpen, { onClose, id: 'upgrade-plan-modal' });

  // Fetch prices from database
  useEffect(() => {
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
        console.warn('[UpgradePlanModal] Error loading subscription plans:', e);
      }
    }
    if (isOpen) {
      loadPrices();
    }
    return () => {
      active = false;
    };
  }, [isOpen]);

  const proMonthlyLkr = planPrices.pro?.price_lkr ?? 2700;
  const proYearlyLkr = planPrices.pro?.yearly_price_lkr ?? null;
  const studioMonthlyLkr = planPrices.studio?.price_lkr ?? 5700;
  const studioYearlyLkr = planPrices.studio?.yearly_price_lkr ?? null;

  if (!isOpen || typeof document === 'undefined') return null;

  const isOnboarding = mode === 'onboarding';
  const isStudioOnly = targetPlan === 'studio';
  const normalizedTier = (currentTier || 'free').toLowerCase();

  const showFree = isOnboarding && !isStudioOnly;
  const showPro = !isStudioOnly && (isOnboarding || normalizedTier === 'free');
  const showStudio = isStudioOnly || isOnboarding || normalizedTier === 'free' || normalizedTier === 'pro';

  const modalMaxWidth = isOnboarding && !isStudioOnly
    ? 'max-w-6xl' 
    : showPro 
      ? 'max-w-4xl' 
      : 'max-w-xl';

  const handleFreePlan = async () => {
    if (!isLoggedIn || !user) {
      onSelectPlan('free', billingCycle);
      return;
    }

    try {
      if (isOnboarding || user.has_selected_plan === false) {
        await updateUserPlanSelection(user.id, user.email, true);
      }
      await refreshProfile();
      if (onClose) onClose();
    } catch (err) {
      console.error('Error selecting free plan:', err);
      onSelectPlan('free', billingCycle);
    }
  };

  const handleSubscribe = async (plan: 'pro' | 'studio') => {
    if (!isLoggedIn || !user) {
      onSelectPlan(plan, billingCycle);
      return;
    }

    setIsProcessingPayment(true);
    setSelectedPlanInProgress(plan);
    setPaymentError(null);
    setVerificationPendingMsg(null);

    try {
      // 1. Call create-payhere-hash with exactly { kind: 'subscription', tier, period }
      const { data, error } = await supabase.functions.invoke('create-payhere-hash', {
        body: {
          kind: 'subscription',
          tier: plan,
          period: hasAnnual && billingCycle === 'annual' ? 'yearly' : 'monthly',
        },
      });

      // If the create-payhere-hash call returns an error or a non-2xx response,
      // or the response is missing hash, merchant_id, order_id, amount or currency,
      // do NOT start the PayHere checkout. Close loading state and show a clear error message.
      if (
        error ||
        !data ||
        !data.hash ||
        !data.merchant_id ||
        !data.order_id ||
        !data.amount ||
        !data.currency
      ) {
        let errorPayload = error || data;
        if (error && typeof error === 'object' && 'context' in error && error.context instanceof Response) {
          try {
            const errJson = await error.context.clone().json();
            errorPayload = { status: error.context.status, body: errJson, error };
          } catch {
            errorPayload = { status: error.context.status, error };
          }
        }
        console.error('[create-payhere-hash error response]:', errorPayload);
        setIsProcessingPayment(false);
        setSelectedPlanInProgress(null);
        setPaymentError({
          type: 'error',
          message: 'Could not start payment, please try again',
          plan,
        });
        return;
      }

      const nameParts = (user.name || 'Crafter Member').trim().split(/\s+/);
      const firstName = nameParts[0] || 'Crafter';
      const lastName = nameParts.slice(1).join(' ') || 'Member';

      // 2. Open PayHere checkout using returned merchant_id, order_id, amount, currency, and hash exactly as given
      await startPayHereCheckout(
        {
          sandbox: true,
          merchant_id: String(data.merchant_id),
          order_id: String(data.order_id),
          items: `StitchedMemories ${plan === 'pro' ? 'Pro Crafter' : 'Studio'} Membership (${billingCycle})`,
          amount: String(data.amount),
          currency: String(data.currency),
          hash: String(data.hash),
          first_name: firstName,
          last_name: lastName,
          email: user.email,
          phone: '0771234567',
          address: 'Digital Crafter Membership',
          city: 'Colombo',
          country: 'Sri Lanka',
          return_url: window.location.href,
          cancel_url: window.location.href,
          notify_url: PAYHERE_NOTIFY_URL,
        },
        {
          onCompleted: async (completedOrderId) => {
            console.log('[UpgradePlanModal] PayHere onCompleted:', completedOrderId);
            setIsVerifying(true);
            setIsProcessingPayment(true);
            setPaymentError(null);
            setVerificationPendingMsg(null);

            // Poll/refetch the user's profile every 2 seconds for up to 30 seconds
            // until subscription_status is 'active' and subscription_tier matches the purchased tier
            const pollIntervalMs = 2000;
            const maxAttempts = 15; // 15 * 2s = 30 seconds
            let confirmed = false;

            for (let attempt = 0; attempt < maxAttempts; attempt++) {
              await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
              try {
                const latestProfile = await fetchUserProfile(user.id);
                const currentTier = (latestProfile?.subscription_tier || '').toLowerCase();
                const currentStatus = (latestProfile?.subscription_status || '').toLowerCase();

                if (currentStatus === 'active' && (currentTier === plan || (plan === 'pro' && currentTier === 'studio'))) {
                  confirmed = true;
                  await refreshProfile();
                  break;
                }
              } catch (pollErr) {
                console.warn('[UpgradePlanModal] Error polling profile:', pollErr);
              }
            }

            setIsVerifying(false);
            if (confirmed) {
              setIsSuccess(true);
              await refreshProfile();
              window.dispatchEvent(new CustomEvent('tierChanged'));
              setTimeout(() => {
                setIsProcessingPayment(false);
                setSelectedPlanInProgress(null);
                if (onClose) onClose();
              }, 1200);
            } else {
              setIsProcessingPayment(false);
              setSelectedPlanInProgress(null);
              setVerificationPendingMsg(
                'Payment not confirmed yet, check your dashboard shortly'
              );
            }
          },
          onDismissed: () => {
            console.log('[UpgradePlanModal] PayHere onDismissed');
            // Close checkout without changing state or showing success
            setIsProcessingPayment(false);
            setSelectedPlanInProgress(null);
            setIsVerifying(false);
            setVerificationPendingMsg(null);
          },
          onError: (error) => {
            console.error('[UpgradePlanModal] PayHere onError:', error);
            // Close checkout without changing state or showing success
            setIsProcessingPayment(false);
            setSelectedPlanInProgress(null);
            setIsVerifying(false);
            setVerificationPendingMsg(null);
          },
        }
      );
    } catch (err: any) {
      console.error('[create-payhere-hash error response]:', err);
      setIsProcessingPayment(false);
      setSelectedPlanInProgress(null);
      setPaymentError({
        type: 'error',
        message: 'Could not start payment, please try again',
        plan,
      });
    }
  };

  const proPriceLkr = planPrices.pro ?? 2700;
  const studioPriceLkr = planPrices.studio ?? 5700;

  return createPortal(
    <div 
      data-modal-overlay="true"
      data-modal-id={modalId}
      style={{ zIndex }}
      className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 md:p-6 animate-fadeIn"
      onClick={() => {
        if (!isProcessingPayment && onClose) {
          onClose();
        }
      }}
    >
      <div 
        className={`relative w-full ${modalMaxWidth} max-h-[90vh] bg-[#FAF6EE] rounded-3xl shadow-2xl border border-[#E8E1D2] overflow-hidden flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 sm:px-8 sm:py-6 border-b border-[#E8E1D2] flex items-center justify-between bg-white shrink-0 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#E06C38]/10 text-[#E06C38] flex items-center justify-center shadow-xs">
              {isOnboarding ? <Sparkles className="w-5 h-5" /> : <Crown className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-bold text-[#1D231E]">
                  {isOnboarding 
                    ? 'Choose Your StitchedMemories Plan' 
                    : isStudioOnly 
                      ? 'Upgrade to Studio Membership' 
                      : 'Upgrade Your Membership'}
                </h3>
                {!isOnboarding && !isStudioOnly && (
                  <span className="px-2.5 py-0.5 rounded-full bg-[#FAF6EE] border border-[#D5CDBC] text-[10px] font-bold uppercase text-[#5A6659]">
                    Current: {normalizedTier === 'pro' ? 'Pro Crafter' : 'Free Plan'}
                  </span>
                )}
                {isStudioOnly && (
                  <span className="px-2.5 py-0.5 rounded-full bg-[#E06C38]/10 border border-[#E06C38]/20 text-[10px] font-extrabold uppercase text-[#E06C38]">
                    15% Custom Order Discount
                  </span>
                )}
                {isOnboarding && (
                  <span className="px-2.5 py-0.5 rounded-full bg-[#E06C38]/10 border border-[#E06C38]/20 text-[10px] font-extrabold uppercase text-[#E06C38]">
                    Welcome Setup
                  </span>
                )}
              </div>
              <p className="text-xs text-[#6B7869] mt-0.5">
                {isOnboarding
                  ? 'Select a plan to complete your account setup. You can start with Free or choose Pro/Studio.'
                  : isStudioOnly
                    ? 'Get 15% off all custom kits and heirlooms, live image/color editing, and unlimited thread palettes.'
                    : normalizedTier === 'pro'
                      ? 'Upgrade to Studio for advanced color editing and 15% storewide discounts.'
                      : 'Choose the plan that matches your cross-stitch aspirations.'}
              </p>
            </div>
          </div>

          {/* Close button */}
          {onClose && (
            <button
              onClick={onClose}
              disabled={isProcessingPayment}
              className="p-2 text-[#6B7869] hover:text-[#1D231E] hover:bg-[#E8E1D2]/60 rounded-full transition-colors cursor-pointer disabled:opacity-50"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Modal Scrollable Body */}
        <div data-modal-scroll="true" className="p-6 sm:p-8 overflow-y-auto flex-1 overscroll-contain space-y-6">
          
          {/* Payment Feedback Banner */}
          {paymentError && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900 animate-fadeIn">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-[#1D231E]">Payment Issue</p>
                  <p className="text-[#5A6659] mt-0.5">{paymentError.message}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setPaymentError(null)}
                  className="px-3 py-1.5 rounded-lg border border-[#D5CDBC] text-xs font-semibold text-[#5A6659] hover:bg-white transition-colors cursor-pointer"
                >
                  Dismiss
                </button>
                <button
                  type="button"
                  onClick={() => handleSubscribe(paymentError.plan)}
                  disabled={isProcessingPayment}
                  className="px-4 py-1.5 rounded-lg bg-[#E06C38] hover:bg-[#d05c28] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Retry Checkout</span>
                </button>
              </div>
            </div>
          )}

          {isVerifying && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-center gap-3 text-xs text-blue-900 animate-fadeIn">
              <Loader2 className="w-5 h-5 text-blue-600 shrink-0 animate-spin" />
              <div>
                <p className="font-bold">Confirming payment...</p>
                <p className="text-blue-700">Waiting for webhook verification. Please wait a moment.</p>
              </div>
            </div>
          )}

          {verificationPendingMsg && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900 animate-fadeIn">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-[#1D231E]">Payment Notice</p>
                  <p className="text-[#5A6659] mt-0.5">{verificationPendingMsg}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setVerificationPendingMsg(null);
                    if (onClose) onClose();
                  }}
                  className="px-3 py-1.5 rounded-lg border border-[#D5CDBC] text-xs font-semibold text-[#5A6659] hover:bg-white transition-colors cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await refreshProfile();
                    if (onClose) onClose();
                  }}
                  className="px-4 py-1.5 rounded-lg bg-[#1D231E] hover:bg-[#323D34] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh Now</span>
                </button>
              </div>
            </div>
          )}

          {isSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-xs text-emerald-900 animate-fadeIn">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <p className="font-bold">Subscription Activated!</p>
                <p className="text-emerald-700">Thank you for joining. Updating your dashboard...</p>
              </div>
            </div>
          )}

          {/* Billing Cycle Toggle */}
          {hasAnnual && (
            <div className="flex justify-center">
              <div className="inline-flex items-center gap-2 bg-white p-1 rounded-full border border-[#E2DAD0] shadow-xs">
                <button
                  type="button"
                  onClick={() => setBillingCycle('monthly')}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    billingCycle === 'monthly'
                      ? 'bg-[#E06C38] text-white shadow-xs'
                      : 'text-[#5A6659] hover:text-[#1D231E]'
                  }`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle('annual')}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    billingCycle === 'annual'
                      ? 'bg-[#E06C38] text-white shadow-xs'
                      : 'text-[#5A6659] hover:text-[#1D231E]'
                  }`}
                >
                  <span>Annual</span>
                  <span className="bg-[#1D231E] text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-full">
                    Save 20%
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Cards Grid */}
          <div className={`grid gap-6 items-stretch ${
            isOnboarding
              ? 'grid-cols-1 lg:grid-cols-3'
              : showPro
                ? 'grid-cols-1 md:grid-cols-2'
                : 'grid-cols-1 max-w-lg mx-auto'
          }`}>
            
            {/* 1. Free Plan Card (Shown in Onboarding mode) */}
            {showFree && (
              <div className="bg-[#1D231E] border border-[#323D34] rounded-3xl p-6 flex flex-col justify-between shadow-xl relative overflow-hidden group">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#A5B3A2] bg-[#262F27] px-3 py-1 rounded-full border border-[#3A473C]">
                      Free Crafter
                    </span>
                    <span className="text-[10px] bg-white/10 text-[#C5D3C2] font-semibold px-2 py-0.5 rounded-full">
                      Starter
                    </span>
                  </div>
                  <h4 className="text-xl font-bold text-[#FAF6EE] mb-1">Free Plan</h4>
                  <p className="text-xs text-[#A5B3A2] leading-relaxed mb-5">
                    Essential pattern creation tools to start your stitching journey.
                  </p>
                  <div className="mb-5 pb-5 border-b border-[#323D34]">
                    <LkrPriceDisplay
                      priceLkr={0}
                      period="/ forever"
                      layout="stacked"
                      lkrClassName="text-2xl sm:text-3xl font-extrabold text-[#FAF6EE]"
                      usdClassName="text-xs text-[#8A9B87] font-normal"
                      periodClassName="text-xs text-[#A5B3A2] font-medium"
                    />
                  </div>
                  <ul className="space-y-3 text-xs text-[#E0E8DF] mb-6">
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-[#93A28F] shrink-0 mt-0.5" />
                      <span><strong>3 Pattern Conversions/day</strong> (max 80×80 grid)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-[#93A28F] shrink-0 mt-0.5" />
                      <span>Standard <strong>DMC Color Palette</strong> (up to 30 colors)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-[#93A28F] shrink-0 mt-0.5" />
                      <span>Interactive Web Viewer & live grid preview</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-[#93A28F] shrink-0 mt-0.5" />
                      <span>PDF Pattern Export & DMC symbol chart</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <HeartHandshake className="w-4 h-4 text-[#93A28F] shrink-0 mt-0.5" />
                      <span>Access to Marketplace & community designs</span>
                    </li>
                  </ul>
                </div>
                <button
                  type="button"
                  disabled={isProcessingPayment}
                  onClick={handleFreePlan}
                  className="w-full py-3 px-5 rounded-full bg-[#323D34] hover:bg-[#425245] border border-[#445246] text-[#FAF6EE] font-bold text-xs sm:text-sm transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.02] disabled:opacity-50"
                >
                  <span>Start for free</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* 2. Pro Plan Card */}
            {showPro && (
              <div className="bg-[#1D231E] border-2 border-[#E06C38] rounded-3xl p-6 flex flex-col justify-between shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 bg-[#E06C38] text-white text-[9px] font-extrabold uppercase tracking-wider px-3.5 py-1 rounded-bl-xl shadow-xs">
                  Most Popular
                </div>
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#E06C38] bg-[#E06C38]/20 px-3 py-1 rounded-full border border-[#E06C38]/40">
                      Pro Crafter
                    </span>
                  </div>
                  <h4 className="text-xl font-bold text-[#FAF6EE] mb-1">Pro Plan</h4>
                  <p className="text-xs text-[#C5D3C2] leading-relaxed mb-5">
                    For stitchers wanting unlimited grid sizes and an ad-free workflow.
                  </p>
                  <div className="mb-5 pb-5 border-b border-[#323D34]">
                    {hasAnnual && billingCycle === 'annual' && proYearlyLkr != null ? (
                      <>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="bg-[#E06C38]/20 text-[#E06C38] border border-[#E06C38]/30 text-[9px] font-bold px-2 py-0.5 rounded-full">
                            Save 20%
                          </span>
                        </div>
                        <LkrPriceDisplay
                          priceLkr={Math.round(proYearlyLkr / 12)}
                          period="/ month"
                          layout="stacked"
                          lkrClassName="text-2xl sm:text-3xl font-extrabold text-[#FAF6EE]"
                          usdClassName="text-xs text-[#A5B3A2] font-normal"
                          periodClassName="text-xs text-[#A5B3A2] font-medium"
                        />
                        <div className="mt-1 text-xs text-[#A5B3A2]">
                          <span>billed annually, </span>
                          <LkrPriceDisplay
                            priceLkr={proYearlyLkr}
                            period="per year"
                            layout="inline"
                            lkrClassName="font-semibold text-[#FAF6EE]"
                            usdClassName="text-[11px] text-[#A5B3A2]"
                          />
                        </div>
                      </>
                    ) : (
                      <LkrPriceDisplay
                        priceLkr={proMonthlyLkr}
                        period="/ month"
                        layout="stacked"
                        lkrClassName="text-2xl sm:text-3xl font-extrabold text-[#FAF6EE]"
                        usdClassName="text-xs text-[#A5B3A2] font-normal"
                        periodClassName="text-xs text-[#A5B3A2] font-medium"
                      />
                    )}
                  </div>
                  <ul className="space-y-3 text-xs text-[#FAF6EE] mb-6">
                    <li className="flex items-start gap-2">
                      <Shield className="w-4 h-4 text-[#E06C38] shrink-0 mt-0.5" />
                      <span><strong className="text-[#E06C38]">Ad-Free Experience</strong> on converter & shop</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Zap className="w-4 h-4 text-[#E06C38] shrink-0 mt-0.5" />
                      <span><strong>Unlimited Grid Sizes</strong> & pattern generations</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-[#E06C38] shrink-0 mt-0.5" />
                      <span><strong className="text-white">No Watermarks</strong> on PDF pattern charts</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-[#E06C38] shrink-0 mt-0.5" />
                      <span>Up to <strong>150 DMC & Anchor Thread Colors</strong></span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Calculator className="w-4 h-4 text-[#E06C38] shrink-0 mt-0.5" />
                      <span><strong>Automated Floss & Skein Calculation</strong> in PDF</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-[#93A28F] shrink-0 mt-0.5" />
                      <span>Priority pattern processing & organizer keys</span>
                    </li>
                  </ul>
                </div>
                <button
                  type="button"
                  disabled={isProcessingPayment}
                  onClick={() => handleSubscribe('pro')}
                  className="w-full py-3 px-5 rounded-full bg-[#E06C38] hover:bg-[#d05c28] text-white font-bold text-xs sm:text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-md cursor-pointer hover:scale-[1.02] disabled:opacity-60"
                >
                  {selectedPlanInProgress === 'pro' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Preparing Checkout...</span>
                    </>
                  ) : (
                    <>
                      <span>Start Pro plan</span>
                      <Sparkles className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            )}

            {/* 3. Studio Plan Card */}
            {showStudio && (
              <div className={`bg-[#1D231E] border rounded-3xl p-6 flex flex-col justify-between shadow-xl relative overflow-hidden group ${
                !showPro || isOnboarding ? 'border-2 border-[#323D34]' : 'border-[#323D34]'
              }`}>
                {!showPro && !isOnboarding && (
                  <div className="absolute top-0 right-0 bg-[#E06C38] text-white text-[9px] font-extrabold uppercase tracking-wider px-3.5 py-1 rounded-bl-xl shadow-xs">
                    Recommended Upgrade
                  </div>
                )}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#93A28F] bg-[#323D34] px-3 py-1 rounded-full border border-[#445246]">
                      Studio & Ultimate
                    </span>
                    <span className="text-[10px] bg-[#E06C38]/20 text-[#E06C38] font-bold px-2 py-0.5 rounded-full border border-[#E06C38]/30">
                      Full Toolkit
                    </span>
                  </div>
                  <h4 className="text-xl font-bold text-[#FAF6EE] mb-1">Studio Plan</h4>
                  <p className="text-xs text-[#A5B3A2] leading-relaxed mb-5">
                    For pattern designers wanting image editing & 15% custom order discounts.
                  </p>
                  <div className="mb-5 pb-5 border-b border-[#323D34]">
                    {hasAnnual && billingCycle === 'annual' && studioYearlyLkr != null ? (
                      <>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="bg-[#E06C38]/20 text-[#E06C38] border border-[#E06C38]/30 text-[9px] font-bold px-2 py-0.5 rounded-full">
                            Save 20%
                          </span>
                        </div>
                        <LkrPriceDisplay
                          priceLkr={Math.round(studioYearlyLkr / 12)}
                          period="/ month"
                          layout="stacked"
                          lkrClassName="text-2xl sm:text-3xl font-extrabold text-[#FAF6EE]"
                          usdClassName="text-xs text-[#8A9B87] font-normal"
                          periodClassName="text-xs text-[#A5B3A2] font-medium"
                        />
                        <div className="mt-1 text-xs text-[#A5B3A2]">
                          <span>billed annually, </span>
                          <LkrPriceDisplay
                            priceLkr={studioYearlyLkr}
                            period="per year"
                            layout="inline"
                            lkrClassName="font-semibold text-[#FAF6EE]"
                            usdClassName="text-[11px] text-[#8A9B87]"
                          />
                        </div>
                      </>
                    ) : (
                      <LkrPriceDisplay
                        priceLkr={studioMonthlyLkr}
                        period="/ month"
                        layout="stacked"
                        lkrClassName="text-2xl sm:text-3xl font-extrabold text-[#FAF6EE]"
                        usdClassName="text-xs text-[#8A9B87] font-normal"
                        periodClassName="text-xs text-[#A5B3A2] font-medium"
                      />
                    )}
                  </div>
                  <ul className="space-y-3 text-xs text-[#E0E8DF] mb-6">
                    <li className="flex items-start gap-2 text-white">
                      <Check className="w-4 h-4 text-[#93A28F] shrink-0 mt-0.5" />
                      <span><strong>Everything in Pro</strong> (Ad-free, Unlimited Grids)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-[#E06C38] shrink-0 mt-0.5" />
                      <span><strong className="text-[#E06C38]">Unlimited Thread Colors</strong> per pattern</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Sliders className="w-4 h-4 text-[#E06C38] shrink-0 mt-0.5" />
                      <span><strong className="text-[#E06C38]">Studio Image Editor & Tone Shading</strong></span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Image className="w-4 h-4 text-[#E06C38] shrink-0 mt-0.5" />
                      <span><strong className="text-[#E06C38]">Live Thread Color Editor & Swapper</strong></span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Percent className="w-4 h-4 text-[#E06C38] shrink-0 mt-0.5" />
                      <span><strong className="text-[#E06C38]">15% Discount on all Custom Orders</strong></span>
                    </li>
                    <li className="flex items-start gap-2">
                      <RefreshCw className="w-4 h-4 text-[#93A28F] shrink-0 mt-0.5" />
                      <span><strong>DMC ↔ Anchor Instant Conversion</strong> & dual mapping</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Calculator className="w-4 h-4 text-[#93A28F] shrink-0 mt-0.5" />
                      <span>Automated Floss/Skein Calculation + supply estimator</span>
                    </li>
                  </ul>
                </div>
                <button
                  type="button"
                  disabled={isProcessingPayment}
                  onClick={() => handleSubscribe('studio')}
                  className={`w-full py-3 px-5 rounded-full font-bold text-xs sm:text-sm transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.02] disabled:opacity-60 ${
                    !showPro && !isOnboarding
                      ? 'bg-[#E06C38] hover:bg-[#d05c28] text-white shadow-md'
                      : 'bg-[#323D34] hover:bg-[#425245] border border-[#445246] text-[#FAF6EE]'
                  }`}
                >
                  {selectedPlanInProgress === 'studio' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Preparing Checkout...</span>
                    </>
                  ) : (
                    <>
                      <span>Start Studio plan</span>
                      <Sparkles className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
