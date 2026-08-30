import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Palette, 
  ShoppingBag, 
  Package, 
  User as UserIcon, 
  LogOut, 
  ArrowLeft, 
  Sparkles, 
  Clock, 
  ChevronRight,
  ShieldCheck,
  Download,
  ExternalLink
} from 'lucide-react';
import { OverviewTab } from '../components/dashboard/OverviewTab';
import { MyPatternsTab } from '../components/dashboard/MyPatternsTab';
import { PurchasesTab } from '../components/dashboard/PurchasesTab';
import { CustomOrdersTab } from '../components/dashboard/CustomOrdersTab';
import { ProfileTab } from '../components/dashboard/ProfileTab';
import { fetchUserProfile, getEffectiveTierLabel } from '../lib/supabase';

interface UserProfile {
  id?: string;
  name: string;
  email: string;
}

interface DashboardPageProps {
  user: UserProfile;
  onLogout: () => void;
  onGoHome: () => void;
  onOpenConverter: () => void;
  onNavigateToSection: (sectionId: string) => void;
  initialTab?: DashboardTab;
  onOpenUpgradeModal?: (targetPlan?: 'studio' | null) => void;
}

export type DashboardTab = 'overview' | 'patterns' | 'purchases' | 'orders' | 'profile';

export const DashboardPage: React.FC<DashboardPageProps> = ({
  user,
  onLogout,
  onGoHome,
  onOpenConverter,
  onNavigateToSection,
  initialTab = 'overview',
  onOpenUpgradeModal,
}) => {
  const [activeTab, setActiveTab] = useState<DashboardTab>(initialTab);
  const [currentTierLabel, setCurrentTierLabel] = useState<string>('Free Crafter');

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    let active = true;
    async function syncTier() {
      if (user?.email) {
        const prof = await fetchUserProfile(user.id, user.email);
        if (active) {
          setCurrentTierLabel(getEffectiveTierLabel(prof));
        }
      }
    }
    syncTier();

    const handleTierChange = (e: any) => {
      const newTier = e?.detail?.tier;
      if (newTier) {
        if (newTier === 'studio') setCurrentTierLabel('Studio Plan');
        else if (newTier === 'pro') setCurrentTierLabel('Pro Crafter');
        else setCurrentTierLabel('Free Crafter');
      } else {
        syncTier();
      }
    };

    window.addEventListener('tierChanged', handleTierChange);
    window.addEventListener('dev-tier-changed', handleTierChange);

    return () => {
      active = false;
      window.removeEventListener('tierChanged', handleTierChange);
      window.removeEventListener('dev-tier-changed', handleTierChange);
    };
  }, [user]);

  const navItems: { id: DashboardTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'patterns', label: 'My Patterns', icon: Palette },
    { id: 'purchases', label: 'Purchases', icon: ShoppingBag },
    { id: 'orders', label: 'Custom Orders', icon: Package },
    { id: 'profile', label: 'Profile', icon: UserIcon },
  ];

  const userInitials = user.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U';

  return (
    <div className="min-h-screen bg-[#FAF6EE] text-[#1D231E]">
      
      {/* Top Banner Header */}
      <div className="bg-[#1D231E] text-white py-8 px-6 lg:px-12 border-b border-[#2D382E]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <button
              onClick={onGoHome}
              className="inline-flex items-center gap-2 text-xs font-semibold text-[#93A28F] hover:text-white mb-2 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Home</span>
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#E06C38] text-white font-bold text-sm flex items-center justify-center shadow-md">
                {userInitials}
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white">
                  Welcome back, {user.name}!
                </h1>
                <p className="text-xs text-[#A2B0A0]">{user.email}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onOpenConverter}
              className="px-4 py-2 bg-[#E06C38] hover:bg-[#d05c28] text-white text-xs font-bold rounded-full transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Convert New Photo</span>
            </button>
            <button
              onClick={onLogout}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-full border border-white/20 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5 text-[#A2B0A0]" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Dashboard Layout with Sidebar */}
      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Sidebar Navigation */}
          <aside className="lg:col-span-3 bg-white border border-[#E8E1D2] rounded-3xl p-4 shadow-xs sticky top-24">
            
            {/* User Quick Info */}
            <div className="p-4 mb-3 bg-[#FAF6EE] rounded-2xl border border-[#E8E1D2]/60 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#1D231E] text-white text-xs font-bold flex items-center justify-center">
                {userInitials}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-[#1D231E] truncate">{user.name}</p>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#556653] bg-[#E8EFE5] px-2 py-0.5 rounded-full">
                  <ShieldCheck className="w-3 h-3 text-[#556653]" /> {currentTierLabel}
                </span>
              </div>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#1D231E] text-white shadow-sm'
                        : 'text-[#5A6659] hover:bg-[#FAF6EE] hover:text-[#1D231E]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-[#E06C38]' : 'text-[#8A9588]'}`} />
                      <span>{item.label}</span>
                    </div>
                    <ChevronRight className={`w-3.5 h-3.5 ${isActive ? 'text-white/60' : 'text-[#C5BEB0]'}`} />
                  </button>
                );
              })}
            </nav>

            {/* Quick Link Card */}
            <div className="mt-6 p-4 bg-[#FAF6EE] rounded-2xl border border-[#E8E1D2] text-center">
              <Sparkles className="w-6 h-6 text-[#E06C38] mx-auto mb-2" />
              <h4 className="text-xs font-bold text-[#1D231E]">Create Custom Pattern</h4>
              <p className="text-[11px] text-[#6B7869] mt-1 mb-3">
                Upload your photo and convert it into a DMC thread chart instantly.
              </p>
              <button
                onClick={onOpenConverter}
                className="w-full py-2 bg-[#E06C38] hover:bg-[#d05c28] text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Launch Stitchly
              </button>
            </div>
          </aside>

          {/* Tab Content Panel */}
          <main className="lg:col-span-9 bg-white border border-[#E8E1D2] rounded-3xl p-6 sm:p-10 shadow-xs min-h-[500px]">
            
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <OverviewTab
                user={user}
                onOpenConverter={onOpenConverter}
                onNavigateToShop={() => onNavigateToSection('shop-page')}
                onNavigateToTab={(tab) => setActiveTab(tab)}
                onOpenUpgradeModal={onOpenUpgradeModal}
              />
            )}

            {/* My Patterns Tab */}
            {activeTab === 'patterns' && (
              <MyPatternsTab user={user} onOpenConverter={onOpenConverter} />
            )}

            {/* Purchases Tab */}
            {activeTab === 'purchases' && (
              <PurchasesTab user={user} onNavigateToShop={() => onNavigateToSection('shop-page')} />
            )}

            {/* Custom Orders Tab */}
            {activeTab === 'orders' && (
              <CustomOrdersTab user={user} onOpenConverter={onOpenConverter} />
            )}

            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <ProfileTab user={user} />
            )}

          </main>

        </div>
      </div>

    </div>
  );
};
