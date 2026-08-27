import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  Check, 
  Zap, 
  Shield, 
  Image, 
  Percent, 
  RefreshCw, 
  Calculator, 
  Sliders,
  Crown,
  ArrowRight,
  HeartHandshake
} from 'lucide-react';

export interface UpgradePlanModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onSelectPlan: (plan: 'free' | 'pro' | 'studio', billingCycle: 'monthly' | 'annual') => void;
  currentTier?: string;
  mode?: 'upgrade' | 'onboarding';
}

export const UpgradePlanModal: React.FC<UpgradePlanModalProps> = ({
  isOpen,
  onClose,
  onSelectPlan,
  currentTier = 'free',
  mode = 'upgrade',
}) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  if (!isOpen) return null;

  const isOnboarding = mode === 'onboarding';
  const normalizedTier = (currentTier || 'free').toLowerCase();

  // In onboarding mode, show all 3 plans: Free, Pro, Studio
  // In upgrade mode:
  // - free tier: show Pro and Studio
  // - pro tier: show only Studio
  // - studio tier: show none
  const showFree = isOnboarding;
  const showPro = isOnboarding || normalizedTier === 'free';
  const showStudio = isOnboarding || normalizedTier === 'free' || normalizedTier === 'pro';

  // Responsive container width
  const modalMaxWidth = isOnboarding 
    ? 'max-w-6xl' 
    : showPro 
      ? 'max-w-4xl' 
      : 'max-w-xl';

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fadeIn"
      onClick={() => {
        // Only allow closing via backdrop in upgrade mode
        if (!isOnboarding && onClose) {
          onClose();
        }
      }}
    >
      <div 
        className={`relative w-full ${modalMaxWidth} bg-[#FAF6EE] rounded-3xl shadow-2xl border border-[#E8E1D2] overflow-hidden my-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 sm:px-8 sm:py-6 border-b border-[#E8E1D2] flex items-center justify-between bg-white sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#E06C38]/10 text-[#E06C38] flex items-center justify-center shadow-xs">
              {isOnboarding ? <Sparkles className="w-5 h-5" /> : <Crown className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-bold text-[#1D231E]">
                  {isOnboarding ? 'Choose Your StitchedMemories Plan' : 'Upgrade Your Membership'}
                </h3>
                {!isOnboarding && (
                  <span className="px-2.5 py-0.5 rounded-full bg-[#FAF6EE] border border-[#D5CDBC] text-[10px] font-bold uppercase text-[#5A6659]">
                    Current: {normalizedTier === 'pro' ? 'Pro Crafter' : 'Free Plan'}
                  </span>
                )}
                {isOnboarding && (
                  <span className="px-2.5 py-0.5 rounded-full bg-[#E06C38]/10 border border-[#E06C38]/20 text-[10px] font-extrabold uppercase text-[#E06C38]">
                    Welcome Setup
                  </span>
                )}
              </div>
              <p className="text-xs text-[#6B7869] mt-0.5">
                {isOnboarding
                  ? 'Select a plan to complete your account setup. You can start with Free or choose Pro/Studio.'
                  : normalizedTier === 'pro'
                    ? 'Upgrade to Studio for advanced color editing and 15% storewide discounts.'
                    : 'Choose the plan that matches your cross-stitch aspirations.'}
              </p>
            </div>
          </div>

          {/* Close button: ONLY visible in upgrade mode */}
          {!isOnboarding && onClose && (
            <button
              onClick={onClose}
              className="p-2 text-[#6B7869] hover:text-[#1D231E] hover:bg-[#E8E1D2]/60 rounded-full transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 sm:p-8 max-h-[calc(85vh-90px)] overflow-y-auto space-y-6">
          
          {/* Billing Cycle Toggle */}
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-2 bg-white p-1 rounded-full border border-[#E2DAD0] shadow-xs">
              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  billingCycle === 'monthly'
                    ? 'bg-[#E06C38] text-white shadow-xs'
                    : 'text-[#5A6659] hover:text-[#1D231E]'
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('annual')}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  billingCycle === 'annual'
                    ? 'bg-[#E06C38] text-white shadow-xs'
                    : 'text-[#5A6659] hover:text-[#1D231E]'
                }`}
              >
                <span>Annual</span>
                <span className="bg-[#1D231E] text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-full">
                  Save 20%
                </span>
              </button>
            </div>
          </div>

          {/* Cards Grid */}
          <div className={`grid gap-6 items-stretch ${
            isOnboarding
              ? 'grid-cols-1 lg:grid-cols-3'
              : showPro
                ? 'grid-cols-1 md:grid-cols-2'
                : 'grid-cols-1 max-w-lg mx-auto'
          }`}>
            
            {/* 1. Free Plan Card (Shown in Onboarding mode) */}
            {showFree && (
              <div className="bg-[#1D231E] border border-[#323D34] rounded-3xl p-6 flex flex-col justify-between shadow-xl relative overflow-hidden group">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#A5B3A2] bg-[#262F27] px-3 py-1 rounded-full border border-[#3A473C]">
                      Free Crafter
                    </span>
                    <span className="text-[10px] bg-white/10 text-[#C5D3C2] font-semibold px-2 py-0.5 rounded-full">
                      Starter
                    </span>
                  </div>

                  <h4 className="text-xl font-bold text-[#FAF6EE] mb-1">Free Plan</h4>
                  <p className="text-xs text-[#A5B3A2] leading-relaxed mb-5">
                    Essential pattern creation tools to start your stitching journey.
                  </p>

                  <div className="mb-5 pb-5 border-b border-[#323D34]">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl sm:text-4xl font-extrabold text-[#FAF6EE]">$0</span>
                      <span className="text-xs text-[#A5B3A2] font-medium">/ forever</span>
                    </div>
                  </div>

                  <ul className="space-y-3 text-xs text-[#E0E8DF] mb-6">
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-[#93A28F] shrink-0 mt-0.5" />
                      <span><strong>3 Pattern Conversions/day</strong> (max 80×80 grid)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-[#93A28F] shrink-0 mt-0.5" />
                      <span>Standard <strong>DMC Color Palette</strong> (up to 30 colors)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-[#93A28F] shrink-0 mt-0.5" />
                      <span>Interactive Web Viewer & live grid preview</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-[#93A28F] shrink-0 mt-0.5" />
                      <span>PDF Pattern Export & DMC symbol chart</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <HeartHandshake className="w-4 h-4 text-[#93A28F] shrink-0 mt-0.5" />
                      <span>Access to Marketplace & community designs</span>
                    </li>
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectPlan('free', billingCycle)}
                  className="w-full py-3 px-5 rounded-full bg-[#323D34] hover:bg-[#425245] border border-[#445246] text-[#FAF6EE] font-bold text-xs sm:text-sm transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.02]"
                >
                  <span>Continue with Free</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* 2. Pro Plan Card (Shown in Onboarding mode OR when currentTier === 'free' in upgrade mode) */}
            {showPro && (
              <div className="bg-[#1D231E] border-2 border-[#E06C38] rounded-3xl p-6 flex flex-col justify-between shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 bg-[#E06C38] text-white text-[9px] font-extrabold uppercase tracking-wider px-3.5 py-1 rounded-bl-xl shadow-xs">
                  Most Popular
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#E06C38] bg-[#E06C38]/20 px-3 py-1 rounded-full border border-[#E06C38]/40">
                      Pro Crafter
                    </span>
                  </div>

                  <h4 className="text-xl font-bold text-[#FAF6EE] mb-1">Pro Plan</h4>
                  <p className="text-xs text-[#C5D3C2] leading-relaxed mb-5">
                    For stitchers wanting unlimited grid sizes and an ad-free workflow.
                  </p>

                  <div className="mb-5 pb-5 border-b border-[#323D34]">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl sm:text-4xl font-extrabold text-[#FAF6EE]">
                        {billingCycle === 'monthly' ? '$9' : '$7'}
                      </span>
                      <span className="text-xs text-[#A5B3A2] font-medium">
                        / mo {billingCycle === 'annual' && '(billed annually)'}
                      </span>
                    </div>
                  </div>

                  <ul className="space-y-3 text-xs text-[#FAF6EE] mb-6">
                    <li className="flex items-start gap-2">
                      <Shield className="w-4 h-4 text-[#E06C38] shrink-0 mt-0.5" />
                      <span><strong className="text-[#E06C38]">Ad-Free Experience</strong> on converter & shop</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Zap className="w-4 h-4 text-[#E06C38] shrink-0 mt-0.5" />
                      <span><strong>Unlimited Grid Sizes</strong> & pattern generations</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-[#E06C38] shrink-0 mt-0.5" />
                      <span><strong className="text-white">No Watermarks</strong> on PDF pattern charts</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-[#E06C38] shrink-0 mt-0.5" />
                      <span>Up to <strong>150 DMC & Anchor Thread Colors</strong></span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Calculator className="w-4 h-4 text-[#E06C38] shrink-0 mt-0.5" />
                      <span><strong>Automated Floss & Skein Calculation</strong> in PDF</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-[#93A28F] shrink-0 mt-0.5" />
                      <span>Priority pattern processing & organizer keys</span>
                    </li>
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectPlan('pro', billingCycle)}
                  className="w-full py-3 px-5 rounded-full bg-[#E06C38] hover:bg-[#d05c28] text-white font-bold text-xs sm:text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-md cursor-pointer hover:scale-[1.02]"
                >
                  <span>{isOnboarding ? 'Choose Pro Plan' : 'Upgrade to Pro'}</span>
                  <Sparkles className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* 3. Studio Plan Card (Shown in Onboarding mode OR when upgrading from free/pro) */}
            {showStudio && (
              <div className={`bg-[#1D231E] border rounded-3xl p-6 flex flex-col justify-between shadow-xl relative overflow-hidden group ${
                !showPro || isOnboarding ? 'border-2 border-[#323D34]' : 'border-[#323D34]'
              }`}>
                {!showPro && !isOnboarding && (
                  <div className="absolute top-0 right-0 bg-[#E06C38] text-white text-[9px] font-extrabold uppercase tracking-wider px-3.5 py-1 rounded-bl-xl shadow-xs">
                    Recommended Upgrade
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#93A28F] bg-[#323D34] px-3 py-1 rounded-full border border-[#445246]">
                      Studio & Ultimate
                    </span>
                    <span className="text-[10px] bg-[#E06C38]/20 text-[#E06C38] font-bold px-2 py-0.5 rounded-full border border-[#E06C38]/30">
                      Full Toolkit
                    </span>
                  </div>

                  <h4 className="text-xl font-bold text-[#FAF6EE] mb-1">Studio Plan</h4>
                  <p className="text-xs text-[#A5B3A2] leading-relaxed mb-5">
                    For pattern designers wanting image editing & 15% store discounts.
                  </p>

                  <div className="mb-5 pb-5 border-b border-[#323D34]">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl sm:text-4xl font-extrabold text-[#FAF6EE]">
                        {billingCycle === 'monthly' ? '$19' : '$15'}
                      </span>
                      <span className="text-xs text-[#A5B3A2] font-medium">
                        / mo {billingCycle === 'annual' && '(billed annually)'}
                      </span>
                    </div>
                  </div>

                  <ul className="space-y-3 text-xs text-[#E0E8DF] mb-6">
                    <li className="flex items-start gap-2 text-white">
                      <Check className="w-4 h-4 text-[#93A28F] shrink-0 mt-0.5" />
                      <span><strong>Everything in Pro</strong> (Ad-free, Unlimited Grids)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-[#E06C38] shrink-0 mt-0.5" />
                      <span><strong className="text-[#E06C38]">Unlimited Thread Colors</strong> per pattern</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Sliders className="w-4 h-4 text-[#E06C38] shrink-0 mt-0.5" />
                      <span><strong className="text-[#E06C38]">Studio Image Editor & Tone Shading</strong></span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Image className="w-4 h-4 text-[#E06C38] shrink-0 mt-0.5" />
                      <span><strong className="text-[#E06C38]">Live Thread Color Editor & Swapper</strong></span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Percent className="w-4 h-4 text-[#E06C38] shrink-0 mt-0.5" />
                      <span><strong className="text-[#E06C38]">15% Discount on all Marketplace orders</strong></span>
                    </li>
                    <li className="flex items-start gap-2">
                      <RefreshCw className="w-4 h-4 text-[#93A28F] shrink-0 mt-0.5" />
                      <span><strong>DMC ↔ Anchor Instant Conversion</strong> & dual mapping</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Calculator className="w-4 h-4 text-[#93A28F] shrink-0 mt-0.5" />
                      <span>Automated Floss/Skein Calculation + supply estimator</span>
                    </li>
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectPlan('studio', billingCycle)}
                  className={`w-full py-3 px-5 rounded-full font-bold text-xs sm:text-sm transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.02] ${
                    !showPro && !isOnboarding
                      ? 'bg-[#E06C38] hover:bg-[#d05c28] text-white shadow-md'
                      : 'bg-[#323D34] hover:bg-[#425245] border border-[#445246] text-[#FAF6EE]'
                  }`}
                >
                  <span>{isOnboarding ? 'Choose Studio Plan' : 'Upgrade to Studio'}</span>
                  <Sparkles className="w-4 h-4" />
                </button>
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
};
