import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { ThreeEntryPoints } from './components/ThreeEntryPoints';
import { PricingSection } from './components/PricingSection';
import { PhotoConverterModal } from './components/PhotoConverterModal';
import { BlogPreview } from './components/BlogPreview';
import { ShopKitsPreview } from './components/ShopKitsPreview';
import { Footer } from './components/Footer';
import { BackToTop } from './components/BackToTop';

import { AboutContactPage } from './pages/AboutContactPage';
import { BlogPage } from './pages/BlogPage';
import { ShopPage } from './pages/ShopPage';
import { DashboardPage, DashboardTab } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { AdminPage } from './pages/AdminPage';
import { AuthModal } from './components/AuthModal';
import { PaymentGatewayModal } from './components/PaymentGatewayModal';
import { UpgradePlanModal } from './components/UpgradePlanModal';
import { useAuth } from './context/AuthContext';
import { fetchUserProfile, updateUserPlanSelection, getEffectiveTier } from './lib/supabase';

export type PageName = 'home' | 'about-contact' | 'blog' | 'shop' | 'dashboard' | 'login' | 'admin' | 'admin-quotes' | 'pricing';

export default function App() {
  const { user, isLoggedIn, isLoading, signOut: authSignOut, refreshProfile } = useAuth();

  const [currentPage, setCurrentPage] = useState<PageName>('home');
  const [dashboardTab, setDashboardTab] = useState<DashboardTab>('overview');
  const [aboutScrollTarget, setAboutScrollTarget] = useState<'about' | 'contact'>('about');
  const [isConverterOpen, setIsConverterOpen] = useState(false);

  // Pricing Plan CTA state & modal controls
  const [pricingPlan, setPricingPlan] = useState<'free' | 'pro' | 'studio' | null>(null);
  const [pricingCycle, setPricingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [isPricingAuthModalOpen, setIsPricingAuthModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [upgradeModalTargetPlan, setUpgradeModalTargetPlan] = useState<'studio' | null>(null);
  const [hasDismissedOnboarding, setHasDismissedOnboarding] = useState(false);

  // Sync initial URL pathname and popstate history
  useEffect(() => {
    if (isLoading) return; // Do not redirect while session restoration is pending

    const handleUrlSync = () => {
      const path = window.location.pathname.toLowerCase();
      if (path.startsWith('/pricing') || path.startsWith('/plans')) {
        setCurrentPage('pricing');
      } else if (path.startsWith('/dashboard')) {
        if (isLoggedIn) {
          setCurrentPage('dashboard');
        } else {
          // Protected route: Redirect logged-out user to /login
          window.history.replaceState({}, '', '/login');
          setCurrentPage('login');
        }
      } else if (path.startsWith('/login') || path.startsWith('/signin') || path.startsWith('/signup')) {
        if (isLoggedIn) {
          window.history.replaceState({}, '', '/dashboard');
          setCurrentPage('dashboard');
        } else {
          setCurrentPage('login');
        }
      } else if (path.startsWith('/admin')) {
        if (isLoggedIn && (user?.role || '').toLowerCase() === 'admin') {
          setCurrentPage('admin');
        } else {
          // Protected route: Redirect non-admins or logged out users to homepage
          window.history.replaceState({}, '', '/');
          setCurrentPage('home');
        }
      } else if (path.startsWith('/blog')) {
        setCurrentPage('blog');
      } else if (path.startsWith('/shop') || path.startsWith('/marketplace')) {
        setCurrentPage('shop');
      } else if (path.startsWith('/about') || path.startsWith('/contact')) {
        setCurrentPage('about-contact');
      } else if (path === '/') {
        setCurrentPage('home');
      }
    };

    handleUrlSync();
    window.addEventListener('popstate', handleUrlSync);
    return () => window.removeEventListener('popstate', handleUrlSync);
  }, [isLoggedIn, isLoading, user?.role, user?.has_selected_plan]);

  const handleSelectPlanFromPricing = async (plan: 'free' | 'pro' | 'studio', cycle: 'monthly' | 'annual') => {
    setPricingPlan(plan);
    setPricingCycle(cycle);

    if (isLoggedIn) {
      if (plan === 'free') {
        setHasDismissedOnboarding(true);
        if (user?.id || user?.email) {
          await updateUserPlanSelection(user.id, user.email, true);
          await refreshProfile();
        }
        setIsUpgradeModalOpen(false);
        setUpgradeModalTargetPlan(null);
        setDashboardTab('overview');
        setCurrentPage('dashboard');
        window.history.pushState({}, '', '/dashboard');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setIsUpgradeModalOpen(false);
        setUpgradeModalTargetPlan(null);
        setIsPaymentModalOpen(true);
      }
    } else {
      setIsPricingAuthModalOpen(true);
    }
  };

  const handleLoginSuccess = async () => {
    await refreshProfile();
    setIsPricingAuthModalOpen(false);

    // Check if user clicked Pro or Studio CTA on pricing cards prior to logging in
    if (pricingPlan === 'pro' || pricingPlan === 'studio') {
      setIsPaymentModalOpen(true);
    } else {
      // Land user on dashboard (if has_selected_plan is false, the onboarding modal automatically opens over the dashboard)
      setDashboardTab('overview');
      setCurrentPage('dashboard');
      window.history.pushState({}, '', '/dashboard');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePaymentSuccess = async () => {
    setHasDismissedOnboarding(true);
    if (user?.id || user?.email) {
      await updateUserPlanSelection(user.id, user.email, true);
      await refreshProfile();
    }
    setIsPaymentModalOpen(false);
    setIsUpgradeModalOpen(false);
    setUpgradeModalTargetPlan(null);
    setDashboardTab('overview');
    setCurrentPage('dashboard');
    window.history.pushState({}, '', '/dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = async () => {
    await authSignOut();
    // If user was on dashboard, redirect to home
    if (currentPage === 'dashboard') {
      setCurrentPage('home');
      window.history.pushState({}, '', '/');
    }
  };

  const navigateToPage = (page: PageName, path: string) => {
    // Route protection check for dashboard
    if (page === 'dashboard') {
      if (!isLoggedIn) {
        window.history.pushState({}, '', '/login');
        setCurrentPage('login');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    }

    // Route protection check for admin
    if ((page === 'admin' || page === 'admin-quotes') && (!isLoggedIn || (user?.role || '').toLowerCase() !== 'admin')) {
      window.history.pushState({}, '', '/');
      setCurrentPage('home');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setCurrentPage(page);
    window.history.pushState({}, '', path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigateToSection = (sectionId: string) => {
    if (sectionId === 'admin' || sectionId === 'admin-page' || sectionId === 'admin-quotes') {
      navigateToPage('admin', '/admin');
      return;
    }

    if (sectionId === 'home') {
      navigateToPage('home', '/');
      return;
    }

    if (sectionId === 'pricing' || sectionId === 'pricing-section' || sectionId === 'pricing-page' || sectionId === 'membership') {
      navigateToPage('pricing', '/pricing');
      return;
    }

    if (sectionId === 'dashboard' || sectionId === 'dashboard-page') {
      setDashboardTab('overview');
      navigateToPage('dashboard', '/dashboard');
      return;
    }

    if (sectionId === 'profile' || sectionId === 'dashboard-profile') {
      setDashboardTab('profile');
      navigateToPage('dashboard', '/dashboard');
      return;
    }

    if (sectionId === 'login' || sectionId === 'login-page') {
      navigateToPage('login', '/login');
      return;
    }

    if (sectionId === 'about-page' || sectionId === 'about-section') {
      setAboutScrollTarget('about');
      navigateToPage('about-contact', '/about');
      return;
    }

    if (sectionId === 'contact-page' || sectionId === 'contact-section') {
      setAboutScrollTarget('contact');
      navigateToPage('about-contact', '/about');
      return;
    }

    if (sectionId === 'blog-page' || sectionId === 'blog-section') {
      navigateToPage('blog', '/blog');
      return;
    }

    if (sectionId === 'shop-page' || sectionId === 'shop-kits-section' || sectionId === 'shop-section' || sectionId === 'marketplace' || sectionId === 'marketplace-page') {
      navigateToPage('shop', '/marketplace');
      return;
    }

    // Default: Home page section navigation
    if (currentPage !== 'home') {
      setCurrentPage('home');
      window.history.pushState({}, '', '/');
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } else {
      const el = document.getElementById(sectionId);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF6EE] text-[#1D231E] font-sans selection:bg-[#E06C38]/20 selection:text-[#E06C38]">
      
      {/* Top Header Navigation (Hide header on pure standalone login page or admin portal) */}
      {currentPage !== 'login' && currentPage !== 'admin' && currentPage !== 'admin-quotes' && (
        <Header
          user={user}
          onLoginSuccess={handleLoginSuccess}
          onLogout={handleLogout}
          onOpenConverter={() => setIsConverterOpen(true)}
          onNavigateToSection={handleNavigateToSection}
        />
      )}

      {/* Main Content Flow */}
      <main className="flex-grow">
        {currentPage === 'home' && (
          <>
            <Hero
              onOpenConverter={() => setIsConverterOpen(true)}
              onNavigateToSection={handleNavigateToSection}
            />

            {/* Three Entry Points (Convert a Photo, Browse Blog, Shop Kits) */}
            <ThreeEntryPoints
              onOpenConverter={() => setIsConverterOpen(true)}
              onNavigateToBlog={() => handleNavigateToSection('blog-page')}
              onNavigateToShop={() => handleNavigateToSection('marketplace-page')}
            />

            {/* Pricing & Subscription Section */}
            <PricingSection
              onOpenConverter={() => setIsConverterOpen(true)}
              onNavigateToSection={handleNavigateToSection}
              onSelectPlan={handleSelectPlanFromPricing}
              isLoggedIn={isLoggedIn}
            />

            {/* Blog & Editorial Section Preview */}
            <BlogPreview
              onNavigateToBlogPage={() => handleNavigateToSection('blog-page')}
              onOpenConverter={() => setIsConverterOpen(true)}
            />

            {/* Future Shop Kits Preview */}
            <ShopKitsPreview onNavigateToShopPage={() => handleNavigateToSection('shop-page')} />
          </>
        )}

        {currentPage === 'pricing' && (
          <div className="pt-8 pb-16">
            <PricingSection
              onOpenConverter={() => setIsConverterOpen(true)}
              onNavigateToSection={handleNavigateToSection}
              onSelectPlan={handleSelectPlanFromPricing}
              isLoggedIn={isLoggedIn}
            />
          </div>
        )}

        {currentPage === 'about-contact' && (
          <AboutContactPage
            onGoHome={() => handleNavigateToSection('home')}
            onOpenConverter={() => setIsConverterOpen(true)}
            scrollToSection={aboutScrollTarget}
          />
        )}

        {currentPage === 'blog' && (
          <BlogPage
            onGoHome={() => handleNavigateToSection('home')}
            onOpenConverter={() => setIsConverterOpen(true)}
          />
        )}

        {currentPage === 'shop' && (
          <ShopPage
            onGoHome={() => handleNavigateToSection('home')}
            onOpenConverter={() => setIsConverterOpen(true)}
            onNavigateToSection={handleNavigateToSection}
            user={user}
            onLoginSuccess={handleLoginSuccess}
            onOpenUpgradeModal={(targetPlan) => {
              setUpgradeModalTargetPlan(targetPlan || null);
              setIsUpgradeModalOpen(true);
            }}
          />
        )}

        {currentPage === 'dashboard' && user && (
          <DashboardPage
            user={user}
            onLogout={handleLogout}
            onGoHome={() => handleNavigateToSection('home')}
            onOpenConverter={() => setIsConverterOpen(true)}
            onNavigateToSection={handleNavigateToSection}
            initialTab={dashboardTab}
            onOpenUpgradeModal={(targetPlan) => {
              setUpgradeModalTargetPlan(targetPlan || null);
              setIsUpgradeModalOpen(true);
            }}
          />
        )}

        {currentPage === 'login' && (
          <LoginPage
            onLoginSuccess={handleLoginSuccess}
            onGoHome={() => handleNavigateToSection('home')}
          />
        )}

        {(currentPage === 'admin' || currentPage === 'admin-quotes') && user && (user.role || '').toLowerCase() === 'admin' && (
          <AdminPage
            user={user}
            onGoHome={() => handleNavigateToSection('home')}
          />
        )}
      </main>

      {/* Footer */}
      {currentPage !== 'login' && currentPage !== 'admin' && currentPage !== 'admin-quotes' && (
        <Footer
          onOpenConverter={() => setIsConverterOpen(true)}
          onNavigateToSection={handleNavigateToSection}
        />
      )}

      {/* Interactive Photo to DMC Converter Demo Modal */}
      <PhotoConverterModal
        isOpen={isConverterOpen}
        onClose={() => setIsConverterOpen(false)}
        user={user}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* Auth Modal Triggered from Pricing Section CTAs */}
      <AuthModal
        isOpen={isPricingAuthModalOpen}
        onClose={() => setIsPricingAuthModalOpen(false)}
        defaultTab="signup"
        customTitle={
          pricingPlan === 'free'
            ? 'Create Account for Free Plan'
            : pricingPlan === 'pro'
            ? 'Create Account for Pro Crafter'
            : 'Create Account for Studio Plan'
        }
        customSubtitle={
          pricingPlan === 'free'
            ? 'Sign up to access your saved pattern vault & free daily conversions.'
            : pricingPlan === 'pro'
            ? 'Sign up to unlock ad-free workspace, unlimited grid sizes & watermark-free exports.'
            : 'Sign up for live DMC/Anchor color swapper, unlimited thread palettes & commercial rights.'
        }
        onLoginSuccess={handleLoginSuccess}
      />

      {/* Payment Gateway Modal for Pro & Studio Plans */}
      <PaymentGatewayModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        plan={pricingPlan === 'studio' ? 'studio' : 'pro'}
        billingCycle={pricingCycle}
        user={user}
        onPaymentSuccess={handlePaymentSuccess}
      />

      {/* Upgrade & Onboarding Plan Selection Modal */}
      <UpgradePlanModal
        isOpen={isUpgradeModalOpen || (isLoggedIn && user?.has_selected_plan === false && !hasDismissedOnboarding)}
        mode={(isLoggedIn && user?.has_selected_plan === false && !hasDismissedOnboarding) ? 'onboarding' : 'upgrade'}
        targetPlan={upgradeModalTargetPlan}
        onClose={() => {
          setIsUpgradeModalOpen(false);
          setUpgradeModalTargetPlan(null);
        }}
        currentTier={getEffectiveTier(user)}
        onSelectPlan={(plan, cycle) => {
          handleSelectPlanFromPricing(plan, cycle);
        }}
      />

      {/* Floating Back to Top Button */}
      <BackToTop />
    </div>
  );
}
