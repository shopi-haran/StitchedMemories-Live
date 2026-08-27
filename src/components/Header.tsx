import React, { useState } from 'react';
import { Sparkles, BookOpen, ShoppingBag, Tag, User, LogIn, UserPlus, LogOut, ChevronDown, Check, Info, MessageSquare, LayoutDashboard, ShieldCheck, Scissors } from 'lucide-react';
import { AuthModal } from './AuthModal';
import { useAuth } from '../context/AuthContext';

interface UserProfile {
  name: string;
  email: string;
  avatar_url?: string;
  avatarUrl?: string;
  role?: string;
}

interface HeaderProps {
  onOpenConverter: () => void;
  onNavigateToSection: (sectionId: string) => void;
  activeSection?: string;
  user?: UserProfile | null;
  onLoginSuccess?: (user: UserProfile) => void;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenConverter,
  onNavigateToSection,
  user: externalUser,
  onLoginSuccess: externalLoginSuccess,
  onLogout: externalLogout,
}) => {
  const { user: authUser, signOut } = useAuth();
  const user = externalUser !== undefined ? externalUser : authUser;

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authDefaultTab, setAuthDefaultTab] = useState<'login' | 'signup'>('login');
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  const handleLoginSuccess = (userProfile: UserProfile) => {
    if (externalLoginSuccess) {
      externalLoginSuccess(userProfile);
    }
  };

  const handleLogout = async () => {
    if (externalLogout) {
      externalLogout();
    } else {
      await signOut();
    }
    setIsProfileDropdownOpen(false);
  };

  const openAuth = (tab: 'login' | 'signup') => {
    setAuthDefaultTab(tab);
    setIsAuthModalOpen(true);
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#FAF6EE]/90 backdrop-blur-md border-b border-[#E8E1D2]/80 transition-all">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 h-20 flex items-center justify-between">
          
          {/* Brand Logo & Text */}
          <a 
            href="#" 
            onClick={(e) => { e.preventDefault(); onNavigateToSection('home'); }}
            className="flex items-center gap-3 group text-decoration-none"
          >
            <div className="w-10 h-10 rounded-xl bg-[#93A28F] text-white flex items-center justify-center shrink-0">
              <Scissors className="w-5 h-5 -rotate-45" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl sm:text-2xl font-bold tracking-tight text-[#1D231E]">
                Stitched<span className="text-[#E06C38]">Memories</span>
              </span>
              <span className="text-[10px] tracking-wider uppercase text-[#6B7869] font-medium hidden sm:block">
                Your Photo, Stitched into a Keepsake
              </span>
            </div>
          </a>

          {/* Center Navigation Links */}
          <nav className="hidden md:flex items-center gap-4 lg:gap-6 whitespace-nowrap shrink-0">
            <button
              onClick={onOpenConverter}
              className="text-sm font-medium text-[#3A4538] hover:text-[#E06C38] transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Sparkles className="w-4 h-4 text-[#E06C38]" />
              <span>Convert a Photo</span>
            </button>

            <button
              onClick={() => onNavigateToSection('pricing-section')}
              className="text-sm font-medium text-[#3A4538] hover:text-[#E06C38] transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Tag className="w-4 h-4 text-[#93A28F]" />
              <span>Pricing</span>
            </button>

            <button
              onClick={() => onNavigateToSection('blog-page')}
              className="text-sm font-medium text-[#3A4538] hover:text-[#E06C38] transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <BookOpen className="w-4 h-4 text-[#93A28F]" />
              <span>Learning Hub</span>
            </button>

            <button
              onClick={() => onNavigateToSection('shop-page')}
              className="text-sm font-medium text-[#3A4538] hover:text-[#E06C38] transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <ShoppingBag className="w-4 h-4 text-[#93A28F]" />
              <span>Marketplace</span>
            </button>

            <button
              onClick={() => onNavigateToSection('about-page')}
              className="text-sm font-medium text-[#3A4538] hover:text-[#E06C38] transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Info className="w-4 h-4 text-[#93A28F]" />
              <span>About Us</span>
            </button>
          </nav>

          {/* Right Header Section: User Auth */}
          <div className="flex items-center gap-3 sm:gap-4">
            
            {/* User Login / Sign Up or Logged In Profile */}
            {user ? (
              /* Logged In User Pill & Dropdown */
              <div className="relative">
                <button
                  onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                  className="flex items-center gap-2 pl-2 pr-2.5 py-1.5 bg-white hover:bg-[#F2EFE8] border border-[#E8E1D2] rounded-full shadow-xs transition-all cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-full bg-[#E06C38]/15 text-[#E06C38] font-bold text-xs flex items-center justify-center overflow-hidden border border-[#E8E1D2] shrink-0">
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt={user.name}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                        onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                      />
                    ) : (
                      (user.name || user.email || 'U').charAt(0).toUpperCase()
                    )}
                  </div>
                  <span className="text-xs font-semibold text-[#1D231E] max-w-[100px] truncate hidden sm:inline">
                    {user.name || user.email?.split('@')[0]}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-[#6B7869]" />
                </button>

                {/* Profile Dropdown Menu */}
                {isProfileDropdownOpen && (
                  <div 
                    className="absolute right-0 mt-2 w-56 bg-white border border-[#E8E1D2] rounded-2xl shadow-xl py-2 z-50 animate-fadeIn"
                    onMouseLeave={() => setIsProfileDropdownOpen(false)}
                  >
                    <div className="px-4 py-2.5 border-b border-[#E8E1D2]/60 flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#E06C38]/15 text-[#E06C38] font-bold text-xs flex items-center justify-center overflow-hidden shrink-0 border border-[#E8E1D2]">
                        {user.avatar_url ? (
                          <img
                            src={user.avatar_url}
                            alt={user.name}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          (user.name || 'U').charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-[#1D231E] truncate">{user.name}</p>
                        <p className="text-[11px] text-[#6B7869] truncate">{user.email}</p>
                      </div>
                    </div>

                    <div className="py-1">
                      <button
                        onClick={() => {
                          setIsProfileDropdownOpen(false);
                          onNavigateToSection('dashboard');
                        }}
                        className="w-full text-left px-4 py-2 text-xs font-bold text-[#1D231E] hover:bg-[#FAF6EE] flex items-center gap-2 cursor-pointer"
                      >
                        <LayoutDashboard className="w-3.5 h-3.5 text-[#E06C38]" />
                        <span>Dashboard</span>
                      </button>

                      <button
                        onClick={() => {
                          setIsProfileDropdownOpen(false);
                          onNavigateToSection('profile');
                        }}
                        className="w-full text-left px-4 py-2 text-xs font-medium text-[#3A4538] hover:bg-[#FAF6EE] flex items-center gap-2 cursor-pointer"
                      >
                        <User className="w-3.5 h-3.5 text-[#556653]" />
                        <span>Profile</span>
                      </button>

                      {((user?.role || '').toLowerCase() === 'admin' || (authUser?.role || '').toLowerCase() === 'admin') && (
                        <button
                          onClick={() => {
                            setIsProfileDropdownOpen(false);
                            onNavigateToSection('admin');
                          }}
                          className="w-full text-left px-4 py-2 text-xs font-bold text-[#E06C38] hover:bg-[#FAF6EE] flex items-center gap-2 cursor-pointer"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-[#E06C38]" />
                          <span>Admin Studio</span>
                        </button>
                      )}
                    </div>

                    <div className="border-t border-[#E8E1D2]/60 pt-1 mt-1">
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-xs text-[#C0453B] hover:bg-[#FAF6EE] flex items-center gap-2 font-medium cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Log Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Logged Out: Log In & Sign Up buttons */
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openAuth('login')}
                  className="px-3.5 py-2 text-xs font-semibold text-[#3A4538] hover:text-[#1D231E] hover:bg-[#E8E1D2]/50 rounded-full transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <LogIn className="w-3.5 h-3.5 text-[#6B7869]" />
                  <span>Log In</span>
                </button>

                <button
                  onClick={() => openAuth('signup')}
                  className="px-4 py-2 text-xs font-semibold bg-[#1D231E] hover:bg-[#323D34] text-white rounded-full shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5 text-[#93A28F]" />
                  <span>Sign Up</span>
                </button>
              </div>
            )}

          </div>

        </div>
      </header>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        defaultTab={authDefaultTab}
        onLoginSuccess={handleLoginSuccess}
      />
    </>
  );
};
