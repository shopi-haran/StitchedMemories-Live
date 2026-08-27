import React, { useState, useEffect } from 'react';
import { ShieldAlert, Check, Sparkles, ChevronDown } from 'lucide-react';
import { fetchUserProfile, updateUserTier, getEffectiveTier } from '../lib/supabase';

interface DevTierSwitcherProps {
  user: { id?: string; name: string; email: string; avatar_url?: string } | null;
}

export const DevTierSwitcher: React.FC<DevTierSwitcherProps> = ({ user }) => {
  const [currentTier, setCurrentTier] = useState<'free' | 'pro' | 'studio'>('free');
  const [isUpdating, setIsUpdating] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const emailLower = user?.email?.toLowerCase() || '';
  const isTargetUser = emailLower === 'info.nxuswave@gmail.com';

  useEffect(() => {
    if (!isTargetUser || !user) return;

    let active = true;
    const loadTier = async () => {
      try {
        const profile = await fetchUserProfile(user.id, user.email);
        if (!active) return;
        setCurrentTier(getEffectiveTier(profile));
      } catch (err) {
        console.error('Failed to fetch dev tier:', err);
      }
    };

    loadTier();

    const handleExternalChange = (e: any) => {
      let extracted: 'free' | 'pro' | 'studio' | null = null;
      if (typeof e?.detail === 'string') {
        extracted = e.detail as any;
      } else if (typeof e?.detail?.tier === 'string') {
        extracted = e.detail.tier as any;
      }

      if (extracted === 'free' || extracted === 'pro' || extracted === 'studio') {
        setCurrentTier(extracted);
      } else {
        loadTier();
      }
    };
    window.addEventListener('dev-tier-changed', handleExternalChange);
    window.addEventListener('tierChanged', handleExternalChange);

    return () => {
      active = false;
      window.removeEventListener('dev-tier-changed', handleExternalChange);
      window.removeEventListener('tierChanged', handleExternalChange);
    };
  }, [user, isTargetUser]);

  if (!isTargetUser || !user) {
    return null;
  }

  const handleTierSelect = async (newTier: 'free' | 'pro' | 'studio') => {
    if (newTier === currentTier || isUpdating) return;
    setIsUpdating(true);
    setCurrentTier(newTier);

    try {
      const userId = user.id || user.email;
      await updateUserTier(userId, user.email, newTier);

      window.dispatchEvent(new CustomEvent('dev-tier-changed', { detail: newTier }));

      setToastMsg(`Dev Tier updated to: ${newTier.toUpperCase()}`);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2500);
    } catch (err) {
      console.error('Error updating dev tier:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <>
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 bg-[#1D231E] text-white p-2 sm:p-2.5 rounded-2xl shadow-2xl border border-[#E06C38]/40 backdrop-blur-md animate-fade-in text-xs font-sans">
        <div className="flex items-center gap-1.5 pl-1">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E06C38] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#E06C38]"></span>
          </span>
          <span className="text-[10px] font-extrabold tracking-wider uppercase text-[#E06C38] whitespace-nowrap">
            DEV TIER
          </span>
        </div>

        <div className="relative inline-block">
          <select
            value={currentTier}
            disabled={isUpdating}
            onChange={(e) => handleTierSelect(e.target.value as 'free' | 'pro' | 'studio')}
            className="bg-[#2A332B] hover:bg-[#354136] text-white text-xs font-bold py-1.5 pl-2.5 pr-7 rounded-xl border border-[#445246] focus:outline-none focus:ring-2 focus:ring-[#E06C38]/50 cursor-pointer appearance-none transition-all disabled:opacity-50"
          >
            <option value="free">Free Tier</option>
            <option value="pro">Pro Plan ($9/mo)</option>
            <option value="studio">Studio Suite ($19/mo)</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-[#93A28F] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {showToast && (
        <div className="fixed bottom-16 right-4 z-50 bg-[#E06C38] text-white px-3.5 py-2 rounded-xl shadow-xl text-xs font-bold flex items-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4" />
          <span>{toastMsg}</span>
        </div>
      )}
    </>
  );
};
