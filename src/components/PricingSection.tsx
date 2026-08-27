import React, { useState } from 'react';
import { Check, Sparkles, Zap, Shield, Image, Percent, RefreshCw, Calculator, ArrowRight, Sliders } from 'lucide-react';

interface PricingSectionProps {
  onOpenConverter?: () => void;
  onNavigateToSection?: (sectionId: string) => void;
  onSelectPlan: (plan: 'free' | 'pro' | 'studio', billingCycle: 'monthly' | 'annual') => void;
  isLoggedIn?: boolean;
}

export const PricingSection: React.FC<PricingSectionProps> = ({ 
  onSelectPlan, 
  isLoggedIn = false 
}) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  return (
    <section id="pricing-section" className="py-24 bg-[#FAF6EE] text-[#1D231E] relative overflow-hidden">
      
      {/* Background Decorative Soft Ripples & Glows matching website color palette */}
      <div className="absolute inset-0 pointer-events-none -z-0 opacity-40">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-[#E06C38]/10 blur-[140px]" />
        <div className="absolute bottom-10 right-10 w-[500px] h-[500px] rounded-full bg-[#93A28F]/20 blur-[120px]" />
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-12 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <span className="text-xs font-bold uppercase tracking-widest text-[#E06C38] bg-[#E06C38]/10 px-3.5 py-1.5 rounded-full inline-block mb-3 border border-[#E06C38]/20">
            Transparent Pricing & Memberships
          </span>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#1D231E] mb-4">
            Choose Your Stitching Membership
          </h2>

          <p className="text-[#5A6659] text-base sm:text-lg leading-relaxed">
            Automated floss & skein calculation is included in all plans during pattern generation and PDF exports.
          </p>

          {/* Billing Cycle Toggle */}
          <div className="inline-flex items-center gap-3 bg-white/80 backdrop-blur-md p-1.5 rounded-full border border-[#E2DAD0] shadow-sm mt-8">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-5 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                billingCycle === 'monthly'
                  ? 'bg-[#E06C38] text-white shadow-md'
                  : 'text-[#5A6659] hover:text-[#1D231E]'
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`px-5 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                billingCycle === 'annual'
                  ? 'bg-[#E06C38] text-white shadow-md'
                  : 'text-[#5A6659] hover:text-[#1D231E]'
              }`}
            >
              <span>Annual Billing</span>
              <span className="bg-[#1D231E] text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        {/* 3 Dark Glassmorphic Pricing Cards Grid - Horizontally Aligned Equal Height */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch max-w-6xl mx-auto">
          
          {/* Card 1: Free Tier (Dark Theme Card on Light Canvas) */}
          <div className="bg-[#1D231E] backdrop-blur-xl border border-[#323D34] rounded-3xl p-8 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1.5 shadow-xl hover:shadow-2xl relative overflow-hidden group">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-[#A5B3A2] bg-[#323D34] px-3 py-1 rounded-full border border-[#445246]">
                  Free Forever
                </span>
                <span className="text-xs text-[#8A9B87] font-semibold">Starter Plan</span>
              </div>

              <h3 className="text-2xl font-bold text-[#FAF6EE] mb-2">Free Plan</h3>
              <p className="text-xs text-[#A5B3A2] leading-relaxed mb-6">
                Perfect for hobbyists and smaller memory projects up to 100x100 grid size.
              </p>

              {/* Price */}
              <div className="mb-6 pb-6 border-b border-[#323D34]">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl lg:text-5xl font-extrabold text-[#FAF6EE]">$0</span>
                  <span className="text-xs text-[#A5B3A2] font-medium">/ forever free</span>
                </div>
              </div>

              {/* Feature Checklist */}
              <ul className="space-y-3.5 text-xs text-[#E0E8DF] mb-8">
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#E06C38] shrink-0 mt-0.5" />
                  <span><strong>Max 100x100 Grid Size</strong> limit</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#E06C38] shrink-0 mt-0.5" />
                  <span><strong>3 Patterns Per Day</strong> generation limit</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#93A28F] shrink-0 mt-0.5" />
                  <span>Up to <strong>50 Thread Colors</strong> per pattern</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Calculator className="w-4 h-4 text-[#93A28F] shrink-0 mt-0.5" />
                  <span><strong>Automated Floss & Skein Calculation</strong> in exports</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#93A28F] shrink-0 mt-0.5" />
                  <span>Standard PDF pattern chart exports (DMC/Anchor)</span>
                </li>
                <li className="flex items-start gap-2.5 text-[#A5B3A2]">
                  <span className="w-4 h-4 rounded-full bg-[#323D34] flex items-center justify-center text-[10px] shrink-0 mt-0.5 font-mono">📢</span>
                  <span>Supported by ads in converter, blog, and shop pages</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => onSelectPlan('free', billingCycle)}
              className="w-full py-3.5 px-6 rounded-full bg-[#323D34] hover:bg-[#425245] border border-[#445246] text-[#FAF6EE] font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.02]"
            >
              <span>{isLoggedIn ? 'Continue with Free' : 'Get Started Free'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Card 2: Pro Plan (Dark Card with Highlight Accent Border, Horizontally Aligned) */}
          <div className="bg-[#1D231E] backdrop-blur-xl border-2 border-[#E06C38] rounded-3xl p-8 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1.5 shadow-2xl relative overflow-hidden group">
            
            {/* Most Popular Badge */}
            <div className="absolute top-0 right-0 bg-[#E06C38] text-white text-[10px] font-extrabold uppercase tracking-widest px-4 py-1.5 rounded-bl-2xl shadow-md">
              Most Popular
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-[#E06C38] bg-[#E06C38]/20 px-3 py-1 rounded-full border border-[#E06C38]/40">
                  Pro Crafter
                </span>
              </div>

              <h3 className="text-2xl font-bold text-[#FAF6EE] mb-2">Pro Plan</h3>
              <p className="text-xs text-[#C5D3C2] leading-relaxed mb-6">
                For enthusiastic stitchers wanting unlimited grid sizes and a clean, ad-free workflow.
              </p>

              {/* Price */}
              <div className="mb-6 pb-6 border-b border-[#323D34]">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl lg:text-5xl font-extrabold text-[#FAF6EE]">
                    {billingCycle === 'monthly' ? '$9' : '$7'}
                  </span>
                  <span className="text-xs text-[#A5B3A2] font-medium">/ month {billingCycle === 'annual' && '(billed annually)'}</span>
                </div>
              </div>

              {/* Feature Checklist */}
              <ul className="space-y-3.5 text-xs text-[#FAF6EE] mb-8">
                <li className="flex items-start gap-2.5 font-medium">
                  <Shield className="w-4 h-4 text-[#E06C38] shrink-0 mt-0.5" />
                  <span><strong className="text-[#E06C38]">Ad-Free Environment</strong> across converter, blog & shop</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Zap className="w-4 h-4 text-[#E06C38] shrink-0 mt-0.5" />
                  <span><strong>Unlimited Grid Sizes</strong> & pattern generations</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#E06C38] shrink-0 mt-0.5" />
                  <span><strong className="text-white">No Watermarks</strong> on PDF pattern exports</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#E06C38] shrink-0 mt-0.5" />
                  <span>Up to <strong>150 DMC & Anchor Thread Colors</strong> per pattern</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Calculator className="w-4 h-4 text-[#E06C38] shrink-0 mt-0.5" />
                  <span><strong>Automated Floss & Skein Calculation</strong> in PDF exports</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#93A28F] shrink-0 mt-0.5" />
                  <span>High-res printable PDF charts with floss organizer symbol key</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#93A28F] shrink-0 mt-0.5" />
                  <span>Priority pattern generation processing</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => onSelectPlan('pro', billingCycle)}
              className="w-full py-3.5 px-6 rounded-full bg-[#E06C38] hover:bg-[#d05c28] text-white font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-[#E06C38]/30 cursor-pointer hover:scale-[1.02]"
            >
              <span>Upgrade to Pro</span>
              <Sparkles className="w-4 h-4" />
            </button>
          </div>

          {/* Card 3: Studio / Ultimate Plan (Dark Theme Card on Light Canvas) */}
          <div className="bg-[#1D231E] backdrop-blur-xl border border-[#323D34] rounded-3xl p-8 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1.5 shadow-xl hover:shadow-2xl relative overflow-hidden group">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-[#93A28F] bg-[#323D34] px-3 py-1 rounded-full border border-[#445246]">
                  Studio & Ultimate
                </span>
                <span className="text-[10px] bg-[#E06C38]/20 text-[#E06C38] font-bold px-2.5 py-0.5 rounded-full border border-[#E06C38]/30">
                  Full Toolkit
                </span>
              </div>

              <h3 className="text-2xl font-bold text-[#FAF6EE] mb-2">Studio Plan</h3>
              <p className="text-xs text-[#A5B3A2] leading-relaxed mb-6">
                For pattern designers, shop owners & artists wanting built-in image editing & store discounts.
              </p>

              {/* Price */}
              <div className="mb-6 pb-6 border-b border-[#323D34]">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl lg:text-5xl font-extrabold text-[#FAF6EE]">
                    {billingCycle === 'monthly' ? '$19' : '$15'}
                  </span>
                  <span className="text-xs text-[#A5B3A2] font-medium">/ month {billingCycle === 'annual' && '(billed annually)'}</span>
                </div>
              </div>

              {/* Feature Checklist */}
              <ul className="space-y-3.5 text-xs text-[#E0E8DF] mb-8">
                <li className="flex items-start gap-2.5 font-medium text-white">
                  <Check className="w-4 h-4 text-[#93A28F] shrink-0 mt-0.5" />
                  <span><strong>Everything in Pro Plan</strong> (Ad-free, Unlimited Grids)</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#E06C38] shrink-0 mt-0.5" />
                  <span><strong className="text-[#E06C38]">Unlimited Thread Colors</strong> per pattern</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Sliders className="w-4 h-4 text-[#E06C38] shrink-0 mt-0.5" />
                  <span><strong className="text-[#E06C38]">Studio Image Editor & Tone Shading</strong> (Crop, rotate, scale, brightness, contrast & colour adjustments)</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Image className="w-4 h-4 text-[#E06C38] shrink-0 mt-0.5" />
                  <span><strong className="text-[#E06C38]">Live Thread Color Editor & Swapper</strong> (customize & swap pattern thread shades in real-time)</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Percent className="w-4 h-4 text-[#E06C38] shrink-0 mt-0.5" />
                  <span><strong className="text-[#E06C38]">15% Discount on all purchases</strong> in the Marketplace</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <RefreshCw className="w-4 h-4 text-[#93A28F] shrink-0 mt-0.5" />
                  <span><strong className="text-white">DMC ↔ Anchor Instant Conversion</strong> & dual brand mapping</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Calculator className="w-4 h-4 text-[#93A28F] shrink-0 mt-0.5" />
                  <span><strong>Automated Floss & Skein Calculation</strong> + shop supply estimator</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#93A28F] shrink-0 mt-0.5" />
                  <span>Commercial pattern selling rights & custom watermark header</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => onSelectPlan('studio', billingCycle)}
              className="w-full py-3.5 px-6 rounded-full bg-[#323D34] hover:bg-[#425245] border border-[#445246] text-[#FAF6EE] font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.02]"
            >
              <span>Start Studio Plan</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>

        {/* Bottom Guarantee Banner */}
        <div className="mt-16 text-center max-w-2xl mx-auto p-6 bg-white/80 backdrop-blur-md rounded-2xl border border-[#E2DAD0] shadow-sm flex flex-col sm:flex-row items-center justify-center gap-4 text-xs text-[#5A6659]">
          <div className="w-8 h-8 rounded-full bg-[#E06C38]/15 flex items-center justify-center text-[#E06C38] shrink-0">
            <Shield className="w-4 h-4" />
          </div>
          <p className="text-left">
            <strong className="text-[#1D231E]">100% Satisfaction Guarantee.</strong> Cancel or switch your subscription anytime with zero hidden fees. All generated PDF patterns remain yours forever.
          </p>
        </div>

      </div>
    </section>
  );
};





