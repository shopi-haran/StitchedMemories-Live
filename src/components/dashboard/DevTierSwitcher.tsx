import React, { useState, useEffect } from 'react';
import { Wrench, CheckCircle2, Sparkles } from 'lucide-react';
import { fetchUserProfile, updateUserTier, getEffectiveTier } from '../../lib/supabase';

interface DevTierSwitcherProps {
  user: { id?: string; name: string; email: string };
  className?: string;
}

export const DevTierSwitcher: React.FC<DevTierSwitcherProps> = ({ user, className = '' }) => {
  const [currentTier, setCurrentTier] = useState<'free' | 'pro' | 'studio'>('free');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [showToast, setShowToast] = useState<boolean>(false);

  const emailLower = user?.email?.toLowerCase() || '';
  const isTestEmail = emailLower === 'info.nxuswave@gmail.com';

  useEffect(() => {
    if (!isTestEmail) return;

    let active = true;
    async function loadCurrentTier() {
      const prof = await fetchUserProfile(user.id, user.email);
      if (active) {
        setCurrentTier(getEffectiveTier(prof));
      }
    }
    loadCurrentTier();

    const handleTierEvent = (e: any) => {
      let extracted: 'free' | 'pro' | 'studio' | null = null;
      if (typeof e?.detail === 'string') {
        extracted = e.detail as any;
      } else if (typeof e?.detail?.tier === 'string') {
        extracted = e.detail.tier as any;
      }
      if (extracted === 'free' || extracted === 'pro' || extracted === 'studio') {
        setCurrentTier(extracted);
      }
    };
    window.addEventListener('tierChanged', handleTierEvent);
    window.addEventListener('dev-tier-changed', handleTierEvent);

    return () => {
      active = false;
      window.removeEventListener('tierChanged', handleTierEvent);
      window.removeEventListener('dev-tier-changed', handleTierEvent);
    };
  }, [user.id, user.email, isTestEmail]);

  if (!isTestEmail) return null;

  const handleTierSelect = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value as 'free' | 'pro' | 'studio';
    setCurrentTier(selected);
    setIsUpdating(true);

    try {
      await updateUserTier(user.id || user.email, user.email, selected);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2500);
    } catch (err) {
      console.error('Failed to update dev tier:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className={`relative inline-flex items-center gap-2 bg-[#E06C38]/10 border border-[#E06C38]/30 rounded-2xl px-3 py-1.5 shadow-2xs ${className}`}>
      <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-[#E06C38]">
        <Wrench className="w-3.5 h-3.5 shrink-0 animate-pulse" />
        <span className="hidden sm:inline">DEV TIER:</span>
      </div>

      <select
        value={currentTier}
        onChange={handleTierSelect}
        disabled={isUpdating}
        className="bg-white border border-[#D5CDBC] text-[#1D231E] font-bold text-xs rounded-xl px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-[#E06C38]/40 cursor-pointer shadow-2xs"
        aria-label="Dev Tier Switcher"
      >
        <option value="free">Free Crafter</option>
        <option value="pro">Pro Crafter ($9/mo)</option>
        <option value="studio">Studio Plan ($19/mo)</option>
      </select>

      {showToast && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1.5 bg-[#1D231E] text-white text-[11px] font-bold rounded-xl shadow-lg border border-[#E06C38] flex items-center gap-1.5 whitespace-nowrap z-50 animate-fade-in">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Tier set to <strong className="text-[#E06C38] capitalize">{currentTier}</strong></span>
        </div>
      )}
    </div>
  );
};
