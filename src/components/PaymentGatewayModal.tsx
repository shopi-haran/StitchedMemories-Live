import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useModalStack } from '../hooks/useModalStack';
import { useAuth } from '../context/AuthContext';
import { 
  supabase, 
  fetchSubscriptionPlans, 
  fetchUserProfile, 
  getEffectiveTier 
} from '../lib/supabase';
import { PAYHERE_LIMIT_LKR, requiresBankTransfer, startCheckoutSession, PayHereHashRequest } from '../lib/payhere';
import { PaymentMethodModal } from './PaymentMethodModal';
import { BankTransferModal } from './BankTransferModal';

export interface PaymentGatewayModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan?: 'pro' | 'studio';
  billingCycle?: 'monthly' | 'annual';
  user: { id?: string; name: string; email: string; avatar_url?: string } | null;
  onPaymentSuccess?: (updatedTier?: 'pro' | 'studio') => void;
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
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Dynamic plan prices from database
  const [planPrices, setPlanPrices] = useState<Record<string, { price_lkr: number; yearly_price_lkr: number | null }>>({
    pro: { price_lkr: 2700, yearly_price_lkr: null },
    studio: { price_lkr: 5700, yearly_price_lkr: null },
  });

  const [isNonRefundableChecked, setIsNonRefundableChecked] = useState(false);

  // Modal flow state: 'method' | 'bank' | 'processing'
  const [activeSubModal, setActiveSubModal] = useState<'method' | 'bank' | 'none'>('none');

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
        console.warn('[PaymentGatewayModal] Error loading initial prices:', e);
      }
    }
    if (isOpen) {
      loadPrices();
      setIsNonRefundableChecked(false);
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
  const orderTitle = order?.title || `Custom Keepsake #${String(order?.raw_order_id || order?.id || '').replace('order_', '').slice(-8)}`;

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
  const activePriceLkr = hasAnnual && billingCycle === 'annual' ? annualYearlyLkr! : baseMonthlyLkr;

  const amountDueNow = isOrderMode ? expectedPayAmount : activePriceLkr;
  const exceedsLimit = requiresBankTransfer(amountDueNow);

  // Initialize activeSubModal on open
  useEffect(() => {
    if (isOpen) {
      console.log('[pay] entry', { isOrderMode, plan, billingCycle, order, quote });
      console.log('[pay] amount due', amountDueNow, { exceedsLimit });
      if (exceedsLimit) {
        console.log('[pay] bank window opened', { amountDueNow, exceedsLimit });
        setActiveSubModal('bank');
      } else {
        console.log('[pay] chooser opened', { amountDueNow, exceedsLimit });
        setActiveSubModal('method');
      }
    }
  }, [isOpen, amountDueNow, exceedsLimit]);

  const modalTitle = isOrderMode ? orderTitle : `${planName} (${billingCycle === 'annual' && hasAnnual ? 'Annual' : 'Monthly'})`;
  const modalSubtitle = isOrderMode 
    ? `Order #${String(order?.raw_order_id || order?.id || '').replace('order_', '').slice(-8)} • Handcrafted Keepsake`
    : `Billed ${billingCycle === 'annual' && hasAnnual ? 'annually' : 'monthly'} • Cancel anytime`;

  // Handlers for PayHere
  const handleStartPayHere = async () => {
    if (isOrderMode && isCustomStitched && isPayingAdvance && !isNonRefundableChecked) {
      setPaymentError('Please check the non-refundable agreement checkbox for custom stitched 50% advance.');
      return;
    }

    setIsProcessing(true);
    setPaymentError(null);

    try {
      const requestPayload: PayHereHashRequest = isOrderMode
        ? { kind: 'order', orderRowId: order?.raw_order_id || order?.id }
        : { kind: 'subscription', tier: plan, period: hasAnnual && billingCycle === 'annual' ? 'yearly' : 'monthly' };

      const itemTitle = isOrderMode ? orderTitle : `StitchedMemories ${planName} (${billingCycle})`;
      console.log('[pay] payhere start', { requestPayload, itemTitle, amountDueNow });

      const result = await startCheckoutSession(
        {
          request: requestPayload,
          user,
          itemTitle,
        },
        {
          onCompleted: async (completedOrderId) => {
            console.log('[PayHere] Payment completed:', completedOrderId);
            if (isOrderMode) {
              onOrderPaymentSuccess?.(order?.raw_order_id || order?.id);
            } else {
              await refreshProfile();
              onPaymentSuccess?.(plan);
            }
            onClose();
          },
          onDismissed: () => {
            setIsProcessing(false);
          },
          onError: (err) => {
            console.error('[PayHere] Error:', err);
            setIsProcessing(false);
            setPaymentError('Payment failed or was canceled. Please try again.');
          },
        }
      );

      if (!result.success) {
        setIsProcessing(false);
        if (result.exceedsLimit) {
          setActiveSubModal('bank');
        } else {
          setPaymentError(result.error || 'Could not start payment, please try again');
        }
      }
    } catch (err: any) {
      console.error('[PaymentGatewayModal] PayHere error:', err);
      setIsProcessing(false);
      setActiveSubModal('bank');
    }
  };

  const handleBankTransferSuccess = async () => {
    if (isOrderMode) {
      window.dispatchEvent(new CustomEvent('orderUpdated', { detail: { orderId: order?.raw_order_id || order?.id } }));
      onOrderPaymentSuccess?.(order?.raw_order_id || order?.id);
    } else {
      await refreshProfile();
      onPaymentSuccess?.(plan);
    }
    onClose();
  };

  if (isProcessing) {
    return createPortal(
      <div className="fixed inset-0 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm z-[9999]">
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center space-y-4 shadow-2xl border border-[#E8E1D2]">
          <Loader2 className="w-10 h-10 animate-spin text-[#E06C38] mx-auto" />
          <h4 className="font-bold text-base text-[#1D231E]">Preparing Secure Checkout...</h4>
          <p className="text-xs text-[#5A6659]">Connecting to PayHere payment gateway securely.</p>
        </div>
      </div>,
      document.body
    );
  }

  return (
    <>
      {activeSubModal === 'method' && (
        <PaymentMethodModal
          isOpen={activeSubModal === 'method'}
          onClose={onClose}
          title={modalTitle}
          subtitle={modalSubtitle}
          amountLkr={amountDueNow}
          onSelectPayHere={handleStartPayHere}
          onSelectBankTransfer={() => setActiveSubModal('bank')}
          requiresNonRefundableCheckbox={isOrderMode && isCustomStitched && isPayingAdvance}
          isNonRefundableChecked={isNonRefundableChecked}
          onNonRefundableCheckChange={setIsNonRefundableChecked}
        />
      )}

      {activeSubModal === 'bank' && (
        <BankTransferModal
          isOpen={activeSubModal === 'bank'}
          onClose={onClose}
          user={user}
          tier={plan}
          period={hasAnnual && billingCycle === 'annual' ? 'annual' : 'monthly'}
          order={order}
          amountLkr={amountDueNow}
          onSuccess={handleBankTransferSuccess}
        />
      )}

      {paymentError && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[10000] bg-rose-50 border border-rose-200 text-rose-900 text-xs font-bold px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{paymentError}</span>
          <button onClick={() => setPaymentError(null)} className="ml-2 text-rose-500 hover:text-rose-900">×</button>
        </div>
      )}
    </>
  );
};
