import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ShieldCheck, CreditCard, Banknote } from 'lucide-react';
import { useModalStack } from '../hooks/useModalStack';
import { LkrPriceDisplay } from './LkrPriceDisplay';
import { PAYHERE_LIMIT_LKR, requiresBankTransfer } from '../lib/payhere';

export interface PaymentMethodModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  amountLkr: number;
  onSelectPayHere: () => void;
  onSelectBankTransfer: () => void;
  requiresNonRefundableCheckbox?: boolean;
  isNonRefundableChecked?: boolean;
  onNonRefundableCheckChange?: (checked: boolean) => void;
}

export const PaymentMethodModal: React.FC<PaymentMethodModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  amountLkr,
  onSelectPayHere,
  onSelectBankTransfer,
  requiresNonRefundableCheckbox = false,
  isNonRefundableChecked = false,
  onNonRefundableCheckChange,
}) => {
  useEffect(() => {
    if (isOpen) {
      console.log('[pay] chooser opened', { title, amountLkr });
    }
  }, [isOpen]);

  const { zIndex, modalId } = useModalStack(isOpen, { onClose, id: 'payment-method-modal' });

  if (!isOpen || typeof document === 'undefined') return null;

  const exceedsLimit = requiresBankTransfer(amountLkr);
  const canProceed = !requiresNonRefundableCheckbox || isNonRefundableChecked;

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
      style={{ zIndex }}
      data-modal-id={modalId}
    >
      <div
        className="w-full max-w-md bg-white border border-[#E8E1D2] rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden text-[#1D231E]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-[#6B7869] hover:text-[#1D231E] hover:bg-[#FAF6EE] transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-[#E06C38]/10 text-[#E06C38] flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#E06C38] bg-[#E06C38]/10 px-2 py-0.5 rounded-full border border-[#E06C38]/20">
              Secure Checkout
            </span>
            <h3 className="text-xl font-bold text-[#1D231E] mt-0.5">
              Choose Payment Method
            </h3>
          </div>
        </div>

        <div className="space-y-5">
          <div className="bg-[#FAF6EE] border border-[#E8E1D2] rounded-2xl p-4 space-y-2">
            <h4 className="font-extrabold text-[#1D231E] text-sm">{title}</h4>
            <p className="text-xs text-[#5A6659]">{subtitle}</p>
            <div className="pt-2 border-t border-[#E8E1D2] flex items-baseline justify-between">
              <span className="text-xs font-bold text-[#5A6659]">Amount Due Now</span>
              <LkrPriceDisplay
                priceLkr={amountLkr}
                layout="inline"
                lkrClassName="text-base font-black text-[#1D231E]"
                usdClassName="text-xs text-[#5A6659]"
              />
            </div>
          </div>

          {requiresNonRefundableCheckbox && (
            <label className="flex items-start gap-2.5 text-xs text-[#1D231E] cursor-pointer bg-amber-50 border border-amber-200 p-3 rounded-xl">
              <input
                type="checkbox"
                checked={isNonRefundableChecked}
                onChange={(e) => onNonRefundableCheckChange?.(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-[#E06C38] rounded cursor-pointer"
              />
              <span className="font-semibold leading-relaxed">
                I understand the 50% advance is non-refundable once production starts.
              </span>
            </label>
          )}

          <div className="space-y-3">
            {!exceedsLimit && (
              <button
                type="button"
                disabled={!canProceed}
                onClick={onSelectPayHere}
                className={`w-full py-3.5 px-4 rounded-2xl font-bold text-xs flex items-center justify-between transition-all ${
                  canProceed
                    ? 'bg-[#1D231E] hover:bg-black text-white shadow-md cursor-pointer'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <CreditCard className="w-4 h-4 text-[#E06C38]" />
                  <span>Visa / Master (PayHere)</span>
                </span>
                <span className="text-[11px] text-[#A5B3A2]">Instant access</span>
              </button>
            )}

            <button
              type="button"
              disabled={!canProceed}
              onClick={onSelectBankTransfer}
              className={`w-full py-3.5 px-4 rounded-2xl font-bold text-xs flex items-center justify-between transition-all ${
                canProceed
                  ? 'bg-[#E06C38] hover:bg-[#d05c28] text-white shadow-md cursor-pointer'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Banknote className="w-4 h-4 text-white" />
                <span>Bank transfer / Direct deposit</span>
              </span>
              <span className="text-[11px] text-white/80">Manual verification</span>
            </button>

            {exceedsLimit && (
              <p className="text-[11px] text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-center font-medium">
                Card payments are available for amounts below LKR 50,000. For LKR 50,000 or more, please use bank transfer.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
