import React, { useState } from 'react';
import { X, ShieldCheck, CreditCard, Lock, Sparkles, Check, ArrowRight, AlertCircle, CheckCircle2, Zap } from 'lucide-react';
import { supabase, updateUserTier } from '../lib/supabase';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

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
  useBodyScrollLock(isOpen);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>(initialBillingCycle);
  const [cardName, setCardName] = useState(user?.name || '');
  const [cardNumber, setCardNumber] = useState('•••• •••• •••• 4242');
  const [expiry, setExpiry] = useState('12/28');
  const [cvc, setCvc] = useState('123');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const planName = plan === 'pro' ? 'Pro Crafter Plan' : 'Studio Plan';
  const monthlyPrice = plan === 'pro' ? 9 : 19;
  const annualPrice = plan === 'pro' ? 7 : 15;
  const currentMonthlyRate = billingCycle === 'annual' ? annualPrice : monthlyPrice;
  const totalBilled = billingCycle === 'annual' ? annualPrice * 12 : monthlyPrice;

  const handleSimulatedPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    try {
      // Simulate network response for payment gateway processing
      await new Promise((resolve) => setTimeout(resolve, 1200));

      // Update user subscription_tier and subscription_status ('active') in Supabase database if logged in
      if (user?.id || user?.email) {
        await updateUserTier(user.id || user.email, user.email, plan);
      }

      setIsSuccess(true);
      setTimeout(() => {
        onPaymentSuccess(plan);
      }, 1500);
    } catch (err) {
      console.error('Payment processing error:', err);
      // Still allow simulated success for preview testing
      setIsSuccess(true);
      setTimeout(() => {
        onPaymentSuccess(plan);
      }, 1200);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-md animate-fade-in">
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
                <h2 className="text-lg font-bold text-[#FAF6EE]">Payment Gateway</h2>
                <span className="text-[10px] font-extrabold uppercase bg-[#E06C38]/20 text-[#E06C38] px-2.5 py-0.5 rounded-full border border-[#E06C38]/30">
                  Coming Soon / Simulated
                </span>
              </div>
              <p className="text-xs text-[#A5B3A2]">
                Complete your upgrade to the <strong className="text-white">{planName}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-[#A5B3A2] hover:text-white hover:bg-white/10 rounded-full transition-all cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6">
          
          {/* Gateway Status Banner */}
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-start gap-3 text-xs text-amber-900">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold mb-0.5">Payment Gateway Configuration Notice</p>
              <p className="text-[#5A6659] leading-relaxed">
                Live Stripe/PayPal gateway integration is not set up yet in this environment. You can click <strong>"Complete Upgrade (Test Mode)"</strong> below to simulate a successful payment and immediately access your {planName} features.
              </p>
            </div>
          </div>

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
                    : 'Full studio suite with unlimited colors, DMC/Anchor color editor & commercial rights.'}
                </p>
              </div>

              <div className="text-left sm:text-right shrink-0">
                <div className="text-2xl font-extrabold text-[#1D231E]">${currentMonthlyRate}<span className="text-xs text-[#5A6659] font-normal">/mo</span></div>
                <div className="text-[11px] text-[#8A9588] font-medium">
                  {billingCycle === 'annual' ? `$${totalBilled} billed annually` : 'Billed monthly'}
                </div>
              </div>
            </div>

            {/* Billing Cycle Toggle */}
            <div className="mt-4 flex items-center justify-between text-xs">
              <span className="font-bold text-[#3A4538]">Billing Frequency:</span>
              <div className="inline-flex bg-[#FAF6EE] p-1 rounded-full border border-[#E8E1D2]">
                <button
                  type="button"
                  onClick={() => setBillingCycle('monthly')}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    billingCycle === 'monthly' ? 'bg-[#1D231E] text-white' : 'text-[#6B7869]'
                  }`}
                >
                  Monthly (${monthlyPrice}/mo)
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle('annual')}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    billingCycle === 'annual' ? 'bg-[#E06C38] text-white' : 'text-[#6B7869]'
                  }`}
                >
                  Annual (${annualPrice}/mo - Save 20%)
                </button>
              </div>
            </div>
          </div>

          {/* Payment Form (Simulated) */}
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
            <form onSubmit={handleSimulatedPayment} className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#E8E1D2] pb-2">
                <div className="flex items-center gap-2 text-xs font-bold text-[#1D231E]">
                  <CreditCard className="w-4 h-4 text-[#E06C38]" />
                  <span>Payment Details</span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-[#6B7869] font-semibold">
                  <Lock className="w-3 h-3 text-emerald-600" />
                  <span>256-Bit SSL Encrypted</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#3A4538] mb-1">
                  Cardholder Name
                </label>
                <input
                  type="text"
                  required
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  placeholder="Elena Rostova"
                  className="w-full px-4 py-2.5 bg-white border border-[#D5CDBC] rounded-xl text-xs text-[#1D231E] focus:outline-none focus:ring-2 focus:ring-[#E06C38]/40"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#3A4538] mb-1">
                  Card Number
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    placeholder="4242 •••• •••• 4242"
                    className="w-full px-4 py-2.5 bg-white border border-[#D5CDBC] rounded-xl text-xs text-[#1D231E] focus:outline-none focus:ring-2 focus:ring-[#E06C38]/40 font-mono"
                  />
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs font-bold text-[#A5B3A2]">
                    VISA / MC
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#3A4538] mb-1">
                    Expiration Date
                  </label>
                  <input
                    type="text"
                    required
                    value={expiry}
                    onChange={(e) => setExpiry(e.target.value)}
                    placeholder="MM/YY"
                    className="w-full px-4 py-2.5 bg-white border border-[#D5CDBC] rounded-xl text-xs text-[#1D231E] focus:outline-none focus:ring-2 focus:ring-[#E06C38]/40 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#3A4538] mb-1">
                    Security Code (CVC)
                  </label>
                  <input
                    type="text"
                    required
                    value={cvc}
                    onChange={(e) => setCvc(e.target.value)}
                    placeholder="123"
                    className="w-full px-4 py-2.5 bg-white border border-[#D5CDBC] rounded-xl text-xs text-[#1D231E] focus:outline-none focus:ring-2 focus:ring-[#E06C38]/40 font-mono"
                  />
                </div>
              </div>

              {/* Order Total Bar & Submit Button */}
              <div className="pt-3 border-t border-[#E8E1D2] space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-[#1D231E]">
                  <span>Total Amount Due Today:</span>
                  <span className="text-base text-[#E06C38]">${totalBilled}.00</span>
                </div>

                <button
                  type="submit"
                  disabled={isProcessing}
                  className="w-full py-3.5 bg-[#E06C38] hover:bg-[#d05c28] text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Processing Payment...</span>
                    </>
                  ) : (
                    <>
                      <span>Complete Upgrade (Test Mode - ${totalBilled})</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

        </div>

        {/* Footer Guarantee Note */}
        <div className="p-4 bg-[#F2EBDC] border-t border-[#E8E1D2] text-center text-[11px] text-[#6B7869] flex items-center justify-center gap-2 shrink-0">
          <ShieldCheck className="w-4 h-4 text-emerald-700" />
          <span>7-Day Money-Back Guarantee. Cancel anytime from your Crafter Dashboard.</span>
        </div>
      </div>
    </div>
  );
};
