import React, { useEffect, useState, useCallback } from 'react';
import { 
  Crown, 
  ShieldCheck, 
  Calendar, 
  AlertTriangle, 
  Loader2, 
  CheckCircle2, 
  X, 
  Palette, 
  ShoppingBag, 
  Package, 
  Sparkles, 
  RefreshCw,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import { 
  supabase, 
  fetchUserProfile, 
  fetchUserConversionJobs, 
  fetchUserStoreOrders, 
  fetchUserStitchOrders, 
  cancelSubscription, 
  getEffectiveTier,
  getEffectiveTierLabel,
  SupabaseProfileRow 
} from '../../lib/supabase';

interface UserProfile {
  id?: string;
  name: string;
  email: string;
}

interface OverviewTabProps {
  user: UserProfile;
  onOpenConverter: () => void;
  onNavigateToShop: () => void;
  onNavigateToTab: (tab: 'patterns' | 'purchases' | 'orders' | 'profile') => void;
  onOpenUpgradeModal?: () => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  user,
  onOpenConverter,
  onNavigateToShop,
  onNavigateToTab,
  onOpenUpgradeModal,
}) => {
  const [profile, setProfile] = useState<SupabaseProfileRow | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [patternsCount, setPatternsCount] = useState<number>(0);
  const [purchasesCount, setPurchasesCount] = useState<number>(0);
  const [customOrdersCount, setCustomOrdersCount] = useState<number>(0);

  // Subscription Cancellation Modal & Action State
  const [showCancelDialog, setShowCancelDialog] = useState<boolean>(false);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);
  const [cancelSuccessMsg, setCancelSuccessMsg] = useState<string | null>(null);

  const loadOverviewData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch profile
      const prof = await fetchUserProfile(user.id, user.email);
      setProfile(prof);

      // Fetch stat counts concurrently
      const [patternsData, purchases, orders] = await Promise.all([
        fetchUserConversionJobs(user.id, user.email, 0, 100),
        fetchUserStoreOrders(user.id, user.email),
        fetchUserStitchOrders(user.id, user.email),
      ]);

      setPatternsCount(patternsData.totalCount || patternsData.jobs?.length || 0);
      setPurchasesCount(purchases.length);
      setCustomOrdersCount(orders.length);
    } catch (err) {
      console.error('Error loading overview data from Supabase:', err);
    } finally {
      setLoading(false);
    }
  }, [user.id, user.email]);

  useEffect(() => {
    loadOverviewData();

    const handleTierChange = () => {
      loadOverviewData();
    };
    window.addEventListener('dev-tier-changed', handleTierChange);
    window.addEventListener('tierChanged', handleTierChange);

    return () => {
      window.removeEventListener('dev-tier-changed', handleTierChange);
      window.removeEventListener('tierChanged', handleTierChange);
    };
  }, [loadOverviewData]);

  // Handle Cancel Subscription execution
  const handleConfirmCancel = async () => {
    setIsCancelling(true);
    setCancelSuccessMsg(null);

    try {
      const res = await cancelSubscription();
      if (res.success) {
        setCancelSuccessMsg('Your subscription cancellation request has been submitted successfully.');
        // Optionally update local profile status representation
        setProfile((prev) => prev ? { ...prev, subscription_status: 'canceling' } : null);
      }
    } catch (err) {
      console.error('Failed to cancel subscription:', err);
    } finally {
      setIsCancelling(false);
      setShowCancelDialog(false);
    }
  };

  const formatDate = (rawDateStr?: string) => {
    if (!rawDateStr) return 'N/A';
    try {
      const d = new Date(rawDateStr);
      if (isNaN(d.getTime())) return rawDateStr;
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return rawDateStr;
    }
  };

  const effectiveTier = getEffectiveTier(profile);
  const status = (profile?.subscription_status || 'active').toLowerCase();
  const accessUntil = profile?.access_until;

  const displayTierTitle = status === 'active' 
    ? getEffectiveTierLabel(profile)
    : (profile?.subscription_tier && profile.subscription_tier.toLowerCase() !== 'free'
        ? `${profile.subscription_tier.charAt(0).toUpperCase() + profile.subscription_tier.slice(1)} (Inactive)`
        : 'Free Crafter');

  return (
    <div className="space-y-8 animate-fadeIn">
      
      {/* Tab Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#93A28F] block mb-1">
            Dashboard Overview
          </span>
          <h2 className="text-2xl font-bold text-[#1D231E]">Overview</h2>
          <p className="text-xs text-[#5A6659] mt-1">
            Summary of your active membership, saved cross-stitch patterns, and custom orders.
          </p>
        </div>

        <button
          onClick={loadOverviewData}
          title="Refresh dashboard data"
          className="p-2 bg-[#FAF6EE] hover:bg-[#E8E1D2] text-[#5A6659] rounded-xl border border-[#D5CDBC] transition-colors cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Subscription Tier & Status Card */}
      <div className="bg-gradient-to-br from-[#1D231E] to-[#2D382E] text-white rounded-3xl p-6 sm:p-8 shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-48 h-48 bg-[#E06C38]/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-[#E06C38] text-white rounded-xl shadow-xs">
                <Crown className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#A2B0A0]">
                Subscription Plan
              </span>
            </div>

            <div className="flex items-center gap-3">
              <h3 className="text-2xl font-bold text-white tracking-tight">
                {displayTierTitle}
              </h3>
              
              {/* Status Badge */}
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold capitalize border ${
                status === 'active'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  : status === 'canceling' || status === 'canceled'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
              }`}>
                <span className={`w-2 h-2 rounded-full ${
                  status === 'active' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`} />
                <span>{status}</span>
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs text-[#A2B0A0]">
              <Calendar className="w-4 h-4 text-[#E06C38]" />
              <span>
                Access Period Until: <strong className="text-white font-semibold">{formatDate(accessUntil)}</strong>
              </span>
            </div>
          </div>

          {/* Action Buttons: Upgrade Plan (Only shown for 'free' or 'pro' effective tiers) & Cancel Subscription */}
          <div className="flex flex-wrap items-center gap-3 self-start md:self-center">
            {(effectiveTier === 'free' || effectiveTier === 'pro') && onOpenUpgradeModal && (
              <button
                type="button"
                onClick={onOpenUpgradeModal}
                className="px-5 py-2.5 bg-[#E06C38] hover:bg-[#d05c28] text-white text-xs font-bold rounded-full transition-all cursor-pointer flex items-center gap-1.5 shadow-md hover:scale-[1.02] active:scale-[0.98]"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                <span>Upgrade Plan</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Cancel Subscription (Only shown for active paid tiers) */}
            {effectiveTier !== 'free' && status === 'active' && (
              <button
                onClick={() => setShowCancelDialog(true)}
                disabled={isCancelling}
                className="px-5 py-2.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 hover:text-white border border-rose-500/40 text-xs font-bold rounded-full transition-all cursor-pointer flex items-center gap-2 shadow-xs disabled:opacity-50"
              >
                {isCancelling ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-rose-300" />
                    <span>Cancelling...</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-4 h-4 text-rose-300" />
                    <span>Cancel Subscription</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Cancellation Confirmation Success Alert */}
        {cancelSuccessMsg && (
          <div className="mt-6 p-4 bg-amber-500/20 border border-amber-500/40 rounded-2xl text-amber-200 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{cancelSuccessMsg}</span>
          </div>
        )}
      </div>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        
        {/* Saved Patterns Stat */}
        <div 
          onClick={() => onNavigateToTab('patterns')}
          className="p-6 bg-white border border-[#E8E1D2] hover:border-[#D5CDBC] rounded-3xl transition-all shadow-xs cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[#6B7869] uppercase tracking-wider">Saved Patterns</span>
            <div className="p-2 bg-[#E06C38]/10 text-[#E06C38] rounded-xl group-hover:scale-110 transition-transform">
              <Palette className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold text-[#1D231E]">{patternsCount}</p>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#E8E1D2]/60">
            <span className="text-[11px] text-[#8A9588]">Patterns created with converter</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#E06C38] opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>

        {/* Purchases Stat */}
        <div 
          onClick={() => onNavigateToTab('purchases')}
          className="p-6 bg-white border border-[#E8E1D2] hover:border-[#D5CDBC] rounded-3xl transition-all shadow-xs cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[#6B7869] uppercase tracking-wider">Purchases</span>
            <div className="p-2 bg-[#556653]/10 text-[#556653] rounded-xl group-hover:scale-110 transition-transform">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold text-[#1D231E]">{purchasesCount}</p>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#E8E1D2]/60">
            <span className="text-[11px] text-[#8A9588]">Kit & PDF pattern orders</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#556653] opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>

        {/* Custom Orders Stat */}
        <div 
          onClick={() => onNavigateToTab('orders')}
          className="p-6 bg-white border border-[#E8E1D2] hover:border-[#D5CDBC] rounded-3xl transition-all shadow-xs cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[#6B7869] uppercase tracking-wider">Custom Orders</span>
            <div className="p-2 bg-amber-500/10 text-amber-700 rounded-xl group-hover:scale-110 transition-transform">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold text-[#1D231E]">{customOrdersCount}</p>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#E8E1D2]/60">
            <span className="text-[11px] text-[#8A9588]">Bespoke artisan proofs</span>
            <ArrowRight className="w-3.5 h-3.5 text-amber-700 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>

      </div>

      {/* Quick Action Converter Banner */}
      <div className="p-8 border-2 border-dashed border-[#E8E1D2] rounded-3xl bg-[#FAF6EE]/50 text-center flex flex-col items-center justify-center space-y-3">
        <div className="w-12 h-12 bg-[#E06C38]/10 text-[#E06C38] rounded-2xl flex items-center justify-center shadow-2xs">
          <Sparkles className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-[#1D231E]">Ready for your next craft project?</h3>
        <p className="text-xs text-[#5A6659] max-w-md mx-auto leading-relaxed">
          Upload any family portrait, pet photo, or landscape image to generate a customized DMC embroidery pattern chart instantly.
        </p>
        <button
          onClick={onOpenConverter}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#1D231E] hover:bg-[#323D34] text-white text-xs font-bold rounded-full transition-all cursor-pointer shadow-xs"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#E06C38]" />
          <span>Launch Stitchly</span>
        </button>
      </div>

      {/* Confirmation Dialog Modal for Cancel Subscription */}
      {showCancelDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div 
            className="relative w-full max-w-md bg-white border border-[#E8E1D2] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowCancelDialog(false)}
              disabled={isCancelling}
              className="absolute top-5 right-5 p-2 text-[#6B7869] hover:text-[#1D231E] rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#1D231E]">Cancel Subscription?</h3>
                <p className="text-xs text-[#6B7869]">Confirming your membership cancellation.</p>
              </div>
            </div>

            <p className="text-xs text-[#5A6659] leading-relaxed">
              Are you sure you want to cancel your <strong className="text-[#1D231E]">{displayTierTitle}</strong> subscription? You will retain access until <strong className="text-[#1D231E]">{formatDate(accessUntil)}</strong>, after which your account will revert to the free plan.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                onClick={() => setShowCancelDialog(false)}
                disabled={isCancelling}
                className="w-full sm:w-1/2 py-2.5 bg-[#FAF6EE] hover:bg-[#E8E1D2] text-[#1D231E] border border-[#D5CDBC] text-xs font-bold rounded-full transition-colors cursor-pointer"
              >
                Keep Subscription
              </button>

              <button
                onClick={handleConfirmCancel}
                disabled={isCancelling}
                className="w-full sm:w-1/2 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-full transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
              >
                {isCancelling ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Cancelling...</span>
                  </>
                ) : (
                  <span>Confirm Cancellation</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
