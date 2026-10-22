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
  Truck,
<<<<<<< HEAD
  Upload,
  FileText,
  Banknote,
  Copy,
  Check as CheckIcon,
=======
  Clock
>>>>>>> fadacdeb12c37add5c94b9fc26c1a843fdcea2f9
} from 'lucide-react';
import { supabase, fetchUserProfile, fetchSubscriptionPlans, fetchUserStitchOrders, fetchBankTransferDetails, setBankTransferClaim } from '../lib/supabase';
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

<<<<<<< HEAD
  // Bank transfer state
  const [transferReported, setTransferReported] = useState<{ date: string; note: string } | null>(null);
  const [bankDetails, setBankDetails] = useState<string | null>(null);
  const [transferSlip, setTransferSlip] = useState<File | null>(null);
  const [transferSlipUrl, setTransferSlipUrl] = useState<string | null>(null);
  const [transferNote, setTransferNote] = useState('');
  const [isUploadingSlip, setIsUploadingSlip] = useState(false);
  const [amountExceedsLimit, setAmountExceedsLimit] = useState(false);
  const [showBankTransferPanel, setShowBankTransferPanel] = useState(false);
=======
  // Bank transfer states
  const [paymentMode, setPaymentMode] = useState<'card' | 'bank_transfer'>('card');
  const [bankDetails, setBankDetails] = useState<string>('');
  const [bankTransferNote, setBankTransferNote] = useState<string>('');
  const [isSubmittingClaim, setIsSubmittingClaim] = useState<boolean>(false);
