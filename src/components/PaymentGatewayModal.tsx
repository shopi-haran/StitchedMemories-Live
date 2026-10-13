import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  ShieldCheck, 
  CreditCard, 
  Lock, 
  Sparkles, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  RotateCcw,
  Loader2 
} from 'lucide-react';
import { supabase, fetchUserProfile, fetchSubscriptionPlans } from '../lib/supabase';
import { useModalStack } from '../hooks/useModalStack';
import { useAuth } from '../context/AuthContext';
import { LkrPriceDisplay } from './LkrPriceDisplay';
import { startPayHereCheckout, PAYHERE_NOTIFY_URL } from '../lib/payhere';

interface PaymentGatewayModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: 'pro' | 'studio';
  billingCycle: 'monthly' | 'annual';
  user: { id?: string; name: string; email: string; avatar_url?: string } | null;
  onPaymentSuccess: (updatedTier: 'pro' | 'studio') => void;
}

export const PaymentGatewayModal: React.FC<PaymentGatewayModalProps> = ({
  isOpen,
  onClose,
  plan,
  billingCycle: initialBillingCycle,
  user,
  onPaymentSuccess,
}) => {
  const { zIndex, modalId } = useModalStack(isOpen, { onClose, id: 'payment-gateway-modal' });
  const { refreshProfile } = useAuth();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>(initialBillingCycle);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [pendingNotice, setPendingNotice] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [paymentError, setPaymentError] = useState<{
    type: 'dismissed' | 'error';
    message: string;
  } | null>(null);

  // Dynamic plan prices from database
  const [planPrices, setPlanPrices] = useState<Record<string, number>>({
    pro: 2700,
    studio: 5700,
  });

  useEffect(() => {
    let active = true;
    async function loadPrices() {
      try {
        const rows = await fetchSubscriptionPlans();
        if (active && rows.length > 0) {
          const map: Record<string, number> = {};
          rows.forEach((r) => {
            if (r.tier && r.price_lkr !== undefined) {
              map[r.tier.toLowerCase().trim()] = Number(r.price_lkr);
            }
          });
          setPlanPrices((prev) => ({ ...prev, ...map }));
        }
      } catch (e) {
        console.warn('[PaymentGatewayModal] Error loading subscription plans:', e);
      }
    }
    if (isOpen) {
      loadPrices();
    }
    return () => {
      active = false;
    };
  }, [isOpen]);

  if (!isOpen || typeof document === 'undefined') return null;

  const planName = plan === 'pro' ? 'Pro Crafter Plan' : 'Studio Plan';
  const baseMonthlyLkr = planPrices[plan] || (plan === 'pro' ? 2700 : 5700);
  const annualMonthlyLkr = Math.round(baseMonthlyLkr * 0.8);
  const activePriceLkr = billingCycle === 'annual' ? annualMonthlyLkr : baseMonthlyLkr;

  const handlePayHerePayment = async () => {
    setIsProcessing(true);
    setPaymentError(null);
    setPendingNotice(null);

    try {
      // 1. Call create-payhere-hash with ONLY { kind: 'subscription', tier }
      const { data, error } = await supabase.functions.invoke('create-payhere-hash', {
        body: {
          kind: 'subscription',
          tier: plan,
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
        setIsProcessing(false);
        setPaymentError({
          type: 'error',
          message: 'Could not start payment, please try again',
        });
        return;
      }

      const nameParts = (user?.name || 'Crafter Member').trim().split(/\s+/);
      const firstName = nameParts[0] || 'Crafter';
      const lastName = nameParts.slice(1).join(' ') || 'Member';

      // 2. Open PayHere checkout with returned values exactly as given
      await startPayHereCheckout(
        {
          sandbox: true,
          merchant_id: String(data.merchant_id),
          order_id: String(data.order_id),
          items: `StitchedMemories ${planName} (${billingCycle})`,
          amount: String(data.amount),
          currency: String(data.currency),
          hash: String(data.hash),
          first_name: firstName,
          last_name: lastName,
          email: user?.email || '',
          phone: '0771234567',
          address: 'Digital Subscription',
          city: 'Colombo',
          country: 'Sri Lanka',
          return_url: window.location.href,
          cancel_url: window.location.href,
          notify_url: PAYHERE_NOTIFY_URL,
        },
        {
          onCompleted: async (completedOrderId) => {
            console.log('[PaymentGatewayModal] PayHere completed:', completedOrderId);
            setIsProcessing(true);
            setIsVerifying(true);
            setPaymentError(null);
            setPendingNotice(null);

            // Poll/refetch user's profile every 2 seconds for up to 30 seconds
            // until subscription_status is 'active' and subscription_tier matches the purchased tier
            const pollIntervalMs = 2000;
            const maxAttempts = 15; // 15 * 2s = 30 seconds
            let confirmed = false;

            for (let attempt = 0; attempt < maxAttempts; attempt++) {
              await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
              try {
                const latestProfile = await fetchUserProfile(user?.id);
                const currentTier = (latestProfile?.subscription_tier || '').toLowerCase();
                const currentStatus = (latestProfile?.subscription_status || '').toLowerCase();

                if (currentStatus === 'active' && (currentTier === plan || (plan === 'pro' && currentTier === 'studio'))) {
                  confirmed = true;
                  break;
                }
              } catch (pollErr) {
                console.warn('[PaymentGatewayModal] Error polling profile:', pollErr);
              }
            }

            setIsVerifying(false);
            if (confirmed) {
              setIsSuccess(true);
              await refreshProfile();
              window.dispatchEvent(new CustomEvent('tierChanged'));
              setTimeout(() => {
                onPaymentSuccess(plan);
              }, 1200);
            } else {
              setIsProcessing(false);
              setPendingNotice('payment not confirmed yet, check your dashboard shortly');
            }
          },
          onDismissed: () => {
            console.log('[PaymentGatewayModal] PayHere dismissed');
            // Close checkout without changing state or showing success
            setIsProcessing(false);
            setIsVerifying(false);
            setPendingNotice(null);
          },
          onError: (error) => {
            console.error('[PaymentGatewayModal] PayHere error:', error);
            // Close checkout without changing state or showing success
            setIsProcessing(false);
            setIsVerifying(false);
            setPendingNotice(null);
          },
        }
      );
    } catch (err: any) {
      console.error('[create-payhere-hash error response]:', err);
      setIsProcessing(false);
      setPaymentError({
        type: 'error',
        message: 'Could not start payment, please try again',
      });
    }
  };

  return createPortal(
    <div 
      data-modal-overlay="true"
      data-modal-id={modalId}
      style={{ zIndex }}
      className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
      onClick={() => {
        if (!isProcessing && onClose) onClose();
      }}
    >
      <div 
        className="relative w-full max-w-lg bg-[#FAF6EE] rounded-3xl shadow-2xl border border-[#E8E1D2] overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#E8E1D2] flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#E06C38]/10 text-[#E06C38] flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#1D231E]">Complete Your Membership</h3>
              <p className="text-xs text-[#6B7869] mt-0.5">Pay securely via PayHere with Card, Genie or FriMi</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-2 text-[#6B7869] hover:text-[#1D231E] hover:bg-[#E8E1D2]/60 rounded-full transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Close payment modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div data-modal-scroll="true" className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Plan Summary Card */}
          <div className="p-5 rounded-2xl bg-[#1D231E] text-white border border-[#323D34] shadow-md relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#A5B3A2] bg-[#2A342B] px-2.5 py-1 rounded-full border border-[#3B483C]">
                Selected Membership
              </span>
              <span className="text-xs font-semibold text-[#E06C38] flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Instant Activation</span>
              </span>
            </div>

            <div className="flex items-baseline justify-between mb-4">
              <div>
                <h4 className="text-xl font-extrabold text-[#FAF6EE]">{planName}</h4>
                <p className="text-xs text-[#A5B3A2] mt-0.5">
                  Billed {billingCycle === 'annual' ? 'annually' : 'monthly'} • Cancel anytime
                </p>
              </div>
              <div className="text-right">
                <LkrPriceDisplay
                  priceLkr={activePriceLkr}
                  period="/ mo"
                  layout="stacked"
                  lkrClassName="text-2xl font-black text-[#FAF6EE]"
                  usdClassName="text-[11px] text-[#A5B3A2]"
                  periodClassName="text-xs text-[#A5B3A2]"
                />
              </div>
            </div>

            {/* Cycle Selector */}
            <div className="grid grid-cols-2 gap-2 pt-3 border-t border-[#323D34] text-xs">
              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                disabled={isProcessing}
                className={`py-2 px-3 rounded-xl font-semibold transition-all cursor-pointer flex flex-col items-center justify-center ${
                  billingCycle === 'monthly'
                    ? 'bg-[#E06C38] text-white shadow-xs'
                    : 'bg-[#2A342B] text-[#A5B3A2] hover:text-white'
                }`}
              >
                <span>Monthly</span>
                <span className="text-[10px] opacity-80">LKR {baseMonthlyLkr.toLocaleString()} / mo</span>
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('annual')}
                disabled={isProcessing}
                className={`py-2 px-3 rounded-xl font-semibold transition-all cursor-pointer flex flex-col items-center justify-center ${
                  billingCycle === 'annual'
                    ? 'bg-[#E06C38] text-white shadow-xs'
                    : 'bg-[#2A342B] text-[#A5B3A2] hover:text-white'
                }`}
              >
                <span>Annual (Save 20%)</span>
                <span className="text-[10px] opacity-80">LKR {annualMonthlyLkr.toLocaleString()} / mo</span>
              </button>
            </div>
          </div>

          {/* Feedback & Notice Banners */}
          {paymentError && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-start gap-3 text-xs text-amber-900 animate-fadeIn">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-[#1D231E]">Payment Issue</p>
                <p className="text-[#5A6659] mt-0.5">{paymentError.message}</p>
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

          {pendingNotice && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-start gap-3 text-xs text-amber-900 animate-fadeIn">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold text-[#1D231E]">Pending Confirmation</p>
                <p className="text-[#5A6659] mt-0.5">{pendingNotice}</p>
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-2 text-xs font-bold text-[#E06C38] hover:underline"
                >
                  Close and check later
                </button>
              </div>
            </div>
          )}

          {isSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-xs text-emerald-900 animate-fadeIn">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <p className="font-bold">Payment Confirmed!</p>
                <p className="text-emerald-700">Your membership is now active. Refreshing your session...</p>
              </div>
            </div>
          )}

          {/* PayHere Checkout Action Button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handlePayHerePayment}
              disabled={isProcessing}
              className="w-full py-4 px-6 rounded-2xl bg-[#E06C38] hover:bg-[#d05c28] text-white font-bold text-sm sm:text-base transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-[#E06C38]/25 cursor-pointer hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{isVerifying ? 'Confirming payment...' : 'Opening PayHere...'}</span>
                </>
              ) : (
                <>
                  <span>Proceed to Pay with PayHere</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>

          {/* Trust Badges */}
          <div className="flex items-center justify-center gap-4 text-[11px] text-[#5A6659] pt-2">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Verified PayHere Gateway</span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-[#5A6659]" />
              <span>256-bit TLS Encryption</span>
            </span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
