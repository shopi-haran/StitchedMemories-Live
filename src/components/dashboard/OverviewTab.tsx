import React, { useEffect, useState, useCallback } from 'react';
import { 
  Crown, 
  Calendar, 
  Loader2, 
  CheckCircle2, 
  X, 
  RefreshCw,
  ArrowRight,
  ShieldAlert,
  Clock,
  Sparkles
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
  getSubscriptionBadge,
  fetchUserSubscriptionClaim,
  SupabaseProfileRow 
} from '../../lib/supabase';
import { RenewSubscriptionModal } from './RenewSubscriptionModal';

interface UserProfile {
  id?: string;
  name: string;
  email: string;
  access_until?: string | null;
  accessUntil?: string | null;
}

interface OverviewTabProps {
  user: UserProfile;
  onOpenConverter: () => void;
  onNavigateToShop: () => void;
  onNavigateToTab: (tab: 'patterns' | 'purchases' | 'orders' | 'profile') => void;
  onOpenUpgradeModal?: (targetPlan?: 'studio' | null) => void;
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

  // Subscription Cancellation & Renewal Modal & Action State
  const [showCancelDialog, setShowCancelDialog] = useState<boolean>(false);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);
  const [cancelSuccessMsg, setCancelSuccessMsg] = useState<string | null>(null);
  const [showRenewModal, setShowRenewModal] = useState<boolean>(false);
  const [renewSuccessMsg, setRenewSuccessMsg] = useState<string | null>(null);
  const [userSubClaim, setUserSubClaim] = useState<any | null>(null);

  const loadOverviewData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch profile and bank transfer subscription claim concurrently
      const [prof, subClaim, patternsData, purchases, orders] = await Promise.all([
        fetchUserProfile(user.id, user.email),
        user.id ? fetchUserSubscriptionClaim(user.id) : Promise.resolve(null),
        fetchUserConversionJobs(user.id, user.email, 0, 100),
        fetchUserStoreOrders(user.id, user.email),
        fetchUserStitchOrders(user.id, user.email),
      ]);
      setProfile(prof);
      setUserSubClaim(subClaim);

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
    setRenewSuccessMsg(null);

    try {
      const res = await cancelSubscription();
      if (res.success) {
        setCancelSuccessMsg('Your subscription cancellation request has been submitted successfully.');
        setProfile((prev) => prev ? { ...prev, subscription_status: 'canceling' } : null);
      }
    } catch (err) {
      console.error('Failed to cancel subscription:', err);
    } finally {
      setIsCancelling(false);
      setShowCancelDialog(false);
    }
  };

  const formatDate = (rawDateStr?: string | null) => {
    if (!rawDateStr) return 'N/A';
    try {
      const d = new Date(rawDateStr);
      if (isNaN(d.getTime())) return 'N/A';
      const day = d.getDate();
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = months[d.getMonth()];
      const year = d.getFullYear();
      return `${day} ${month} ${year}`;
    } catch {
      return 'N/A';
    }
  };

  const effectiveTier = getEffectiveTier(profile);
  const subscriptionBadge = getSubscriptionBadge(profile);
  const isActivePaid = effectiveTier !== 'free' && subscriptionBadge.variant === 'active';
  const isProActive = effectiveTier === 'pro' && subscriptionBadge.variant === 'active';
  const isStudioActive = effectiveTier === 'studio' && subscriptionBadge.variant === 'active';
  const isFree = effectiveTier === 'free' || !profile?.subscription_tier || profile.subscription_tier.toLowerCase() === 'free';
  const isInactiveOrExpired = subscriptionBadge.variant === 'inactive' || subscriptionBadge.variant === 'expired' || (!isFree && !isActivePaid);

  const accessUntil = profile?.access_until || profile?.accessUntil || (user as any)?.access_until || (user as any)?.accessUntil;

  const displayTierTitle = isActivePaid 
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

            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-2xl font-bold text-white tracking-tight">
                {displayTierTitle}
              </h3>

              {/* Status Badge */}
              {subscriptionBadge.showBadge && (
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                  subscriptionBadge.variant === 'active'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : subscriptionBadge.variant === 'expired'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${
                    subscriptionBadge.variant === 'active' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                  }`} />
                  <span>{subscriptionBadge.text}</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-[#A2B0A0]">
              <Calendar className="w-4 h-4 text-[#E06C38]" />
              <span>
                Access Period: <strong className="text-white font-semibold">
                  {accessUntil && formatDate(accessUntil) !== 'N/A'
                    ? `Active until ${formatDate(accessUntil)}`
                    : 'N/A'}
                </strong>
              </span>
            </div>
          </div>

          {/* Action Buttons: Free, Active Pro, Active Studio, or Inactive/Expired */}
          <div className="flex flex-wrap items-center gap-3 self-start md:self-center">
            {/* FREE: Show Upgrade plan (opens Pro and Studio) */}
            {isFree && onOpenUpgradeModal && (
              <button
                type="button"
                onClick={() => onOpenUpgradeModal()}
                className="px-5 py-2.5 bg-[#E06C38] hover:bg-[#d05c28] text-white text-xs font-bold rounded-full transition-all cursor-pointer flex items-center gap-1.5 shadow-md hover:scale-[1.02] active:scale-[0.98]"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                <span>Upgrade Plan</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {/* ACTIVE PRO: Show Upgrade plan (opens ONLY Studio plan card) and Cancel subscription */}
            {isProActive && (
              <>
                {onOpenUpgradeModal && (
                  <button
                    type="button"
                    onClick={() => onOpenUpgradeModal('studio')}
                    className="px-5 py-2.5 bg-[#E06C38] hover:bg-[#d05c28] text-white text-xs font-bold rounded-full transition-all cursor-pointer flex items-center gap-1.5 shadow-md hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                    <span>Upgrade Plan</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
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
              </>
            )}

            {/* ACTIVE STUDIO: Show only Cancel subscription */}
            {isStudioActive && (
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

            {/* INACTIVE or EXPIRED Pro or Studio */}
            {isInactiveOrExpired && (
              userSubClaim ? (
                <div className="px-4 py-2 bg-blue-500/20 border border-blue-500/30 text-blue-200 rounded-full text-xs font-semibold flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-blue-300 shrink-0" />
                  <span>Bank transfer claim pending</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowRenewModal(true)}
                  className="px-5 py-2.5 bg-[#E06C38] hover:bg-[#d05c28] text-white text-xs font-bold rounded-full transition-all cursor-pointer flex items-center gap-1.5 shadow-md hover:scale-[1.02] active:scale-[0.98]"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Renew Subscription</span>
                </button>
              )
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

        {/* Renewal Success Alert */}
        {renewSuccessMsg && (
          <div className="mt-6 p-4 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl text-emerald-200 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{renewSuccessMsg}</span>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div 
          onClick={() => onNavigateToTab('patterns')}
          className="bg-white border border-[#E8E1D2] rounded-3xl p-6 shadow-xs hover:border-[#E06C38]/40 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-2xl bg-[#93A28F]/15 text-[#3A4538] flex items-center justify-center group-hover:bg-[#E06C38]/10 group-hover:text-[#E06C38] transition-colors">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-[#6B7869] bg-[#FAF6EE] px-2.5 py-1 rounded-full border border-[#E8E1D2]">
              Vault
            </span>
          </div>
          <h3 className="text-2xl font-bold text-[#1D231E]">{patternsCount}</h3>
          <p className="text-xs text-[#6B7869] mt-0.5">Saved Patterns</p>
        </div>

        <div 
          onClick={() => onNavigateToTab('purchases')}
          className="bg-white border border-[#E8E1D2] rounded-3xl p-6 shadow-xs hover:border-[#E06C38]/40 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-2xl bg-[#93A28F]/15 text-[#3A4538] flex items-center justify-center group-hover:bg-[#E06C38]/10 group-hover:text-[#E06C38] transition-colors">
              <Calendar className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-[#6B7869] bg-[#FAF6EE] px-2.5 py-1 rounded-full border border-[#E8E1D2]">
              Kits & Charts
            </span>
          </div>
          <h3 className="text-2xl font-bold text-[#1D231E]">{purchasesCount}</h3>
          <p className="text-xs text-[#6B7869] mt-0.5">Purchased Kits</p>
        </div>

        <div 
          onClick={() => onNavigateToTab('orders')}
          className="bg-white border border-[#E8E1D2] rounded-3xl p-6 shadow-xs hover:border-[#E06C38]/40 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-2xl bg-[#93A28F]/15 text-[#3A4538] flex items-center justify-center group-hover:bg-[#E06C38]/10 group-hover:text-[#E06C38] transition-colors">
              <Crown className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-[#6B7869] bg-[#FAF6EE] px-2.5 py-1 rounded-full border border-[#E8E1D2]">
              Bespoke
            </span>
          </div>
          <h3 className="text-2xl font-bold text-[#1D231E]">{customOrdersCount}</h3>
          <p className="text-xs text-[#6B7869] mt-0.5">Custom Orders</p>
        </div>
      </div>

      {/* Quick Actions & Banner */}
      <div className="bg-white border border-[#E8E1D2] rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-[#E06C38]">
            Creative Studio
          </span>
          <h3 className="text-xl font-bold text-[#1D231E]">
            Ready to convert another cherished memory?
          </h3>
          <p className="text-xs text-[#5A6659] max-w-xl">
            Turn any photograph into a professional cross-stitch chart with automated floss calculation and DMC colour palettes instantly.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onOpenConverter}
            className="px-6 py-3 bg-[#E06C38] hover:bg-[#d05c28] text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>Launch Photo Converter</span>
          </button>
        </div>
      </div>

      {/* Cancel Subscription Confirmation Modal */}
      {showCancelDialog && (
        <div 
          data-modal-overlay="true"
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn"
          onClick={() => !isCancelling && setShowCancelDialog(false)}
        >
          <div 
            className="bg-white border border-[#E8E1D2] rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative space-y-5 text-[#1D231E]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowCancelDialog(false)}
              disabled={isCancelling}
              className="absolute top-5 right-5 p-2 rounded-full text-[#6B7869] hover:text-[#1D231E] hover:bg-[#FAF6EE] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#1D231E]">Cancel Subscription</h3>
                <p className="text-xs text-[#6B7869]">Review cancellation details</p>
              </div>
            </div>

            <p className="text-xs text-[#5A6659] leading-relaxed">
              Are you sure you want to cancel your <strong className="text-[#1D231E]">{displayTierTitle}</strong> subscription? You will retain access until <strong className="text-[#1D231E]">{formatDate(accessUntil)}</strong>, after which your account will revert to the free plan.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCancelDialog(false)}
                disabled={isCancelling}
                className="flex-1 py-2.5 px-4 rounded-xl border border-[#D5CDBC] text-xs font-bold text-[#5A6659] hover:bg-[#FAF6EE] transition-colors cursor-pointer"
              >
                Keep Subscription
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={isCancelling}
                className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isCancelling ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>Confirm Cancellation</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Renew Subscription Modal */}
      {showRenewModal && (
        <RenewSubscriptionModal
          isOpen={showRenewModal}
          onClose={() => setShowRenewModal(false)}
          defaultTier={profile?.subscription_tier === 'studio' ? 'studio' : 'pro'}
          user={user}
          refreshProfile={loadOverviewData}
          onSuccess={(newDate) => {
            setRenewSuccessMsg(`Subscription renewed. Access until ${newDate}`);
            loadOverviewData();
          }}
        />
      )}
    </div>
  );
};