>>>>>>> fadacdeb12c37add5c94b9fc26c1a843fdcea2f9

  // Dynamic plan prices from database
  const [planPrices, setPlanPrices] = useState<Record<string, { price_lkr: number; yearly_price_lkr: number | null }>>({
    pro: { price_lkr: 2700, yearly_price_lkr: null },
    studio: { price_lkr: 5700, yearly_price_lkr: null },
  });

  useEffect(() => {
    let active = true;
    async function loadPricesAndBank() {
      try {
        const [rows, bankText] = await Promise.all([
          fetchSubscriptionPlans(),
          fetchBankTransferDetails(),
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
        }
      } catch (e) {
        console.warn('[PaymentGatewayModal] Error loading initial setup:', e);
      }
    }
    if (isOpen) {
      loadPricesAndBank();
      setPaymentMode('card');
      setBankTransferNote('');
      setPaymentError(null);
    }
    return () => {
      active = false;
    };
  }, [isOpen, order]);

  // Fetch bank transfer details from app_settings
  useEffect(() => {
    let active = true;
    async function loadBankDetails() {
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('setting_value')
          .eq('setting_key', 'bank_transfer_details')
          .maybeSingle();
        if (active && !error && data?.setting_value) {
          setBankDetails(data.setting_value);
        }
      } catch (e) {
        console.warn('[PaymentGatewayModal] Error loading bank transfer details:', e);
      }
    }
    if (isOpen) {
      loadBankDetails();
    }
    return () => { active = false; };
  }, [isOpen]);

  // Determine if amount exceeds PayHere limit (50,000 LKR)
  const activeAmountLkr = isOrderMode ? quoteTotalLkr : activePriceLkr;
  useEffect(() => {
    if (activeAmountLkr > 50000) {
      setAmountExceedsLimit(true);
      setShowBankTransferPanel(true);
    } else {
      setAmountExceedsLimit(false);
      setShowBankTransferPanel(false);
    }
  }, [activeAmountLkr, isOrderMode]);

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
  const progressPercent = Number(order?.progress_percent || order?.request_details?.progress_percent || 0);
  const isDepositPaid = order?.payment_status === 'deposit_paid';
  const isPayingAdvance = isCustomStitched && !isDepositPaid;
  const isPayingBalance = isCustomStitched && isDepositPaid && progressPercent >= 100;

  const expectedPayAmount = isCustomStitched
    ? (isPayingAdvance ? advanceLkr : (isPayingBalance ? Math.max(0, quoteTotalLkr - Math.max(amountPaidLkr, advanceLkr)) : Math.max(0, quoteTotalLkr - amountPaidLkr)))
    : Math.max(0, quoteTotalLkr - amountPaidLkr);

  const orderRawId = String(order?.raw_order_id || order?.id || '').replace('order_', '');
  const bankRefCode = `SM-${orderRawId.slice(0, 8).toUpperCase()}`;
  const hasTransferClaimed = Boolean(order?.transfer_claimed_at && order?.payment_status !== 'paid');
  const transferClaimDate = order?.transfer_claimed_at ? new Date(order.transfer_claimed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

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

  const handleCancelTransferClaim = async () => {
    setIsSubmittingClaim(true);
    setPaymentError(null);
    try {
      const res = await setBankTransferClaim(order?.raw_order_id || order?.id, false, null);
      if (res.success) {
        window.dispatchEvent(new CustomEvent('orderUpdated', { detail: { orderId: order?.raw_order_id || order?.id } }));
        onClose();
      } else {
        setPaymentError({ type: 'error', message: res.message || 'Unable to cancel bank transfer report' });
      }
    } catch (err: any) {
      setPaymentError({ type: 'error', message: err?.message || 'Unable to cancel bank transfer report' });
    } finally {
      setIsSubmittingClaim(false);
    }
  };

  const handleSubmitBankTransferClaim = async () => {
    if (isCustomStitched && isPayingAdvance && !isNonRefundableChecked) {
      return;
    }
    setIsSubmittingClaim(true);
    setPaymentError(null);
    try {
      const res = await setBankTransferClaim(order?.raw_order_id || order?.id, true, bankTransferNote.trim() || null);
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

<<<<<<< HEAD
      // Amount exceeds PayHere limit: show bank transfer panel instead of checkout
      if (data?.amount_exceeds_50k) {
        setAmountExceedsLimit(true);
        setShowBankTransferPanel(true);
        setIsProcessing(false);
        setPaymentError(null);
        return;
      }

      // If the create-payhere-hash call returns an error or a non-2xx response,
      // or the response is missing hash, merchant_id, order_id, amount or currency,
      // do NOT start the PayHere checkout. Close loading state and show a clear error message.
=======
>>>>>>> fadacdeb12c37add5c94b9fc26c1a843fdcea2f9
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
        let exceedsLimit = false;

        if (error && typeof error === 'object' && 'context' in error && error.context instanceof Response) {
          try {
            const errJson = await error.context.clone().json();
            errorPayload = { status: error.context.status, body: errJson, error };
            const errStr = JSON.stringify(errJson);
            if (errStr.includes('Amount exceeds the current payment limit')) {
              exceedsLimit = true;
              errMsg = 'This amount is above our online payment limit. Please pay by bank transfer';
            } else if (errStr.includes('Balance is not due yet')) {
              errMsg = 'The balance is not payable yet';
            }
          } catch {}
        }
        if (data?.error && String(data.error).includes('Amount exceeds the current payment limit')) {
          exceedsLimit = true;
          errMsg = 'This amount is above our online payment limit. Please pay by bank transfer';
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

        if (exceedsLimit) {
          setPaymentMode('bank_transfer');
        }
        return;
      }

      if (isOrderMode) {
        if (Math.abs(Number(data.amount) - expectedPayAmount) > 0.01) {
          setIsProcessing(false);
          setPaymentError({
            type: 'error',
            message: 'Could not start payment, please try again',
          });
          return;
        }
      }

      const rawName = isOrderMode ? (order?.customer_name || user?.name || 'Crafter Customer') : (user?.name || 'Crafter Member');
      const nameParts = rawName.trim().split(/\s+/);
      const firstName = nameParts[0] || 'Crafter';
      const lastName = nameParts.slice(1).join(' ') || (isOrderMode ? 'Customer' : 'Member');

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
              const maxAttempts = 15;
              let confirmed = false;
              const expectingDeposit = isPayingAdvance;

              for (let attempt = 0; attempt < maxAttempts; attempt++) {
                await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
                try {
                  const refreshedOrders = await fetchUserStitchOrders(user?.id, user?.email);
                  const currentOrder = refreshedOrders.find(
                    (o) => String(o.raw_order_id || o.id) === String(realOrderId)
                  );
                  if (currentOrder) {
                    if (expectingDeposit) {
                      if (currentOrder.payment_status === 'deposit_paid' || currentOrder.payment_status === 'paid' || currentOrder.fulfillment_status === 'processing') {
                        confirmed = true;
                        break;
                      }
                    } else {
                      if (currentOrder.payment_status === 'paid' || currentOrder.fulfillment_status === 'processing') {
                        confirmed = true;
                        break;
                      }
                    }
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
              const pollIntervalMs = 2000;
              const maxAttempts = 15;
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

  // Handle bank transfer slip upload
  const handleSlipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setTransferSlip(file);
      // Preview the file
      setTransferSlipUrl(URL.createObjectURL(file));
    }
  };

  // Upload deposit slip to Supabase storage
  const uploadDepositSlip = async (file: File, orderId: string): Promise<string | null> => {
    try {
      setIsUploadingSlip(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `deposit-slips/${orderId}/${Date.now()}.${fileExt}`;
      const { error } = await supabase.storage
        .from('payment-proofs')
        .upload(fileName, file);
      if (error) {
        console.error('[PaymentGatewayModal] Slip upload error:', error);
        return null;
      }
      const { data: urlData } = supabase.storage
        .from('payment-proofs')
        .getPublicUrl(fileName);
      return urlData?.publicUrl || null;
    } catch (err) {
      console.error('[PaymentGatewayModal] Slip upload exception:', err);
      return null;
    } finally {
      setIsUploadingSlip(false);
    }
  };

  // Record bank transfer claim via RPC
  const handleBankTransfer = async () => {
    if (!user) {
      setPaymentError({ type: 'error', message: 'User session not found.' });
      return;
    }

    const realOrderId = order?.raw_order_id || order?.id;
    if (!realOrderId) {
      setPaymentError({ type: 'error', message: 'Order ID not found.' });
      return;
    }

    // Upload slip first if provided
    let slipUrl: string | null = null;
    if (transferSlip) {
      slipUrl = await uploadDepositSlip(transferSlip, String(realOrderId));
    }

    const noteParts = [transferNote.trim()];
    if (slipUrl) noteParts.push(`Slip: ${slipUrl}`);
    const finalNote = noteParts.join(' | ').slice(0, 500);

    try {
      setIsProcessing(true);
      setPaymentError(null);

      const { error: rpcError } = await supabase.rpc('set_bank_transfer_claim', {
        p_order_id: realOrderId,
        p_claimed: true,
        p_note: finalNote,
      });

      if (rpcError) {
        console.error('[PaymentGatewayModal] Bank transfer claim error:', rpcError);
        setPaymentError({
          type: 'error',
          message: rpcError.message || 'Failed to record transfer. Please try again.',
        });
        setIsProcessing(false);
        return;
      }

      setTransferReported({ date: new Date().toISOString(), note: finalNote });
      setIsProcessing(false);
      setShowBankTransferPanel(false);
    } catch (err: any) {
      console.error('[PaymentGatewayModal] Bank transfer exception:', err);
      setIsProcessing(false);
      setPaymentError({
        type: 'error',
        message: err.message || 'Failed to record transfer.',
      });
    }
  };

  const cancelTransferReport = () => {
    setTransferReported(null);
    setShowBankTransferPanel(true);
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
              <p className="text-xs text-[#6B7869] mt-0.5">Pay securely via PayHere or Bank Transfer</p>
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
                        {isPayingAdvance ? `50% Advance: LKR ${advanceLkr.toLocaleString()}` : isPayingBalance ? `Balance: LKR ${expectedPayAmount.toLocaleString()}` : `Total: LKR ${quoteTotalLkr.toLocaleString()}`}
                      </p>
                      <p className="text-[11px] text-[#A5B3A2] mt-0.5">
                        Paid LKR {amountPaidLkr.toLocaleString()} of LKR {quoteTotalLkr.toLocaleString()} total
                      </p>
                    </div>
                  ) : (
                    <LkrPriceDisplay
                      priceLkr={expectedPayAmount}
                      layout="stacked"
                      lkrClassName="text-2xl font-black text-[#FAF6EE]"
                      usdClassName="text-[11px] text-[#A5B3A2]"
                    />
                  )
                ) : billingCycle === 'annual' ? (
                  <div className="text-right">
                    <p className="text-sm font-bold text-[#FAF6EE]">
                      {`LKR ${Math.round(annualYearlyLkr / 12).toLocaleString()} × 12 months = LKR ${annualYearlyLkr.toLocaleString('.00', { minimumFractionDigits: 2 })}`}
                    </p>
                    <p className="text-[11px] text-[#E06C38] font-semibold mt-0.5">
                      Annual, billed once (charged today)
                    </p>
                  </div>
                ) : (
                  <div className="text-right">
                    <p className="text-sm font-bold text-[#FAF6EE]">
                      {`LKR ${baseMonthlyLkr.toLocaleString('.00', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} charged today`}
                    </p>
                    <p className="text-[11px] text-[#A5B3A2] mt-0.5">
                      Monthly, billed monthly
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Cycle Selector (Subscription mode only) */}
            {!isOrderMode && hasAnnual && (
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
                  <span className="text-[10px] opacity-80">LKR {Math.round(annualYearlyLkr / 12).toLocaleString()} / mo</span>
                </button>
              </div>
            )}
          </div>

          {/* Payment Mode Selector Tabs (Order Mode only & not transfer claimed) */}
          {isOrderMode && !hasTransferClaimed && (
            <div className="grid grid-cols-2 gap-2 p-1 bg-[#E8E1D2]/60 rounded-2xl">
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
                <span>Pay online (card)</span>
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
                <span>Pay by bank transfer</span>
              </button>
            </div>
          )}

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
                  className="mt-2 text-xs font-bold text-[#E06C38] hover:underline cursor-pointer"
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
                <p className="text-emerald-700">Your transaction has been recorded successfully.</p>
              </div>
            </div>
          )}

<<<<<<< HEAD
          {/* PayHere Checkout Action Button (hidden when amount exceeds limit)} */}
          <div className="pt-2">
<<<<<<< HEAD
            {!amountExceedsLimit && (
              <>
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
=======
            {isLegacyQuote ? (
=======
          {/* Conditional Panels */}
          {hasTransferClaimed ? (
            <div className="p-5 bg-amber-50 border border-amber-200 rounded-2xl text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
                <Clock className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold text-amber-900 leading-relaxed">
                Transfer reported on {transferClaimDate || 'recently'}. We'll confirm it once the payment reaches our account.
              </p>
>>>>>>> fadacdeb12c37add5c94b9fc26c1a843fdcea2f9
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
          ) : isOrderMode && paymentMode === 'bank_transfer' ? (
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
                    priceLkr={expectedPayAmount}
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

              {isCustomStitched && isPayingAdvance && (
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

              <button
                type="button"
                onClick={handleSubmitBankTransferClaim}
                disabled={isSubmittingClaim || (isCustomStitched && isPayingAdvance && !isNonRefundableChecked)}
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
>>>>>>> 83b25b4b76cf98a823d1958c682fe02cdf2fb9bc
                )}
<<<<<<< HEAD
              </>
            )}
          </div>
=======
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
                              : isPayingBalance
                              ? `Pay balance (${formatLkrPrice(expectedPayAmount)})`
                              : `Pay ${formatLkrPrice(quoteTotalLkr)} with PayHere`
                            : `Pay ${formatLkrPrice(expectedPayAmount)} with PayHere`
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
>>>>>>> fadacdeb12c37add5c94b9fc26c1a843fdcea2f9

          {/* Trust Badges */}
          <div className="flex items-center justify-center gap-4 text-[11px] text-[#5A6659] pt-2">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Verified Secure Gateway</span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-[#5A6659]" />
              <span>256-bit TLS Encryption</span>
            </span>
          </div>

          {/* Bank Transfer Panel */}
          {amountExceedsLimit && showBankTransferPanel && (
            <div className="pt-4 space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-start gap-3">
                <Banknote className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold text-[#1D231E]">Pay by Bank Transfer</p>
                  <p className="text-xs text-[#5A6659] mt-0.5">
                    This amount exceeds our online payment limit (LKR 50,000). Please pay via bank transfer instead.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold text-[#1D231E] uppercase tracking-wider">Bank Details</h4>
                {bankDetails ? (
                  <div className="bg-[#1D231E]/5 border border-[#1D231E]/20 rounded-xl p-3 text-xs text-[#5A6659] whitespace-pre-wrap break-words font-mono">
                    {bankDetails}
                  </div>
                ) : (
                  <div className="bg-[#1D231E]/5 border border-[#1D231E]/20 rounded-xl p-3 text-xs text-[#5A6659]">
                    Bank details will be sent by our team.
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold text-[#1D231E] uppercase tracking-wider">Amount Due Now</h4>
                <LkrPriceDisplay
                  priceLkr={activeAmountLkr}
                  layout="inline"
                  lkrClassName="font-bold text-[#1D231E] text-lg"
                  usdClassName="text-xs text-[#5A6659]"
                />
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold text-[#1D231E] uppercase tracking-wider">Payment Reference</h4>
                <div className="flex items-center gap-2 bg-[#FAF6EE] border border-[#E8E1D2] rounded-xl p-2">
                  <span className="font-mono text-xs font-bold text-[#1D231E]">
                    SM-{String(order?.raw_order_id || order?.id || '').toUpperCase().slice(0, 8)}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(`SM-${String(order?.raw_order_id || order?.id || '').toUpperCase().slice(0, 8)}`);
                    }}
                    className="p-1 text-[#5A6659] hover:text-[#1D231E] hover:bg-[#E8E1D2] rounded transition-colors"
                    title="Copy reference"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
                <p className="text-[10px] text-[#5A6659] mt-0.5">
                  Write this reference in the transfer remarks.
                </p>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#1D231E] mb-1">
                  Optional Note (transfer date or bank reference)
                </label>
                <textarea
                  value={transferNote}
                  onChange={(e) => setTransferNote(e.target.value)}
                  maxLength={500}
                  rows={2}
                  className="w-full px-3 py-2 bg-white border border-[#D5CDBC] rounded-xl text-xs text-[#1D231E] focus:outline-none focus:ring-2 focus:ring-[#E06C38]/40"
                  placeholder="e.g. Transfer on 15 Oct from Commercial Bank..."
                ></textarea>
                <p className="text-[10px] text-[#5A6659]">
                  {transferNote.length}/500 characters
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-[#1D231E] mb-1">
                  Upload Deposit Slip / Payment Proof
                </label>
                <div className="border-2 border-dashed border-[#D5CDBC] rounded-xl p-4 flex flex-col items-center gap-2 cursor-pointer bg-[#FAF6EE]/50 hover:bg-[#FAF6EE] transition-colors">
                  <Upload className="w-6 h-6 text-[#5A6659]" />
                  <span className="text-xs text-[#5A6659] font-medium">
                    {transferSlip ? 'Slip uploaded' : 'Choose file (PDF, JPG, PNG)'}
                  </span>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleSlipChange}
                    className="hidden"
                  />
                </div>
                {transferSlipUrl && (
                  <div className="flex items-center gap-2 text-xs text-[#1D231E]">
                    <FileText className="w-3 h-3 text-[#E06C38]" />
                    <span>Deposit slip attached</span>
                  </div>
                )}
                {isUploadingSlip && (
                  <div className="flex items-center gap-2 text-xs text-[#5A6659]">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Uploading slip...</span>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleBankTransfer}
                disabled={isProcessing || isUploadingSlip}
                className={`w-full py-4 px-6 rounded-2xl font-bold text-sm sm:text-base transition-all duration-200 flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                  isProcessing || isUploadingSlip
                    ? 'bg-[#93A28F] text-white cursor-not-allowed'
                    : 'bg-[#E06C38] hover:bg-[#d05c28] text-white cursor-pointer hover:scale-[1.01] active:scale-[0.99]'
                }`}
              >
                {isProcessing || isUploadingSlip ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Recording Transfer...</span>
                  </>
                ) : (
                  <>
                    <Banknote className="w-4 h-4" />
                    <span>I've Made the Transfer</span>
                  </>
                )}
              </button>

              <p className="text-[10px] text-[#6B7869] text-center mt-1">
                We'll verify your transfer and update your order once the payment reaches our account.
              </p>
            </div>
          )}

          {/* Transfer Reported State */}
          {transferReported && (
            <div className="pt-4">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3 text-xs text-amber-900">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                <div className="flex-1">
                  <p className="font-bold text-[#1D231E]">Transfer Reported</p>
                  <p className="text-amber-800 mt-0.5">
                    Transfer reported on{' '}
                    <span className="font-bold">
                      {new Date(transferReported.date).toLocaleDateString()}
                    </span>
                    . We'll confirm it once the payment reaches our account.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={cancelTransferReport}
                className="mt-2 text-xs font-bold text-[#E06C38] hover:underline"
              >
                I made a mistake, cancel this report
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
