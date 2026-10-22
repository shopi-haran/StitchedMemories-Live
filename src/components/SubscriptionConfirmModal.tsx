import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Sparkles, Shield, Loader2, AlertCircle, Upload, FileText, Banknote, Copy } from 'lucide-react';
import { useModalStack } from '../hooks/useModalStack';
import { LkrPriceDisplay } from './LkrPriceDisplay';
import { supabase, fetchUserProfile } from '../lib/supabase';
import { startPayHereCheckout, PAYHERE_NOTIFY_URL } from '../lib/payhere';

export interface SubscriptionConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: 'pro' | 'studio';
  period: 'monthly' | 'annual';
  priceLkr: number;
  user: { id?: string; name: string; email: string; avatar_url?: string } | null;
  onSuccess?: () => void;
  refreshProfile: () => Promise<void>;
}

export const SubscriptionConfirmModal: React.FC<SubscriptionConfirmModalProps> = ({
  isOpen,
  onClose,
  plan,
  period,
  priceLkr,
  user,
  onSuccess,
  refreshProfile,
}) => {
  const { zIndex, modalId } = useModalStack(isOpen, { onClose, id: 'subscription-confirm-modal' });
  const [isProcessing, setIsProcessing] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingNotice, setPendingNotice] = useState<string | null>(null);

  // Bank transfer state for amounts exceeding PayHere limit
  const [showSubscriptionBankTransfer, setShowSubscriptionBankTransfer] = useState<boolean>(false);
  const [subscriptionBankTransferAmountLkr, setSubscriptionBankTransferAmountLkr] = useState<number>(0);

  if (!isOpen || typeof document === 'undefined') return null;

  const planDisplayName = plan === 'pro' ? 'Pro Plan' : 'Studio Plan';
  const periodDisplayName = period === 'annual' ? 'Annual' : 'Monthly';
  const apiPeriod = period === 'annual' ? 'yearly' : 'monthly';

  const handleConfirmAndPay = async () => {
    if (!user) {
      setErrorMessage('User session not found. Please log in again.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setPendingNotice(null);

    // Pre-call limit check: if price exceeds PayHere limit (50,000 LKR),
    // show bank transfer panel without calling the Edge Function.
    if (priceLkr > 50000) {
      setShowSubscriptionBankTransfer(true);
      setSubscriptionBankTransferAmountLkr(priceLkr);
      setIsProcessing(false);
      return;
    }

    try {
      // 1. Call create-payhere-hash with exactly { kind: 'subscription', tier, period } and nothing else
      const { data, error } = await supabase.functions.invoke('create-payhere-hash', {
        body: {
          kind: 'subscription',
          tier: plan,
          period: apiPeriod,
        },
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
        setErrorMessage('Could not start payment, please try again');
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
          items: `StitchedMemories ${planDisplayName} (${periodDisplayName})`,
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
            console.log('[SubscriptionConfirmModal] PayHere onCompleted:', completedOrderId);
            setIsVerifying(true);
            setIsProcessing(true);
            setErrorMessage(null);

            // Poll/refetch profile every 2s up to 30s until active
            const pollIntervalMs = 2000;
            const maxAttempts = 15; // 15 * 2s = 30s
            let confirmed = false;

            for (let attempt = 0; attempt < maxAttempts; attempt++) {
              await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
              try {
                if (user.id) {
                  const latestProfile = await fetchUserProfile(user.id);
                  const currentTier = (latestProfile?.subscription_tier || '').toLowerCase();
                  const currentStatus = (latestProfile?.subscription_status || '').toLowerCase();

                  if (currentStatus === 'active' && (currentTier === plan || (plan === 'pro' && currentTier === 'studio'))) {
                    confirmed = true;
                    await refreshProfile();
                    break;
                  }
                }
              } catch (pollErr) {
                console.warn('[SubscriptionConfirmModal] Polling error:', pollErr);
              }
            }

            setIsVerifying(false);
            setIsProcessing(false);

            if (confirmed) {
              await refreshProfile();
              window.dispatchEvent(new CustomEvent('tierChanged'));
              if (onSuccess) onSuccess();
              onClose();
            } else {
              setPendingNotice('Payment not confirmed yet, check your dashboard shortly');
            }
          },
          onDismissed: () => {
            console.log('[SubscriptionConfirmModal] PayHere onDismissed');
            setIsProcessing(false);
            setIsVerifying(false);
            setPendingNotice(null);
          },
          onError: (err) => {
            console.error('[SubscriptionConfirmModal] PayHere onError:', err);
            setIsProcessing(false);
            setIsVerifying(false);
            setErrorMessage('Could not start payment, please try again');
          },
        }
      );
    } catch (err) {
      console.error('[SubscriptionConfirmModal] Checkout start error:', err);
      setIsProcessing(false);
      setErrorMessage('Could not start payment, please try again');
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      style={{ zIndex }}
      data-modal-id={modalId}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div
        className="w-full max-w-md bg-[#1D231E] border border-[#323D34] rounded-3xl p-6 sm:p-8 text-[#FAF6EE] shadow-2xl relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isProcessing}
          aria-label="Close confirmation dialog"
          className="absolute top-5 right-5 p-2 rounded-full text-[#A5B3A2] hover:text-[#FAF6EE] hover:bg-[#323D34] transition-all cursor-pointer disabled:opacity-50"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-2xl bg-[#E06C38]/20 border border-[#E06C38]/30 flex items-center justify-center text-[#E06C38]">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#E06C38] bg-[#E06C38]/10 px-2 py-0.5 rounded-full border border-[#E06C38]/20">
              Subscription Checkout
            </span>
            <h3 id="confirm-modal-title" className="text-xl font-bold text-[#FAF6EE] mt-0.5">
              Confirm Your Upgrade
            </h3>
          </div>
        </div>

        {/* Error / Notice Banners */}
        {errorMessage && (
          <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {pendingNotice && (
          <div className="mb-5 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>{pendingNotice}</span>
          </div>
        )}

        {/* Plan Details Card */}
        <div className="bg-[#262F27] border border-[#3A473D] rounded-2xl p-5 mb-6 space-y-3.5">
          <div className="flex items-center justify-between text-xs pb-3 border-b border-[#3A473D]">
            <span className="text-[#A5B3A2]">Plan Name</span>
            <span className="font-bold text-[#FAF6EE] text-sm">{planDisplayName}</span>
          </div>

          <div className="flex items-center justify-between text-xs pb-3 border-b border-[#3A473D]">
            <span className="text-[#A5B3A2]">Selected Period</span>
            <span className="font-semibold text-[#FAF6EE] bg-[#323D34] px-2.5 py-1 rounded-full border border-[#445246]">
              {periodDisplayName}
            </span>
          </div>

          <div className="flex items-baseline justify-between text-xs pt-1">
            <span className="text-[#A5B3A2]">Payment summary</span>
            <div className="text-right">
              {period === 'annual' ? (
                <div>
                  <p className="text-[#FAF6EE] font-medium text-xs">
                    {`LKR ${Math.round(priceLkr / 12).toLocaleString()} × 12 months = `}
                    <span className="font-bold text-white">LKR {priceLkr.toLocaleString('.00', { minimumFractionDigits: 2 })}</span>
                  </p>
                  <p className="text-[11px] text-[#A5B3A2] mt-0.5">
                    Annual, billed once for 12 months (charged today)
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-[#FAF6EE] font-medium text-xs">
                    <span className="font-bold text-white">LKR {priceLkr.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> charged today
                  </p>
                  <p className="text-[11px] text-[#A5B3A2] mt-0.5">
                    Monthly, billed monthly
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Security Note */}
        <div className="flex items-center gap-2 text-[11px] text-[#8A9B87] mb-6">
          <Shield className="w-3.5 h-3.5 text-[#E06C38] shrink-0" />
          <span>Secure checkout processed via PayHere. Cancel anytime.</span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="flex-1 py-3 px-4 rounded-full bg-[#323D34] hover:bg-[#445246] border border-[#445246] text-[#FAF6EE] text-xs font-semibold transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleConfirmAndPay}
            disabled={isProcessing}
            className="flex-1 py-3 px-4 rounded-full bg-[#E06C38] hover:bg-[#d05c28] text-white text-xs font-bold transition-all shadow-md cursor-pointer hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{isVerifying ? 'Verifying...' : 'Processing...'}</span>
              </>
            ) : (
              <span>Confirm and pay</span>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
