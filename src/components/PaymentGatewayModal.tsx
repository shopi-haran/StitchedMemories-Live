import React, { useState } from 'react';
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
import { updateUserTier, updateUserPlanSelection } from '../lib/supabase';
import { useModalStack } from '../hooks/useModalStack';
import { DualPrice } from './DualPrice';
import { createPayHereHash, startPayHereCheckout, PAYHERE_NOTIFY_URL } from '../lib/payhere';

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
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>(initialBillingCycle);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [paymentError, setPaymentError] = useState<{
    type: 'dismissed' | 'error';
    message: string;
  } | null>(null);

  if (!isOpen || typeof document === 'undefined') return null;

  const planName = plan === 'pro' ? 'Pro Crafter Plan' : 'Studio Plan';
  const monthlyPrice = plan === 'pro' ? 9 : 19;
  const annualPrice = plan === 'pro' ? 7 : 15;
  const currentMonthlyRate = billingCycle === 'annual' ? annualPrice : monthlyPrice;
  const totalBilled = billingCycle === 'annual' ? annualPrice * 12 : monthlyPrice;

  const handlePayHerePayment = async () => {
    setIsProcessing(true);
    setPaymentError(null);

    try {
      const orderId = `sub-${user?.id || 'guest'}-${Date.now()}`;
      const amount = totalBilled;

      const hashRes = await createPayHereHash({
        order_id: orderId,
        amount,
        currency: 'USD',
      });

      const nameParts = (user?.name || 'Crafter Member').trim().split(/\s+/);
      const firstName = nameParts[0] || 'Crafter';
      const lastName = nameParts.slice(1).join(' ') || 'Member';

      await startPayHereCheckout(
        {
          sandbox: true,
          merchant_id: hashRes.merchant_id,
          return_url: window.location.href,
          cancel_url: window.location.href,
          notify_url: PAYHERE_NOTIFY_URL,
          order_id: orderId,
          items: `StitchedMemories ${planName} (${billingCycle})`,
          amount: amount.toFixed(2),
          currency: 'USD',
          recurrence: billingCycle === 'annual' ? '1 Year' : '1 Month',
          duration: 'Forever',
          hash: hashRes.hash,
          first_name: firstName,
          last_name: lastName,
          email: user?.email || '',
          phone: '0771234567',
          address: 'Digital Subscription',
          city: 'Colombo',
          country: 'Sri Lanka',
        },
        {
          onCompleted: async (completedOrderId) => {
            console.log('[PaymentGatewayModal] PayHere completed:', completedOrderId);
            if (user?.id || user?.email) {
              await updateUserTier(user.id || user.email, user.email, plan);
              await updateUserPlanSelection(user.id || user.email, user.email, true);
            }
            setIsSuccess(true);
            setTimeout(() => {
              onPaymentSuccess(plan);
            }, 1200);
          },
          onDismissed: () => {
            console.log('[PaymentGatewayModal] PayHere dismissed');
            setIsProcessing(false);
            setPaymentError({
              type: 'dismissed',
              message: 'Payment checkout was dismissed. You can retry checkout anytime.',
            });
          },
          onError: (error) => {
            console.error('[PaymentGatewayModal] PayHere error:', error);
            setIsProcessing(false);
            setPaymentError({
              type: 'error',
              message: typeof error === 'string' ? error : 'Payment could not be completed. Please try again.',
            });
          },
        }
      );
    } catch (err: any) {
      console.error('[PaymentGatewayModal] Checkout launch error:', err);
      setIsProcessing(false);
      setPaymentError({
        type: 'error',
        message: err?.message || 'Failed to start payment checkout. Please try again.',
      });
    }
  };

  return createPortal(
    <div 
      data-modal-overlay="true"
      data-modal-id={modalId}
      style={{ zIndex }}
      className="fixed inset-0 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in"
      onClick={() => {
        if (!isProcessing && onClose) onClose();
      }}
    >
      <div 
        className="relative w-full max-w-2xl bg-[#FAF6EE] border border-[#E8E1D2] rounded-3xl shadow-2xl overflow-hidden text-[#1D231E] max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div className="p-5 sm:p-6 bg-[#1D231E] text-white flex items-center justify-between relative shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E06C38]/20 text-[#E06C38] flex items-center justify-center border border-[#E06C38]/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-[#FAF6EE]">PayHere Checkout</h2>
                <span className="text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                  Sandbox Active
                </span>
              </div>
              <p className="text-xs text-[#A5B3A2]">
                Complete your upgrade to the <strong className="text-white">{planName}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-2 text-[#A5B3A2] hover:text-white hover:bg-white/10 rounded-full transition-all cursor-pointer disabled:opacity-50"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div data-modal-scroll="true" className="p-6 sm:p-8 overflow-y-auto space-y-6">
          
          {/* Payment Feedback Banner */}
          {paymentError && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900 animate-fadeIn">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-[#1D231E]">
                    {paymentError.type === 'dismissed' ? 'Payment Dismissed' : 'Payment Issue'}
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
                  onClick={handlePayHerePayment}
                  disabled={isProcessing}
                  className="px-4 py-1.5 rounded-lg bg-[#E06C38] hover:bg-[#d05c28] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Retry Payment</span>
                </button>
              </div>
            </div>
          )}

          {/* Plan Summary Card */}
          <div className="bg-white border border-[#E8E1D2] rounded-2xl p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8E1D2]">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#E06C38] bg-[#E06C38]/10 px-2.5 py-1 rounded-full">
                  Selected Membership
                </span>
                <h3 className="text-xl font-bold text-[#1D231E] mt-1.5">{planName}</h3>
                <p className="text-xs text-[#5A6659]">
                  {plan === 'pro' 
                    ? 'Ad-free experience, unlimited grid sizes, 150 thread colors & watermark-free exports.'
                    : 'Full studio suite with unlimited colors, DMC/Anchor color editor & 15% discount on custom orders.'}
                </p>
              </div>

              <div className="text-left sm:text-right shrink-0">
                <DualPrice
                  amount={currentMonthlyRate}
                  period="/mo"
                  layout="stacked"
                  usdClassName="text-xl sm:text-2xl font-extrabold text-[#1D231E]"
                  periodClassName="text-xs text-[#5A6659] font-normal"
                  lkrClassName="text-xs text-[#70806E] font-normal"
                />
                <div className="text-[11px] text-[#8A9588] font-medium mt-1">
                  {billingCycle === 'annual' ? (
                    <span>Billed annually: <DualPrice amount={totalBilled} layout="inline" usdClassName="font-semibold text-[#1D231E]" lkrClassName="text-[10px] text-[#8A9588]" /></span>
                  ) : 'Billed monthly'}
                </div>
              </div>
            </div>

            {/* Billing Cycle Toggle */}
            <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <span className="font-bold text-[#3A4538]">Billing Frequency:</span>
              <div className="inline-flex bg-[#FAF6EE] p-1 rounded-full border border-[#E8E1D2] flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => setBillingCycle('monthly')}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    billingCycle === 'monthly' ? 'bg-[#1D231E] text-white' : 'text-[#6B7869]'
                  }`}
                >
                  Monthly (<DualPrice amount={monthlyPrice} period="/mo" layout="inline" usdClassName="font-semibold" lkrClassName={billingCycle === 'monthly' ? 'text-white/70' : 'text-[#6B7869]'} />)
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle('annual')}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    billingCycle === 'annual' ? 'bg-[#E06C38] text-white' : 'text-[#6B7869]'
                  }`}
                >
                  Annual (<DualPrice amount={annualPrice} period="/mo" layout="inline" usdClassName="font-semibold" lkrClassName={billingCycle === 'annual' ? 'text-white/80' : 'text-[#6B7869]'} /> - Save 20%)
                </button>
              </div>
            </div>
          </div>

          {/* Payment Action */}
          {isSuccess ? (
            <div className="p-8 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-3 animate-fade-in">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-emerald-900">Payment Successful!</h3>
              <p className="text-xs text-emerald-700 max-w-sm mx-auto">
                Your account has been upgraded to <strong>{planName}</strong>. Redirecting you to your Crafter Dashboard...
              </p>
            </div>
          ) : (
            <div className="bg-white border border-[#E8E1D2] rounded-2xl p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-[#E8E1D2] pb-3">
                <div className="flex items-center gap-2 text-xs font-bold text-[#1D231E]">
                  <CreditCard className="w-4 h-4 text-[#E06C38]" />
                  <span>Secure PayHere Gateway</span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-[#6B7869] font-semibold">
                  <Lock className="w-3 h-3 text-emerald-600" />
                  <span>256-Bit SSL Encrypted</span>
                </div>
              </div>

              <div className="p-4 bg-[#FAF6EE] border border-[#E8E1D2] rounded-xl text-xs text-[#5A6659] space-y-1.5">
                <div className="flex items-center justify-between">
                  <span>Subscriber Account:</span>
                  <strong className="text-[#1D231E]">{user?.email || 'Active User'}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span>Recurrence Schedule:</span>
                  <strong className="text-[#1D231E]">{billingCycle === 'annual' ? '1 Year (Recurring)' : '1 Month (Recurring)'}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span>Payment Gateway:</span>
                  <span className="font-semibold text-emerald-700">PayHere Payment Engine (Sandbox Mode)</span>
                </div>
              </div>

              <div className="pt-2 border-t border-[#E8E1D2] space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-[#1D231E]">
                  <span>Total Amount Due Today:</span>
                  <DualPrice
                    amount={totalBilled}
                    layout="inline"
                    usdClassName="text-base font-extrabold text-[#E06C38]"
                    lkrClassName="text-xs font-normal text-[#8A9588]"
                  />
                </div>

                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handlePayHerePayment}
                  className="w-full py-3.5 bg-[#E06C38] hover:bg-[#d05c28] text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Opening PayHere Checkout...</span>
                    </>
                  ) : (
                    <>
                      <span>Pay Securely with PayHere (${totalBilled})</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Footer Guarantee Note */}
        <div className="p-4 bg-[#F2EBDC] border-t border-[#E8E1D2] text-center text-[11px] text-[#6B7869] flex items-center justify-center gap-2 shrink-0">
          <ShieldCheck className="w-4 h-4 text-emerald-700" />
          <span>7-Day Money-Back Guarantee. Cancel anytime from your Crafter Dashboard.</span>
        </div>
      </div>
    </div>,
    document.body
  );
};
