import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Banknote, CheckCircle2, AlertCircle, Loader2, Copy, Check } from 'lucide-react';
import { useModalStack } from '../hooks/useModalStack';
import { LkrPriceDisplay } from './LkrPriceDisplay';
import { fetchBankTransferDetails, setBankTransferClaim, claimSubscriptionTransfer, uploadPaymentProof } from '../lib/supabase';

export interface BankTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: { id?: string; name?: string; email?: string } | null;
  tier?: string;
  period?: string;
  order?: any;
  amountLkr: number;
  onSuccess: () => void;
}

export const BankTransferModal: React.FC<BankTransferModalProps> = ({
  isOpen,
  onClose,
  user,
  tier,
  period,
  order,
  amountLkr,
  onSuccess,
}) => {
  const { zIndex, modalId } = useModalStack(isOpen, { onClose, id: 'bank-transfer-modal' });
  const [bankDetails, setBankDetails] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successReported, setSuccessReported] = useState<boolean>(false);
  const [copiedRef, setCopiedRef] = useState(false);

  const isOrderMode = Boolean(order);
  const orderRawId = String(order?.raw_order_id || order?.id || '').replace('order_', '');
  const paymentRef = isOrderMode
    ? `SM-${orderRawId.slice(0, 8).toUpperCase()}`
    : `SM-SUB-${String(user?.id || '').slice(0, 8).toUpperCase()}`;

  useEffect(() => {
    if (isOpen) {
      console.log('[pay] bank window opened', { paymentRef, amountLkr, isOrderMode, tier, period });
      setNote('');
      setSlipFile(null);
      setErrorMsg(null);
      setSuccessReported(false);
      fetchBankTransferDetails().then((text) => {
        if (text) setBankDetails(text);
      });
    }
  }, [isOpen]);

  if (!isOpen || typeof document === 'undefined') return null;

  const handleCopyRef = () => {
    navigator.clipboard.writeText(paymentRef);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      setErrorMsg('File size exceeds 5MB limit.');
      return;
    }
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(f.type)) {
      setErrorMsg('Please upload a JPG, PNG, WebP image or PDF.');
      return;
    }
    setErrorMsg(null);
    setSlipFile(f);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (note.length > 500) {
      setErrorMsg('Note cannot exceed 500 characters.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      let slipPath = '';
      if (slipFile) {
        const path = `${user?.id || 'guest'}/${order?.raw_order_id || order?.id || tier || 'subscription'}/${Date.now()}-${slipFile.name}`;
        const uploaded = await uploadPaymentProof(slipFile, path);
        if (uploaded) {
          slipPath = uploaded;
        }
      }

      let finalNote = note.trim();
      if (slipPath) {
        finalNote = finalNote ? `Slip: ${slipPath} - ${finalNote}` : `Slip: ${slipPath}`;
      }
      if (finalNote.length > 500) {
        finalNote = finalNote.slice(0, 500);
      }

      let res;
      if (isOrderMode) {
        res = await setBankTransferClaim(order?.raw_order_id || order?.id, true, finalNote);
      } else {
        res = await claimSubscriptionTransfer(tier || 'pro', period === 'annual' ? 'yearly' : 'monthly', finalNote);
      }

      if (res.success) {
        setSuccessReported(true);
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 2000);
      } else {
        setErrorMsg(res.message || 'Failed to submit bank transfer claim.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
      style={{ zIndex }}
      data-modal-id={modalId}
    >
      <div
        className="w-full max-w-lg bg-white border border-[#E8E1D2] rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden text-[#1D231E]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-[#6B7869] hover:text-[#1D231E] hover:bg-[#FAF6EE] transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-2xl bg-[#E06C38]/10 text-[#E06C38] flex items-center justify-center">
            <Banknote className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#E06C38] bg-[#E06C38]/10 px-2 py-0.5 rounded-full border border-[#E06C38]/20">
              Direct Deposit
            </span>
            <h3 className="text-xl font-bold text-[#1D231E] mt-0.5">
              Bank Transfer Details
            </h3>
          </div>
        </div>

        {successReported ? (
          <div className="p-6 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-center space-y-3">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
            <h4 className="font-bold text-sm">Transfer Reported</h4>
            <p className="text-xs text-emerald-800 leading-relaxed">
              Transfer reported. We will confirm it once the payment reaches our account.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
            <div className="bg-[#FAF6EE] border border-[#E8E1D2] rounded-2xl p-4 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#70806E] block">
                Amount Due & Reference
              </span>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#5A6659]">Amount to Transfer</span>
                <LkrPriceDisplay
                  priceLkr={amountLkr}
                  layout="inline"
                  lkrClassName="font-black text-sm text-[#1D231E]"
                  usdClassName="text-xs text-[#5A6659]"
                />
              </div>
              {tier && (
                <div className="flex items-center justify-between pt-2 border-t border-[#E8E1D2]">
                  <span className="text-xs text-[#5A6659]">Plan & Billing Period</span>
                  <span className="text-xs font-bold text-[#1D231E] capitalize">
                    {tier} ({period || 'monthly'})
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between pt-2 border-t border-[#E8E1D2]">
                <span className="text-xs text-[#5A6659]">Payment Reference Code</span>
                <div className="flex items-center gap-2">
                  <code className="bg-white px-2.5 py-1 rounded-lg border border-[#E8E1D2] font-mono text-xs font-bold text-[#1D231E]">
                    {paymentRef}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopyRef}
                    className="p-1.5 bg-white hover:bg-[#F0EBE1] border border-[#E8E1D2] rounded-lg text-[#5A6659] transition-colors cursor-pointer"
                    title="Copy Reference"
                  >
                    {copiedRef ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-[#E06C38] font-medium pt-1">
                Write this reference in the transfer remarks/description so we can match your payment.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1D231E] mb-1.5">
                Bank Account Instructions
              </label>
              <div className="p-3.5 bg-[#FAF6EE] border border-[#E8E1D2] rounded-2xl text-xs font-mono whitespace-pre-line text-[#1D231E]">
                {bankDetails || 'Bank Name: Commercial Bank\nAccount Name: Stitchara Studio\nAccount Number: 1234567890\nBranch: Colombo Main'}
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-[#1D231E]">
                Upload Deposit Slip (Optional, max 5MB)
              </label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={handleFileChange}
                className="w-full text-xs text-[#5A6659] file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#FAF6EE] file:text-[#1D231E] hover:file:bg-[#F0EBE1] cursor-pointer"
              />
              {slipFile && <p className="text-[11px] text-emerald-700 font-medium">Selected: {slipFile.name}</p>}
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-[#1D231E]">
                Transfer Notes (Optional, max 500 chars)
              </label>
              <textarea
                rows={2}
                maxLength={500}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Transferred from John Doe account at 2:30 PM"
                className="w-full p-3 bg-[#FAF6EE] border border-[#E8E1D2] rounded-xl text-xs text-[#1D231E] focus:outline-none focus:ring-2 focus:ring-[#E06C38]"
              />
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 bg-[#E06C38] hover:bg-[#d05c28] text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting Transfer Report...</span>
                </>
              ) : (
                <span>I've made the transfer</span>
              )}
            </button>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
};
