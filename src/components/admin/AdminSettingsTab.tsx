import React, { useState } from 'react';
import {
  Coins,
  DollarSign,
  Save,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  HelpCircle,
  Calculator,
  ArrowRight,
  TrendingUp,
  Sparkles
} from 'lucide-react';

interface AdminSettingsTabProps {
  currentRateInput: string;
  onRateInputChange: (val: string) => void;
  onSaveRate: (rate?: number) => Promise<void>;
  isSavingRate: boolean;
  lastUpdatedAt: string | null;
  rateError: string | null;
  onRefresh: () => void;
}

const PRESET_RATES = [295, 300, 305, 310, 315, 320];

export const AdminSettingsTab: React.FC<AdminSettingsTabProps> = ({
  currentRateInput,
  onRateInputChange,
  onSaveRate,
  isSavingRate,
  lastUpdatedAt,
  rateError,
  onRefresh,
}) => {
  const [testUsdInput, setTestUsdInput] = useState<string>('50');
  const parsedRate = parseFloat(currentRateInput) || 300;

  const calculatePreview = (usd: number) => {
    const lkr = Math.round(usd * parsedRate);
    return `$${usd.toFixed(2)} (LKR ${lkr.toLocaleString('en-US')})`;
  };

  const testUsdNumber = parseFloat(testUsdInput) || 0;
  const testLkrNumber = Math.round(testUsdNumber * parsedRate);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-[#1D231E] to-[#2D3830] text-white p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-[#E06C38] text-white rounded-xl">
              <Coins className="w-5 h-5" />
            </span>
            <h2 className="text-xl sm:text-2xl font-bold font-serif">
              Currency & Exchange Rate Settings
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-white/70 max-w-2xl leading-relaxed">
            Configure the live USD to LKR conversion rate. Stitchara displays all subscription tiers, custom kit quotes, and store items in dual currency: primary USD with Sri Lankan Rupee (LKR) in parentheses.
          </p>
        </div>

        <button
          onClick={onRefresh}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all border border-white/10 cursor-pointer self-start md:self-auto"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Reload From DB</span>
        </button>
      </div>

      {rateError && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-xs">Failed to load exchange rate</p>
            <p className="text-xs mt-0.5 text-red-700">{rateError}</p>
          </div>
        </div>
      )}

      {/* Main Exchange Rate Configuration Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#1D231E]/10 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#1D231E]/10">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#70806E] block mb-1">
              Primary Currency Conversion
            </span>
            <h3 className="text-lg font-bold text-[#1D231E] flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-[#E06C38]" />
              USD to LKR Exchange Rate
            </h3>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Target Table: <code className="font-mono text-[11px]">app_settings (usd_to_lkr_rate)</code></span>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSaveRate();
          }}
          className="space-y-6"
        >
          <div>
            <label className="block text-xs font-bold text-[#1D231E] uppercase tracking-wider mb-2">
              Exchange Rate Value (LKR per 1 USD)
            </label>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1 max-w-md">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-[#70806E]">
                  1 USD =
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  value={currentRateInput}
                  onChange={(e) => onRateInputChange(e.target.value)}
                  placeholder="300.00"
                  className="w-full pl-24 pr-16 py-3.5 bg-[#FAF6EE] border border-[#1D231E]/15 rounded-2xl text-base font-bold font-mono text-[#1D231E] focus:outline-none focus:ring-2 focus:ring-[#E06C38] transition-all"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-[#70806E] uppercase">
                  LKR
                </span>
              </div>

              <button
                type="submit"
                disabled={isSavingRate}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-[#E06C38] hover:bg-[#c95927] text-white text-xs font-bold shadow-md transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSavingRate ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Saving to Database...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save & Apply Globally</span>
                  </>
                )}
              </button>
            </div>

            {lastUpdatedAt && (
              <p className="mt-2 text-[11px] text-emerald-700 flex items-center gap-1 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Last updated at {lastUpdatedAt}. Broadcasted live to all active client sessions.</span>
              </p>
            )}
          </div>

          {/* Quick Presets */}
          <div>
            <span className="text-xs font-bold text-[#1D231E]/70 block mb-2">
              Quick Preset Rates:
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {PRESET_RATES.map((preset) => {
                const isSelected = parsedRate === preset;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      onRateInputChange(preset.toString());
                      onSaveRate(preset);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#1D231E] text-white shadow-xs'
                        : 'bg-[#FAF6EE] hover:bg-[#E8E1D2] text-[#1D231E] border border-[#1D231E]/10'
                    }`}
                  >
                    LKR {preset.toFixed(2)}
                  </button>
                );
              })}
            </div>
          </div>
        </form>

        <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-200/80 text-xs text-amber-950 flex items-start gap-3">
          <HelpCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>How this works:</strong> Stitchara stores and quotes orders in USD. The customer sees both currencies (e.g., <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-amber-300 font-bold">$9.00 (LKR {Math.round(9 * parsedRate).toLocaleString()})</code>). Payment gateways process the transaction in USD.
          </p>
        </div>
      </div>

      {/* Interactive Sandbox & Preview Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Real-time Pricing Tier Samples */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#1D231E]/10 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#E06C38]" />
            <h4 className="text-sm font-bold text-[#1D231E]">
              Live Pricing Display Samples
            </h4>
          </div>
          <p className="text-xs text-[#1D231E]/60">
            How key prices appear across the application with the current rate of <strong>LKR {parsedRate.toFixed(2)} / USD</strong>:
          </p>

          <div className="space-y-2.5 pt-2">
            <div className="p-3 bg-[#FAF6EE] rounded-xl flex items-center justify-between text-xs">
              <span className="font-medium text-[#1D231E]">Free Starter Tier</span>
              <span className="font-mono font-bold text-[#1D231E]">{calculatePreview(0)}</span>
            </div>

            <div className="p-3 bg-[#FAF6EE] rounded-xl flex items-center justify-between text-xs">
              <span className="font-medium text-[#1D231E]">Pro Plan (Monthly)</span>
              <span className="font-mono font-bold text-emerald-800">{calculatePreview(9)}</span>
            </div>

            <div className="p-3 bg-[#FAF6EE] rounded-xl flex items-center justify-between text-xs">
              <span className="font-medium text-[#1D231E]">Studio Plan (Monthly)</span>
              <span className="font-mono font-bold text-emerald-800">{calculatePreview(29)}</span>
            </div>

            <div className="p-3 bg-[#FAF6EE] rounded-xl flex items-center justify-between text-xs">
              <span className="font-medium text-[#1D231E]">Standard Custom Kit</span>
              <span className="font-mono font-bold text-[#E06C38]">{calculatePreview(45)}</span>
            </div>

            <div className="p-3 bg-[#FAF6EE] rounded-xl flex items-center justify-between text-xs">
              <span className="font-medium text-[#1D231E]">Artisan Framing / Crafting</span>
              <span className="font-mono font-bold text-[#1D231E]">{calculatePreview(25)}</span>
            </div>

            <div className="p-3 bg-[#FAF6EE] rounded-xl flex items-center justify-between text-xs">
              <span className="font-medium text-[#1D231E]">Island-Wide Delivery</span>
              <span className="font-mono font-bold text-[#1D231E]">{calculatePreview(5)}</span>
            </div>
          </div>
        </div>

        {/* Currency Calculator Sandbox */}
        <div className="bg-[#FAF6EE] rounded-3xl p-6 sm:p-7 border border-[#1D231E]/10 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-[#2D5A43]" />
              <h4 className="text-sm font-bold text-[#1D231E]">
                Test Conversion Calculator
              </h4>
            </div>
            <p className="text-xs text-[#1D231E]/60">
              Input any arbitrary USD amount to check how the dual currency string formats for customers and artisans:
            </p>

            <div className="pt-2">
              <label className="block text-[11px] font-bold text-[#1D231E] uppercase tracking-wider mb-1.5">
                Test USD Amount ($)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-500">
                  $
                </span>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={testUsdInput}
                  onChange={(e) => setTestUsdInput(e.target.value)}
                  placeholder="50"
                  className="w-full pl-8 pr-4 py-2.5 bg-white border border-[#1D231E]/15 rounded-xl text-sm font-bold font-mono text-[#1D231E] focus:outline-none focus:ring-2 focus:ring-[#E06C38]"
                />
              </div>
            </div>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-[#1D231E]/10 space-y-1.5 shadow-2xs mt-4">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#70806E] block">
              Formatted Output Preview
            </span>
            <div className="text-lg sm:text-xl font-mono font-black text-[#1D231E]">
              ${testUsdNumber.toFixed(2)}{' '}
              <span className="text-[#5A6659] font-semibold text-sm">
                (LKR {testLkrNumber.toLocaleString('en-US')})
              </span>
            </div>
            <p className="text-[11px] text-[#70806E]">
              Calculation: ${testUsdNumber.toFixed(2)} × {parsedRate.toFixed(2)} = LKR {testLkrNumber.toLocaleString('en-US')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
