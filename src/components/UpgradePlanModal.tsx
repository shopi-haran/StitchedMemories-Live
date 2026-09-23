import React, { useState } from 'react';
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
import { DualPrice } from './DualPrice';
import { useAuth } from '../context/AuthContext';
import { updateUserTier, updateUserPlanSelection } from '../lib/supabase';
import { createPayHereHash, startPayHereCheckout, PAYHERE_NOTIFY_URL } from '../lib/payhere';

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
  const [selectedPlanInProgress, setSelectedPlanInProgress] = useState<'pro' | 'studio' | null>(null);
  const [paymentError, setPaymentError] = useState<{
    type: 'dismissed' | 'error';
    message: string;
    plan: 'pro' | 'studio';
  } | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const { user, isLoggedIn, refreshProfile } = useAuth();

  // Stacking z-index and body scroll lock
  const { zIndex, modalId } = useModalStack(isOpen, { onClose, id: 'upgrade-plan-modal' });

  if (!isOpen || typeof document === 'undefined') return null;

  const isOnboarding = mode === 'onboarding';
  const isStudioOnly = targetPlan === 'studio';
  const normalizedTier = (currentTier || 'free').toLowerCase();

  // In onboarding mode, show all 3 plans: Free, Pro, Studio
  // In studio-only mode (e.g. from Marketplace discount CTA): show ONLY Studio
  // In regular upgrade mode:
  // - free tier: show Pro and Studio
  // - pro tier: show only Studio
  // - studio tier: show none
  const showFree = isOnboarding && !isStudioOnly;
  const showPro = !isStudioOnly && (isOnboarding || normalizedTier === 'free');
  const showStudio = isStudioOnly || isOnboarding || normalizedTier === 'free' || normalizedTier === 'pro';

  // Responsive container width
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
    // If guest, open login / signup modal first
    if (!isLoggedIn || !user) {
      onSelectPlan(plan, billingCycle);
      return;
    }

    setIsProcessingPayment(true);
    setSelectedPlanInProgress(plan);
    setPaymentError(null);

    try {
      // Pro: $9/mo, or $84/yr ($7/mo billed annually)
      // Studio: $19/mo, or $180/yr ($15/mo billed annually)
      const amount = billingCycle === 'annual'
        ? (plan === 'pro' ? 84 : 180)
        : (plan === 'pro' ? 9 : 19);

      // Generate order_id as required: sub-${profile.id}-${Date.now()}
      const orderId = `sub-${user.id}-${Date.now()}`;

      // Call the create-payhere-hash Edge Function
      const hashResult = await createPayHereHash({
        order_id: orderId,
        amount,
        currency: 'USD',
      });

      const nameParts = (user.name || 'Crafter Member').trim().split(/\s+/);
      const firstName = nameParts[0] || 'Crafter';
      const lastName = nameParts.slice(1).join(' ') || 'Member';

      // Open PayHere checkout with recurrence: "1 Month" (or "1 Year") and duration: "Forever"
      await startPayHereCheckout(
        {
          sandbox: true,
          merchant_id: hashResult.merchant_id,
          return_url: window.location.href,
          cancel_url: window.location.href,
          notify_url: PAYHERE_NOTIFY_URL,
          order_id: orderId,
          items: `StitchedMemories ${plan === 'pro' ? 'Pro Crafter' : 'Studio'} Membership (${billingCycle})`,
          amount: amount.toFixed(2),
          currency: 'USD',
          recurrence: billingCycle === 'annual' ? '1 Year' : '1 Month',
          duration: 'Forever',
          hash: hashResult.hash,
          first_name: firstName,
          last_name: lastName,
          email: user.email,
          phone: '0771234567',
          address: 'Digital Crafter Membership',
          city: 'Colombo',
          country: 'Sri Lanka',
        },
        {
          onCompleted: async (completedOrderId) => {
            console.log('[UpgradePlanModal] PayHere onCompleted:', completedOrderId);
            try {
              // Update user subscription tier
              await updateUserTier(user.id, user.email, plan);
              if (isOnboarding || user.has_selected_plan === false) {
                await updateUserPlanSelection(user.id, user.email, true);
              }
              await refreshProfile();
              setIsSuccess(true);
              setTimeout(() => {
                setIsProcessingPayment(false);
                setSelectedPlanInProgress(null);
                if (onClose) onClose();
              }, 1200);
            } catch (err) {
              console.error('[UpgradePlanModal] Error updating subscription after payment:', err);
              await refreshProfile();
              if (onClose) onClose();
            }
          },
          onDismissed: () => {
            console.log('[UpgradePlanModal] PayHere onDismissed');
            setIsProcessingPayment(false);
            setSelectedPlanInProgress(null);
            setPaymentError({
              type: 'dismissed',
              message: 'Checkout was dismissed. No charges were made and your subscription remains unchanged.',
              plan,
            });
          },
          onError: (error) => {
            console.error('[UpgradePlanModal] PayHere onError:', error);
            setIsProcessingPayment(false);
            setSelectedPlanInProgress(null);
            setPaymentError({
              type: 'error',
              message: typeof error === 'string' ? error : 'Payment could not be completed. Please try again.',
              plan,
            });
          },
        }
      );
    } catch (err: any) {
      console.error('[UpgradePlanModal] Checkout initialization error:', err);
      setIsProcessingPayment(false);
      setSelectedPlanInProgress(null);
      setPaymentError({
        type: 'error',
        message: err?.message || 'Failed to initialize PayHere checkout. Please try again.',
        plan,
      });
    }
  };

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
                  <p className="font-bold text-[#1D231E]">
                    {paymentError.type === 'dismissed' ? 'Payment Cancelled' : 'Payment Issue'}
                  </p>
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
                    <DualPrice
                      amount={0}
                      period="/ forever"
                      layout="stacked"
                      usdClassName="text-2xl sm:text-3xl font-extrabold text-[#FAF6EE]"
                      periodClassName="text-xs text-[#A5B3A2] font-medium"
                      lkrClassName="text-xs text-[#8A9B87] font-normal"
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
                  <span>Continue with Free</span>
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
                    <DualPrice
                      amount={billingCycle === 'monthly' ? 9 : 7}
                      period={`/ mo ${billingCycle === 'annual' ? '(billed annually)' : ''}`}
                      layout="stacked"
                      usdClassName="text-2xl sm:text-3xl font-extrabold text-[#FAF6EE]"
                      periodClassName="text-xs text-[#A5B3A2] font-medium"
                      lkrClassName="text-xs text-[#A5B3A2] font-normal"
                    />
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
                      <span>{isOnboarding ? 'Choose Pro Plan' : 'Upgrade to Pro'}</span>
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
                    <DualPrice
                      amount={billingCycle === 'monthly' ? 19 : 15}
                      period={`/ mo ${billingCycle === 'annual' ? '(billed annually)' : ''}`}
                      layout="stacked"
                      usdClassName="text-2xl sm:text-3xl font-extrabold text-[#FAF6EE]"
                      periodClassName="text-xs text-[#A5B3A2] font-medium"
                      lkrClassName="text-xs text-[#8A9B87] font-normal"
                    />
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
                      <span>{isOnboarding ? 'Choose Studio Plan' : 'Upgrade to Studio'}</span>
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
