import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  ShieldCheck, 
  CreditCard, 
  Sparkles, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  RotateCcw,
  Loader2,
  Package,
  Truck,
  Upload,
  FileText,
  Clock,
  Banknote
} from 'lucide-react';
import { 
  supabase, 
  fetchSubscriptionPlans, 
  fetchBankTransferDetails, 
  setBankTransferClaim, 
  claimSubscriptionTransfer, 
  cancelSubscriptionClaim, 
  fetchUserSubscriptionClaim,
  uploadPaymentProof 
} from '../lib/supabase';
import { useModalStack } from '../hooks/useModalStack';
import { useAuth } from '../context/AuthContext';
import { LkrPriceDisplay, formatLkrPrice } from './LkrPriceDisplay';
import { formatLkr } from '../utils/currency';
import { startPayHereCheckout, PAYHERE_NOTIFY_URL, PAYHERE_LIMIT_LKR } from '../lib/payhere';

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

  // Bank transfer states
  const [paymentMode, setPaymentMode] = useState<'card' | 'bank_transfer'>('card');
  const [bankDetails, setBankDetails] = useState<string>('');
  const [bankTransferNote, setBankTransferNote] = useState<string>('');
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipUploading, setSlipUploading] = useState<boolean>(false);
  const [isSubmittingClaim, setIsSubmittingClaim] = useState<boolean>(false);
  const [userSubClaim, setUserSubClaim] = useState<any | null>(null);

  // Dynamic plan prices from database
  const [planPrices, setPlanPrices] = useState<Record<string, { price_lkr: number; yearly_price_lkr: number | null }>>({
    pro: { price_lkr: 2700, yearly_price_lkr: null },
    studio: { price_lkr: 5700, yearly_price_lkr: null },
  });

  useEffect(() => {
    let active = true;
    async function loadPricesAndBank() {
      try {
        const [rows, bankText, subClaim] = await Promise.all([
          fetchSubscriptionPlans(),
          fetchBankTransferDetails(),
          user?.id ? fetchUserSubscriptionClaim(user.id) : Promise.resolve(null),
        ]);
        if (active) {
          if (rows.length > 0) {
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
          if (bankText) {
            setBankDetails(bankText);
          }
          setUserSubClaim(subClaim);
        }
      } catch (e) {
        console.warn('[PaymentGatewayModal] Error loading initial setup:', e);
      }
    }
    if (isOpen) {
      loadPricesAndBank();
      setPaymentMode('card');
      setBankTransferNote('');
      setSlipFile(null);
      setPaymentError(null);
    }
    return () => {
      active = false;
    };
  }, [isOpen, user]);

  if (!isOpen || typeof document === 'undefined') return null;

  const isOrderMode = Boolean(quote || order);
  const activeQuote = quote || order?.quote;
  const quoteTotalLkr = Number(activeQuote?.total_amount ?? order?.total_amount ?? order?.quoted_price ?? 0);
  const isLegacyQuote = isOrderMode && Boolean(activeQuote && (!activeQuote.currency || activeQuote.currency !== 'LKR'));
  const orderTitle = order?.title || `Custom Keepsake #${String(order?.raw_order_id || order?.id || '').replace('order_', '').slice(-8)}`;

  const [isNonRefundableChecked, setIsNonRefundableChecked] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsNonRefundableChecked(false);
    }
  }, [isOpen, order]);

  const isCustomStitched = order?.order_type === 'custom_stitched' || 
    (order?.title && order?.title.toLowerCase().includes('stitched')) || 
    (order?.request_details?.order_type === 'custom_stitched');

  const totalCents = Math.round(quoteTotalLkr * 100);
  const advanceLkr = Math.floor(totalCents / 2) / 100;
  const amountPaidLkr = Number(order?.amount_paid_lkr ?? 0);
  const balanceLkr = Math.max(0, (totalCents - Math.round(Math.max(amountPaidLkr, advanceLkr) * 100)) / 100);
  const isPayingAdvance = isCustomStitched && order?.payment_status !== 'deposit_paid';
  const expectedPayAmount = isCustomStitched ? (isPayingAdvance ? advanceLkr : balanceLkr) : Math.max(0, quoteTotalLkr - amountPaidLkr);

  const planName = plan === 'pro' ? 'Pro Plan' : 'Studio Plan';
  const planPricing = planPrices[plan] || (plan === 'pro' ? { price_lkr: 2700, yearly_price_lkr: null } : { price_lkr: 5700, yearly_price_lkr: null });
  const baseMonthlyLkr = planPricing.price_lkr;
  const annualYearlyLkr = planPricing.yearly_price_lkr;
  const hasAnnual = Boolean(annualYearlyLkr != null && annualYearlyLkr > 0);

  useEffect(() => {
    if (!hasAnnual && billingCycle === 'annual') {
      setBillingCycle('monthly');
    }
  }, [hasAnnual]);

  const activePriceLkr = hasAnnual && billingCycle === 'annual' ? annualYearlyLkr : baseMonthlyLkr;

  const amountDueNow = isOrderMode ? expectedPayAmount : activePriceLkr;
  const exceedsLimit = amountDueNow >= PAYHERE_LIMIT_LKR;

  useEffect(() => {
    if (exceedsLimit && paymentMode !== 'bank_transfer') {
      setPaymentMode('bank_transfer');
    }
  }, [exceedsLimit]);

  const orderRawId = String(order?.raw_order_id || order?.id || '').replace('order_', '');
  const bankRefCode = isOrderMode 
    ? `SM-${orderRawId.slice(0, 8).toUpperCase()}`
    : `SM-SUB-${String(user?.id || '').slice(0, 8).toUpperCase()}`;

  const hasTransferClaimed = Boolean(isOrderMode && order?.transfer_claimed_at && order?.payment_status !== 'paid');
  const transferClaimDate = order?.transfer_claimed_at ? new Date(order.transfer_claimed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
  const hasSubClaimPending = Boolean(!isOrderMode && userSubClaim);
  const subClaimDate = userSubClaim?.created_at ? new Date(userSubClaim.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

  const handleCancelTransferClaim = async () => {
    setIsSubmittingClaim(true);
    setPaymentError(null);
    try {
      if (isOrderMode) {
        const res = await setBankTransferClaim(order?.raw_order_id || order?.id, false, null);
        if (res.success) {
          window.dispatchEvent(new CustomEvent('orderUpdated', { detail: { orderId: order?.raw_order_id || order?.id } }));
          onClose();
        } else {
          setPaymentError({ type: 'error', message: res.message || 'Unable to cancel bank transfer report' });
        }
      } else {
        const res = await cancelSubscriptionClaim();
        if (res.success) {
          setUserSubClaim(null);
          onClose();
        } else {
          setPaymentError({ type: 'error', message: res.message || 'Unable to cancel subscription claim' });
        }
      }
    } catch (err: any) {
      setPaymentError({ type: 'error', message: err?.message || 'Unable to cancel bank transfer report' });
    } finally {
      setIsSubmittingClaim(false);
    }
  };

  const handleSubmitBankTransferClaim = async () => {
    if (isOrderMode && isCustomStitched && isPayingAdvance && !isNonRefundableChecked) {
      return;
    }
    setIsSubmittingClaim(true);
    setPaymentError(null);

    try {
      let slipPath: string | null = null;
      if (slipFile) {
        if (slipFile.size > 5 * 1024 * 1024) {
          setPaymentError({ type: 'error', message: 'Deposit slip file size must not exceed 5 MB.' });
          setIsSubmittingClaim(false);
          return;
        }
        const fileExt = slipFile.name.split('.').pop() || 'jpg';
        const path = `${user?.id || 'guest'}/${isOrderMode ? orderRawId : 'subscription'}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
        slipPath = await uploadPaymentProof(slipFile, path);
      }

      let finalNote = bankTransferNote.trim();
      if (slipPath) {
        finalNote = `Slip: ${slipPath}${finalNote ? '\n' + finalNote : ''}`;
      }
      if (finalNote.length > 500) {
        finalNote = finalNote.slice(0, 500);
      }

      if (isOrderMode) {
        const res = await setBankTransferClaim(order?.raw_order_id || order?.id, true, finalNote || null);
        if (res.success) {
          window.dispatchEvent(new CustomEvent('orderUpdated', { detail: { orderId: order?.raw_order_id || order?.id } }));
          setIsSuccess(true);
          setTimeout(() => {
            onOrderPaymentSuccess?.(order?.raw_order_id || order?.id);
            onClose();
          }, 1200);
        } else {
          setPaymentError({ type: 'error', message: res.message || 'Unable to submit bank transfer report' });
        }
      } else {
        const res = await claimSubscriptionTransfer(plan, hasAnnual && billingCycle === 'annual' ? 'yearly' : 'monthly', finalNote || null);
        if (res.success) {
          setUserSubClaim({ created_at: new Date().toISOString(), tier: plan });
          setIsSuccess(true);
          setTimeout(() => {
            onClose();
          }, 1200);
        } else {
          setPaymentError({ type: 'error', message: res.message || 'Unable to submit subscription bank transfer claim' });
        }
      }
    } catch (err: any) {
      setPaymentError({ type: 'error', message: err?.message || 'Unable to submit bank transfer report' });
    } finally {
      setIsSubmittingClaim(false);
    }
  };

  const handlePayHerePayment = async () => {
    if (isLegacyQuote) {
      setPaymentError({
        type: 'error',
        message: 'This quote is being updated, please check back shortly',
      });
      return;
    }

    if (exceedsLimit) {
      setPaymentMode('bank_transfer');
      setPaymentError({
        type: 'error',
        message: 'This amount is above our online payment limit (LKR 50,000). Please pay by bank transfer.',
      });
      return;
    }

    setIsProcessing(true);
    setPaymentError(null);
    setPendingNotice(null);

    try {
      const requestPayload = isOrderMode
        ? { kind: 'order', orderRowId: order?.raw_order_id || order?.id }
        : { kind: 'subscription', tier: plan, period: hasAnnual && billingCycle === 'annual' ? 'yearly' : 'monthly' };

      const { data, error } = await supabase.functions.invoke('create-payhere-hash', {
        body: requestPayload,
      });

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
        let errMsg = 'Could not start payment, please try again';

        if (error && typeof error === 'object' && 'context' in error && error.context instanceof Response) {
          try {
            const errJson = await error.context.clone().json();
            errorPayload = { status: error.context.status, body: errJson, error };
            const errStr = JSON.stringify(errJson);
            if (errStr.includes('Amount exceeds the current payment limit') || data?.amount_exceeds_50k) {
              setPaymentMode('bank_transfer');
              errMsg = 'This amount is above our online payment limit. Please pay by bank transfer.';
            } else if (errStr.includes('Balance is not due yet')) {
              errMsg = 'The balance is not payable yet';
            }
          } catch {}
        }
        if (data?.error && String(data.error).includes('Amount exceeds the current payment limit') || data?.amount_exceeds_50k) {
          setPaymentMode('bank_transfer');
          errMsg = 'This amount is above our online payment limit. Please pay by bank transfer.';
        }
        if (data?.error && String(data.error).includes('Balance is not due yet')) {
          errMsg = 'The balance is not payable yet';
        }

        console.error('[create-payhere-hash error response]:', errorPayload);
        setIsProcessing(false);
        setPaymentError({
          type: 'error',
          message: errMsg,
        });
        return;
      }

      const nameParts = (user?.name || 'Crafter Customer').trim().split(' ');
      const firstName = nameParts[0] || 'Crafter';
      const lastName = nameParts.slice(1).join(' ') || (isOrderMode ? 'Customer' : 'Member');

      await startPayHereCheckout(
        {
          sandbox: true,
          merchant_id: data.merchant_id,
          return_url: window.location.href,
          cancel_url: window.location.href,
          notify_url: PAYHERE_NOTIFY_URL,
          order_id: data.order_id,
          items: isOrderMode ? orderTitle : planName,
          amount: data.amount,
          currency: data.currency,
          hash: data.hash,
          first_name: firstName,
          last_name: lastName,
          email: user?.email || 'customer@stitchara.com',
          phone: '0771234567',
          address: 'Colombo',
          city: 'Colombo',
          country: 'Sri Lanka',
          recurrence: isOrderMode ? undefined : (hasAnnual && billingCycle === 'annual' ? '1 Year' : '1 Month'),
          duration: isOrderMode ? undefined : 'Forever',
        },
        {
          onCompleted: async (completedOrderId) => {
            setIsProcessing(false);
            setIsVerifying(true);
            setPendingNotice('Verifying payment confirmation...');

            if (isOrderMode) {
              const realOrderId = order?.raw_order_id || order?.id;
              const pollIntervalMs = 2000;
              const maxAttempts = 15;
              let confirmed = false;

              for (let attempt = 0; attempt < maxAttempts; attempt++) {
                try {
                  const { data: refreshedOrder } = await supabase
                    .from('orders')
                    .select('*')
                    .eq('id', realOrderId)
                    .maybeSingle();

                  if (refreshedOrder && refreshedOrder.payment_status && refreshedOrder.payment_status !== 'pending_quote' && refreshedOrder.payment_status !== 'awaiting_payment') {
                    confirmed = true;
                    break;
                  }
                } catch {}
                await new Promise((r) => setTimeout(r, pollIntervalMs));
              }

              setIsVerifying(false);
              if (confirmed) {
                setIsSuccess(true);
                setTimeout(() => {
                  onOrderPaymentSuccess?.(realOrderId);
                  onClose();
                }, 1500);
              } else {
                setIsSuccess(true);
                setTimeout(() => {
                  onOrderPaymentSuccess?.(realOrderId);
                  onClose();
                }, 1500);
              }
            } else {
              const pollIntervalMs = 2000;
              const maxAttempts = 15;
              let confirmed = false;

              for (let attempt = 0; attempt < maxAttempts; attempt++) {
                try {
                  const profile = await fetchUserProfile(user?.id);
                  const effectiveTier = getEffectiveTier(profile);
                  if (effectiveTier === plan) {
                    confirmed = true;
                    break;
                  }
                } catch {}
                await new Promise((r) => setTimeout(r, pollIntervalMs));
              }

              setIsVerifying(false);
              await refreshProfile();
              setIsSuccess(true);
              setTimeout(() => {
                onPaymentSuccess?.(plan);
                onClose();
              }, 1500);
            }
          },
          onDismissed: () => {
            setIsProcessing(false);
            setPaymentError({
              type: 'dismissed',
              message: 'Payment popup was closed before completion.',
            });
          },
          onError: (err) => {
            setIsProcessing(false);
            setPaymentError({
              type: 'error',
              message: err?.message || 'Payment processing failed.',
            });
          },
        }
      );
    } catch (err: any) {
      console.error('[handlePayHerePayment] Exception:', err);
      setIsProcessing(false);
      setPaymentError({
        type: 'error',
        message: err?.message || 'Could not start payment, please try again.',
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
              <p className="text-xs text-[#6B7869] mt-0.5">Choose secure payment method</p>
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
                {isOrderMode ? (
                  isCustomStitched ? (
                    <div className="text-right">
                      <p className="text-sm font-bold text-[#FAF6EE]">
                        {isPayingAdvance ? `50% Advance: LKR ${formatLkr(advanceLkr)}` : `Balance: LKR ${formatLkr(balanceLkr)}`}
                      </p>
                      <p className="text-[11px] text-[#A5B3A2] mt-0.5">
                        Paid LKR {formatLkr(amountPaidLkr)} of LKR {formatLkr(quoteTotalLkr)} total
                      </p>
                    </div>
                  ) : (
                    <LkrPriceDisplay
                      priceLkr={quoteTotalLkr}
                      layout="stacked"
                      lkrClassName="text-2xl font-black text-[#FAF6EE]"
                      usdClassName="text-[11px] text-[#A5B3A2]"
                    />
                  )
                ) : billingCycle === 'annual' ? (
                  <div className="text-right">
                    <p className="text-sm font-bold text-[#FAF6EE]">
                      {`LKR ${formatLkr(Math.round(annualYearlyLkr / 12))} × 12 months = LKR ${formatLkr(annualYearlyLkr)}`}
                    </p>
                    <p className="text-[11px] text-[#E06C38] font-semibold mt-0.5">
                      Annual, billed once (charged today)
                    </p>
                  </div>
                ) : (
                  <div className="text-right">
                    <p className="text-sm font-bold text-[#FAF6EE]">
                      {`LKR ${formatLkr(baseMonthlyLkr)} charged today`}
                    </p>
                    <p className="text-[11px] text-[#A5B3A2] mt-0.5">
                      Monthly, billed monthly
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Custom Stitched Advance Payment Plan & Non-refundable Checkbox */}
            {isOrderMode && isCustomStitched && (
              <div className="mt-3 pt-3 border-t border-[#323D34] text-xs text-[#A5B3A2] space-y-2">
                <p className="leading-relaxed">
                  Pay 50% advance now: <span className="font-bold text-white">LKR {formatLkr(advanceLkr)}</span>. Balance <span className="font-bold text-white">LKR {formatLkr(balanceLkr)}</span> due before shipping.
                </p>
                {isPayingAdvance && (
                  <label className="flex items-start gap-2.5 pt-1 text-xs text-[#FAF6EE] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isNonRefundableChecked}
                      onChange={(e) => setIsNonRefundableChecked(e.target.checked)}
                      className="mt-0.5 accent-[#E06C38] w-4 h-4 rounded cursor-pointer"
                    />
                    <span>I understand the 50% advance is non-refundable</span>
                  </label>
                )}
              </div>
            )}
          </div>

          {/* Feedback & Notice Banners */}
          {paymentError && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-start gap-3 text-xs text-amber-900 animate-fadeIn">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-[#1D231E]">Payment Notice</p>
                <p className="text-[#5A6659] mt-0.5">{paymentError.message}</p>
              </div>
            </div>
          )}

          {isVerifying && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-center gap-3 text-xs text-blue-900 animate-fadeIn">
              <Loader2 className="w-5 h-5 text-blue-600 shrink-0 animate-spin" />
              <div>
                <p className="font-bold text-blue-900">Confirming Payment</p>
                <p className="text-blue-700">{pendingNotice || 'Please wait while we verify your transaction...'}</p>
              </div>
            </div>
          )}

          {isSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-xs text-emerald-900 animate-fadeIn">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <p className="font-bold">Payment Successful!</p>
                <p className="text-emerald-700">Your payment has been recorded successfully.</p>
              </div>
            </div>
          )}

          {/* Payment Mode Selector Tabs (only if amount due < 50,000 and not claimed) */}
          {!hasTransferClaimed && !hasSubClaimPending && (
            <div>
              {exceedsLimit ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 font-medium mb-3">
                  Card payments are available for amounts below LKR 50,000. Please use bank transfer.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 p-1 bg-[#E8E1D2]/60 rounded-2xl mb-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMode('card')}
                    disabled={isProcessing}
                    className={`py-2.5 px-3 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      paymentMode === 'card'
                        ? 'bg-white text-[#1D231E] shadow-xs'
                        : 'text-[#6B7869] hover:text-[#1D231E]'
                    }`}
                  >
                    <CreditCard className="w-4 h-4 text-[#E06C38]" />
                    <span>Visa / Master (PayHere)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMode('bank_transfer')}
                    disabled={isProcessing}
                    className={`py-2.5 px-3 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      paymentMode === 'bank_transfer'
                        ? 'bg-white text-[#1D231E] shadow-xs'
                        : 'text-[#6B7869] hover:text-[#1D231E]'
                    }`}
                  >
                    <Package className="w-4 h-4 text-[#2D5A43]" />
                    <span>Bank transfer</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Conditional Panels */}
          {hasTransferClaimed || hasSubClaimPending ? (
            <div className="p-5 bg-amber-50 border border-amber-200 rounded-2xl text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
                <Clock className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold text-amber-900 leading-relaxed">
                Transfer reported on {transferClaimDate || subClaimDate || 'recently'}. We'll confirm it once the payment reaches our account.
              </p>
              <button
                type="button"
                onClick={handleCancelTransferClaim}
                disabled={isSubmittingClaim}
                className="text-xs font-bold text-[#E06C38] hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                {isSubmittingClaim ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                <span>I made a mistake, cancel this report</span>
              </button>
            </div>
          ) : paymentMode === 'bank_transfer' ? (
            /* Bank Transfer Panel */
            <div className="space-y-4 p-4 bg-white rounded-2xl border border-[#E8E1D2]">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#5A6659] mb-2 flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-[#E06C38]" /> Bank Transfer Details
                </h4>
                <div className="p-3.5 bg-[#FAF6EE] rounded-xl border border-[#E8E1D2] text-xs font-mono text-[#1D231E] whitespace-pre-line leading-relaxed">
                  {bankDetails.trim() || "Bank details will be sent by our team"}
                </div>
              </div>

              <div className="p-3.5 bg-[#1D231E] text-white rounded-xl space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#A5B3A2]">Amount Due Now:</span>
                  <LkrPriceDisplay
                    priceLkr={amountDueNow}
                    layout="inline"
                    lkrClassName="font-bold text-sm text-[#FAF6EE]"
                    usdClassName="text-[10px] text-[#A5B3A2]"
                  />
                </div>
                <div className="flex justify-between items-center text-xs pt-2 border-t border-[#323D34]">
                  <span className="text-[#A5B3A2]">Payment Reference:</span>
                  <span className="font-mono font-bold text-[#E06C38] bg-[#2A342B] px-2.5 py-1 rounded-lg border border-[#3B483C]">
                    {bankRefCode}
                  </span>
                </div>
                <p className="text-[11px] text-[#A5B3A2] italic pt-1">
                  Write this reference in the transfer remarks.
                </p>
              </div>

              {isOrderMode && isCustomStitched && isPayingAdvance && (
                <label className="flex items-start gap-2.5 text-xs text-[#1D231E] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isNonRefundableChecked}
                    onChange={(e) => setIsNonRefundableChecked(e.target.checked)}
                    className="mt-0.5 accent-[#E06C38] w-4 h-4 rounded cursor-pointer"
                  />
                  <span className="font-medium">I understand the 50% advance is non-refundable</span>
                </label>
              )}

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#1D231E]">
                  Transfer Note (Optional — transfer date or bank reference, max 500 chars)
                </label>
                <input
                  type="text"
                  maxLength={500}
                  value={bankTransferNote}
                  onChange={(e) => setBankTransferNote(e.target.value)}
                  placeholder="e.g. Bank Ref ABC12345 or Transferred on Oct 24"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF6EE] border border-[#E8E1D2] text-xs text-[#1D231E] focus:outline-none focus:ring-2 focus:ring-[#E06C38]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#1D231E]">
                  Deposit Slip Upload (Optional — JPG, PNG, WebP or PDF, max 5MB)
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setSlipFile(file);
                  }}
                  className="w-full text-xs text-[#6B7869] file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#2D5A43] file:text-white hover:file:bg-[#234734] cursor-pointer"
                />
                {slipFile && (
                  <p className="text-[11px] text-emerald-700 font-medium">
                    Attached: {slipFile.name} ({(slipFile.size / (1024 * 1024)).toFixed(2)} MB)
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={handleSubmitBankTransferClaim}
                disabled={isSubmittingClaim || (isOrderMode && isCustomStitched && isPayingAdvance && !isNonRefundableChecked)}
                className="w-full py-3.5 px-5 rounded-2xl bg-[#2D5A43] hover:bg-[#234734] text-white font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
              >
                {isSubmittingClaim ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Submitting Report...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-[#FAF6EE]" />
                    <span>I've made the transfer</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            /* PayHere Card Checkout Action Button */
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
                  disabled={isProcessing || (isOrderMode && isCustomStitched && isPayingAdvance && !isNonRefundableChecked) || isLegacyQuote}
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
                        {isOrderMode
                          ? isCustomStitched
                            ? isPayingAdvance
                              ? `Pay 50% advance (${formatLkrPrice(advanceLkr)})`
                              : `Pay balance (${formatLkrPrice(balanceLkr)})`
                            : `Pay ${formatLkrPrice(quoteTotalLkr)} with PayHere`
                          : `Pay ${formatLkrPrice(activePriceLkr)} with PayHere`
                        }
                      </span>
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Trust Badges */}
          <div className="flex items-center justify-center gap-4 text-[11px] text-[#5A6659] pt-2">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Verified Secure Gateway</span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Lock className="w-4 h-4 text-emerald-600" />
              <span>256-Bit SSL Encryption</span>
            </span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
