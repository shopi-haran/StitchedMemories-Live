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
  Loader2,
  Package,
  Truck
} from 'lucide-react';
import { supabase, fetchUserProfile, fetchSubscriptionPlans, fetchUserStitchOrders } from '../lib/supabase';
import { useModalStack } from '../hooks/useModalStack';
import { useAuth } from '../context/AuthContext';
import { LkrPriceDisplay, formatLkrPrice } from './LkrPriceDisplay';
import { startPayHereCheckout, PAYHERE_NOTIFY_URL } from '../lib/payhere';

export interface PaymentGatewayModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan?: 'pro' | 'studio';
  billingCycle?: 'monthly' | 'annual';
  user: { id?: string; name: string; email: string; avatar_url?: string } | null;
  onPaymentSuccess?: (updatedTier: 'pro' | 'studio') => void;
  order?: any;
  quote?: any;
  onOrderPaymentSuccess?: (orderId: string | number) => void;
}

export const PaymentGatewayModal: React.FC<PaymentGatewayModalProps> = ({
  isOpen,
  onClose,
  plan = 'pro',
  billingCycle: initialBillingCycle = 'monthly',
  user,
  onPaymentSuccess,
  order,
  quote,
  onOrderPaymentSuccess,
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

  const isOrderMode = Boolean(quote || order);
  const activeQuote = quote || order?.quote;
  const quoteTotalLkr = Number(activeQuote?.total_amount ?? order?.total_amount ?? order?.quoted_price ?? 0);
  const isLegacyQuote = isOrderMode && Boolean(activeQuote && (!activeQuote.currency || activeQuote.currency !== 'LKR'));
  const orderTitle = order?.title || `Custom Keepsake #${String(order?.raw_order_id || order?.id || '').replace('order_', '').slice(-8)}`;

  const planName = plan === 'pro' ? 'Pro Crafter Plan' : 'Studio Plan';
  const baseMonthlyLkr = planPrices[plan] || (plan === 'pro' ? 2700 : 5700);
  const annualMonthlyLkr = Math.round(baseMonthlyLkr * 0.8);
  const activePriceLkr = billingCycle === 'annual' ? annualMonthlyLkr : baseMonthlyLkr;

  const handlePayHerePayment = async () => {
    if (isLegacyQuote) {
      setPaymentError({
        type: 'error',
        message: 'This quote is being updated, please check back shortly',
      });
      return;
    }

    setIsProcessing(true);
    setPaymentError(null);
    setPendingNotice(null);

    try {
      // 1. Call create-payhere-hash with appropriate payload
      const requestPayload = isOrderMode
        ? { kind: 'order', orderRowId: order?.raw_order_id || order?.id }
        : { kind: 'subscription', tier: plan };

      const { data, error } = await supabase.functions.invoke('create-payhere-hash', {
        body: requestPayload,
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

      const rawName = isOrderMode ? (order?.customer_name || user?.name || 'Crafter Customer') : (user?.name || 'Crafter Member');
      const nameParts = rawName.trim().split(/\s+/);
      const firstName = nameParts[0] || 'Crafter';
      const lastName = nameParts.slice(1).join(' ') || (isOrderMode ? 'Customer' : 'Member');

      // 2. Open PayHere checkout with returned values exactly as given
      await startPayHereCheckout(
        {
          sandbox: true,
          merchant_id: String(data.merchant_id),
          order_id: String(data.order_id),
          items: isOrderMode ? orderTitle : `StitchedMemories ${planName} (${billingCycle})`,
          amount: String(data.amount),
          currency: String(data.currency),
          hash: String(data.hash),
          first_name: firstName,
          last_name: lastName,
          email: (isOrderMode && order?.customer_email) ? order.customer_email : (user?.email || ''),
          phone: order?.customer_phone || '0771234567',
          address: order?.shipping_address || (isOrderMode ? 'Online Custom Order' : 'Digital Subscription'),
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

            if (isOrderMode) {
              const realOrderId = order?.raw_order_id || order?.id;
              const pollIntervalMs = 2000;
              const maxAttempts = 15; // 30 seconds
              let confirmed = false;

              for (let attempt = 0; attempt < maxAttempts; attempt++) {
                await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
                try {
                  const refreshedOrders = await fetchUserStitchOrders(user?.id, user?.email);
                  const currentOrder = refreshedOrders.find(
                    (o) => String(o.raw_order_id || o.id) === String(realOrderId)
                  );
                  if (
                    currentOrder &&
                    (currentOrder.payment_status === 'paid' ||
                      currentOrder.fulfillment_status === 'processing')
                  ) {
                    confirmed = true;
                    break;
                  }
                } catch (pollErr) {
                  console.warn('[PaymentGatewayModal] Error polling order status:', pollErr);
                }
              }

              setIsVerifying(false);
              if (confirmed) {
                setIsSuccess(true);
                window.dispatchEvent(new CustomEvent('orderUpdated', { detail: { orderId: realOrderId } }));
                setTimeout(() => {
                  onOrderPaymentSuccess?.(realOrderId);
                  onClose();
                }, 1200);
              } else {
                setIsProcessing(false);
                setPendingNotice('payment not confirmed yet, check your dashboard shortly');
              }
            } else {
              // Membership subscription poll
              const pollIntervalMs = 2000;
              const maxAttempts = 15; // 30 seconds
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
                  onPaymentSuccess?.(plan);
                  onClose();
                }, 1200);
              } else {
                setIsProcessing(false);
                setPendingNotice('payment not confirmed yet, check your dashboard shortly');
              }
            }
          },
          onDismissed: () => {
            console.log('[PaymentGatewayModal] PayHere dismissed');
            setIsProcessing(false);
            setIsVerifying(false);
            setPendingNotice(null);
          },
          onError: (error) => {
            console.error('[PaymentGatewayModal] PayHere error:', error);
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
              <h3 className="text-lg font-bold text-[#1D231E]">
                {isOrderMode ? 'Complete Order Payment' : 'Complete Your Membership'}
              </h3>
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
          {/* Summary Card */}
          <div className="p-5 rounded-2xl bg-[#1D231E] text-white border border-[#323D34] shadow-md relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#A5B3A2] bg-[#2A342B] px-2.5 py-1 rounded-full border border-[#3B483C]">
                {isOrderMode ? 'Custom Order Payment' : 'Selected Membership'}
              </span>
              <span className="text-xs font-semibold text-[#E06C38] flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isOrderMode ? 'Studio Verified Quote' : 'Instant Activation'}</span>
              </span>
            </div>

            <div className="flex items-baseline justify-between mb-4 gap-3">
              <div>
                <h4 className="text-xl font-extrabold text-[#FAF6EE]">{isOrderMode ? orderTitle : planName}</h4>
                <p className="text-xs text-[#A5B3A2] mt-0.5">
                  {isOrderMode
                    ? `Order #${String(order?.raw_order_id || order?.id || '').replace('order_', '').slice(-8)} • Handcrafted Keepsake`
                    : `Billed ${billingCycle === 'annual' ? 'annually' : 'monthly'} • Cancel anytime`
                  }
                </p>
              </div>
              <div className="text-right shrink-0">
                <LkrPriceDisplay
                  priceLkr={isOrderMode ? quoteTotalLkr : activePriceLkr}
                  period={isOrderMode ? undefined : '/ mo'}
                  layout="stacked"
                  lkrClassName="text-2xl font-black text-[#FAF6EE]"
                  usdClassName="text-[11px] text-[#A5B3A2]"
                  periodClassName="text-xs text-[#A5B3A2]"
                />
              </div>
            </div>

            {/* If Order mode: line items / delivery breakdown summary */}
            {isOrderMode && activeQuote && (
              <div className="pt-3 border-t border-[#323D34] text-xs text-[#A5B3A2] space-y-1.5">
                {activeQuote.line_items && activeQuote.line_items.length > 0 && (
                  <div className="flex justify-between items-center text-[11px]">
                    <span>Itemized Line Items ({activeQuote.line_items.length}):</span>
                    <LkrPriceDisplay priceLkr={activeQuote.items_subtotal || 0} layout="inline" lkrClassName="font-semibold text-white" usdClassName="text-[10px] text-[#A5B3A2]" />
                  </div>
                )}
                {Number(activeQuote.crafting_charge || 0) > 0 && (
                  <div className="flex justify-between items-center text-[11px]">
                    <span>Crafting & Artisan Work:</span>
                    <LkrPriceDisplay priceLkr={activeQuote.crafting_charge} layout="inline" lkrClassName="font-semibold text-white" usdClassName="text-[10px] text-[#A5B3A2]" />
                  </div>
                )}
                {Number(activeQuote.discount_amount || 0) > 0 && (
                  <div className="flex justify-between items-center text-[11px] text-emerald-400">
                    <span>Studio 15% Member Discount:</span>
                    <span>-<LkrPriceDisplay priceLkr={Number(activeQuote.discount_amount)} layout="inline" lkrClassName="font-semibold text-emerald-400" usdClassName="text-[10px] text-emerald-300" /></span>
                  </div>
                )}
                {Number(activeQuote.delivery_charge || 0) > 0 && (
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="flex items-center gap-1"><Truck className="w-3 h-3 text-[#E06C38]" /> Delivery:</span>
                    <LkrPriceDisplay priceLkr={activeQuote.delivery_charge} layout="inline" lkrClassName="font-semibold text-white" usdClassName="text-[10px] text-[#A5B3A2]" />
                  </div>
                )}
              </div>
            )}

            {/* Cycle Selector (Subscription mode only) */}
            {!isOrderMode && (
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
            )}
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
            {isLegacyQuote ? (
              <button
                type="button"
                disabled
                className="w-full py-4 px-6 rounded-2xl bg-gray-200 text-gray-500 font-bold text-sm sm:text-base border border-gray-300 cursor-not-allowed shadow-none"
                title="This quote is being updated, please check back shortly"
              >
                This quote is being updated, please check back shortly
              </button>
            ) : (
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
                    <span>
                      Pay {formatLkrPrice(isOrderMode ? quoteTotalLkr : activePriceLkr)} with PayHere
                    </span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            )}
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
