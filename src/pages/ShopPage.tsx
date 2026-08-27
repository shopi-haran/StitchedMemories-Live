import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  ArrowLeft, 
  Package, 
  Sparkles, 
  Palette, 
  ArrowRight, 
  Upload, 
  CheckCircle2, 
  HelpCircle, 
  X, 
  FileText, 
  Clock, 
  Ruler, 
  AlertCircle, 
  Heart,
  Phone,
  MapPin,
  Check,
  Percent,
  Tag
} from 'lucide-react';
import { createOrderRequest, uploadOriginalPhotoToSupabase, fetchUserProfile, getEffectiveTier } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { AuthModal } from '../components/AuthModal';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

interface ShopPageProps {
  onGoHome: () => void;
  onOpenConverter: () => void;
  onNavigateToSection?: (sectionId: string) => void;
  user?: { id?: string; name: string; email: string; avatar_url?: string; subscription_tier?: string; subscription_status?: string } | null;
  onLoginSuccess?: (user: { id?: string; name: string; email: string; avatar_url?: string }) => void;
  onOpenUpgradeModal?: () => void;
}

export const ShopPage: React.FC<ShopPageProps> = ({ 
  onGoHome, 
  onOpenConverter, 
  onNavigateToSection,
  user: propUser,
  onLoginSuccess,
  onOpenUpgradeModal,
}) => {
  const { session, isLoggedIn, user: authUser } = useAuth();
  const effectiveUser = authUser || propUser;

  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (effectiveUser?.id) {
      fetchUserProfile(effectiveUser.id, effectiveUser.email).then((prof) => {
        if (prof) setProfile(prof);
      });
    } else {
      setProfile(null);
    }
  }, [effectiveUser?.id, effectiveUser?.email]);

  const userTier = getEffectiveTier(profile || effectiveUser);
  const showStudioPromo = isLoggedIn && !!effectiveUser && (userTier === 'free' || userTier === 'pro');

  // Modal state for Assisted Kit Request & Custom Stitched Product Request
  const [activeModal, setActiveModal] = useState<'assisted-kit' | 'custom-stitched' | null>(null);

  // Lock body scroll when modal is active
  useBodyScrollLock(!!activeModal);

  // Form State
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [sizePreference, setSizePreference] = useState<string>('Medium (8" × 10")');
  const [colorCount, setColorCount] = useState<string>('20-30 Colors');
  const [productStyle, setProductStyle] = useState<'Pattern Only' | 'Completed Product'>('Completed Product');
  const [isFramed, setIsFramed] = useState<boolean>(true);
  const [framingOption, setFramingOption] = useState<string>('Museum Framed & Matted (With Glass)');
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  
  // Submission status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Auth modal prompt if user is guest when submitting
  const [authModalConfig, setAuthModalConfig] = useState<{
    isOpen: boolean;
    defaultTab: 'login' | 'signup';
    customTitle?: string;
    customSubtitle?: string;
  } | null>(null);

  const resetForm = () => {
    setImagePreview(null);
    setSizePreference('Medium (8" × 10")');
    setColorCount('20-30 Colors');
    setProductStyle('Completed Product');
    setIsFramed(true);
    setFramingOption('Museum Framed & Matted (With Glass)');
    setDeliveryAddress('');
    setPhone('');
    setNotes('');
    setErrorMessage(null);
    setIsSuccess(false);
  };

  const handleOpenModal = (type: 'assisted-kit' | 'custom-stitched') => {
    resetForm();
    if (type === 'assisted-kit') {
      setSizePreference('Medium (8" × 10")');
      setColorCount('20-30 Colors');
      setProductStyle('Completed Product');
    } else {
      setSizePreference('Medium (8" × 10")');
      setColorCount('26-40 Threads');
      setIsFramed(true);
      setFramingOption('Museum Framed & Matted (With Glass)');
    }
    setActiveModal(type);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setErrorMessage('File size exceeds 10MB limit. Please upload a smaller image.');
        return;
      }
      setErrorMessage(null);
      const reader = new FileReader();
      reader.onload = (event) => {
        setImagePreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deliveryAddress.trim()) {
      setErrorMessage('Please provide your delivery address.');
      return;
    }
    if (!phone.trim()) {
      setErrorMessage('Please provide a contact phone number for delivery updates.');
      return;
    }

    const activeUserId = session?.user?.id || effectiveUser?.id;
    const activeUserEmail = session?.user?.email || effectiveUser?.email;

    // Login check: guests get login/signup prompt at this point
    if (!activeUserId && !activeUserEmail) {
      setAuthModalConfig({
        isOpen: true,
        defaultTab: 'login',
        customTitle: activeModal === 'assisted-kit' ? 'Log in to Request a Kit' : 'Log in to Request Stitched Art',
        customSubtitle: 'Please log in or create a free account to place your custom order and receive quotes in your dashboard.',
      });
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      let finalPhotoUrl = imagePreview || '';
      if (finalPhotoUrl && (finalPhotoUrl.startsWith('data:') || finalPhotoUrl.startsWith('blob:'))) {
        try {
          const uId = activeUserId || activeUserEmail || 'user';
          const uploaded = await uploadOriginalPhotoToSupabase(finalPhotoUrl, 'marketplace_request', uId);
          if (uploaded) finalPhotoUrl = uploaded;
        } catch (e) {
          console.warn('Storage upload notice:', e);
        }
      }

      if (activeModal === 'assisted-kit') {
        // Flow 2: Assisted kit request
        const res = await createOrderRequest({
          userId: activeUserId,
          userEmail: activeUserEmail,
          orderType: 'custom_kit_assisted',
          requestDetails: {
            photo_url: finalPhotoUrl,
            pattern_result_url: '',
            size: sizePreference,
            color_count: colorCount,
            stitch_count: null,
            product_style: productStyle,
            delivery_address: deliveryAddress.trim(),
            phone: phone.trim(),
            customer_notes: notes.trim(),
            customer_name: effectiveUser?.name || '',
            customer_email: activeUserEmail || '',
          }
        });

        if (res.success) {
          setIsSuccess(true);
        } else {
          setErrorMessage(res.error?.message || 'Failed to submit quote request. Please try again.');
        }
      } else if (activeModal === 'custom-stitched') {
        // Flow 3: Custom stitched product request
        const res = await createOrderRequest({
          userId: activeUserId,
          userEmail: activeUserEmail,
          orderType: 'custom_stitched',
          requestDetails: {
            photo_url: finalPhotoUrl,
            pattern_result_url: '',
            size: sizePreference,
            color_count: colorCount,
            stitch_count: null,
            is_framed: isFramed,
            framing_option: isFramed ? framingOption : 'Unframed (Finished Edges)',
            delivery_address: deliveryAddress.trim(),
            phone: phone.trim(),
            customer_notes: notes.trim(),
            customer_name: effectiveUser?.name || '',
            customer_email: activeUserEmail || '',
          }
        });

        if (res.success) {
          setIsSuccess(true);
        } else {
          setErrorMessage(res.error?.message || 'Failed to submit quote request. Please try again.');
        }
      }
    } catch (err: any) {
      console.error('Failed to submit quote request:', err);
      setErrorMessage(err?.message || 'An error occurred while submitting your quote request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF6EE] text-[#1D231E]">
      
      {/* Top Header */}
      <div className="bg-[#1D231E] text-white py-12 px-6 lg:px-12 border-b border-[#2D382E] relative overflow-hidden">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <button
              onClick={onGoHome}
              className="inline-flex items-center gap-2 text-xs font-semibold text-[#93A28F] hover:text-white mb-3 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Home</span>
            </button>
            
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full bg-[#E8EFE5] text-[#3D5239] text-[10px] font-bold uppercase tracking-wider">
                Marketplace
              </span>
              <span className="text-[11px] text-[#A2B0A0]">• Custom-Order & Quote Studio</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white flex items-center gap-3">
              <span>Marketplace</span>
              <ShoppingBag className="w-6 h-6 text-[#E06C38]" />
            </h1>
            <p className="text-sm text-[#A2B0A0] mt-1 max-w-xl">
              Turn your memories into physical stitching kits or commission our master artisans to stitch and frame an heirloom piece for you.
            </p>
          </div>
        </div>

        <div className="absolute -right-10 top-0 w-96 h-96 bg-[#E06C38]/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Main Two-Card Layout */}
      <div className="max-w-5xl mx-auto px-6 lg:px-8 py-14">
        
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-bold uppercase tracking-widest text-[#E06C38] bg-[#E06C38]/10 px-3 py-1 rounded-full inline-block mb-3">
            Bespoke Custom Orders
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#1D231E]">
            How would you like to create your piece?
          </h2>
          <p className="text-xs sm:text-sm text-[#5A6659] mt-2">
            Select an option below to convert your photo into a kit or have our team handcraft the entire finished product.
          </p>
        </div>

        {/* The Two Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
          
          {/* Card 1: Custom Kits */}
          <div className="bg-white rounded-3xl p-8 border border-[#E8E1D2] shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#E06C38]/5 rounded-bl-full pointer-events-none" />
            
            <div>
              <div className="w-14 h-14 rounded-2xl bg-[#E06C38]/10 text-[#E06C38] flex items-center justify-center mb-6 group-hover:scale-105 transition-transform">
                <Package className="w-7 h-7" />
              </div>

              <span className="text-xs font-bold uppercase tracking-wider text-[#E06C38] block mb-1">
                DIY Physical Kit
              </span>
              <h3 className="text-2xl font-bold text-[#1D231E] mb-3">
                Custom Kits
              </h3>

              <p className="text-sm text-[#5A6659] leading-relaxed mb-6 font-medium">
                Turn your photo into a stitching kit, delivered to your door.
              </p>

              <div className="space-y-2.5 text-xs text-[#3A4538] mb-8 pb-6 border-b border-[#F0EBE1]">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#93A28F] shrink-0" />
                  <span>Custom-cut Zweigart Aida cloth</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#93A28F] shrink-0" />
                  <span>Pre-sorted French DMC cotton floss skeins</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#93A28F] shrink-0" />
                  <span>Bohin tapestry needles & printed color chart</span>
                </div>
              </div>
            </div>

            {/* Actions for Card 1 */}
            <div className="space-y-3 pt-2">
              <button
                onClick={onOpenConverter}
                className="w-full py-3.5 px-5 rounded-2xl bg-[#E06C38] hover:bg-[#d05c28] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Use the Photo Converter</span>
              </button>

              <button
                onClick={() => handleOpenModal('assisted-kit')}
                className="w-full py-3 px-4 rounded-2xl bg-[#FAF6EE] hover:bg-[#EFE7D8] text-[#1D231E] font-semibold text-xs flex items-center justify-center gap-1.5 border border-[#D5CDC0] transition-colors cursor-pointer"
              >
                <HelpCircle className="w-4 h-4 text-[#70806E]" />
                <span>Not sure how to use the converter? Request a kit</span>
              </button>
            </div>
          </div>

          {/* Card 2: Custom Stitched Product */}
          <div className="bg-white rounded-3xl p-8 border border-[#E8E1D2] shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#3D5239]/5 rounded-bl-full pointer-events-none" />
            
            <div>
              <div className="w-14 h-14 rounded-2xl bg-[#3D5239]/10 text-[#3D5239] flex items-center justify-center mb-6 group-hover:scale-105 transition-transform">
                <Palette className="w-7 h-7" />
              </div>

              <span className="text-xs font-bold uppercase tracking-wider text-[#3D5239] block mb-1">
                Finished Heirloom Art
              </span>
              <h3 className="text-2xl font-bold text-[#1D231E] mb-3">
                Custom Stitched Product
              </h3>

              <p className="text-sm text-[#5A6659] leading-relaxed mb-6 font-medium">
                We stitch it for you — just send your photo.
              </p>

              <div className="space-y-2.5 text-xs text-[#3A4538] mb-6 pb-6 border-b border-[#F0EBE1]">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#93A28F] shrink-0" />
                  <span>Handcrafted by master artisan embroiderers</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#93A28F] shrink-0" />
                  <span>Washed, ironed, and museum-grade mounted</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#93A28F] shrink-0" />
                  <span>Delivered framed and ready to hang</span>
                </div>
                <div className="flex items-start gap-2.5 text-[#633912] bg-[#FFF8F2] p-3 rounded-2xl border border-[#F5D8C4] mt-2">
                  <Clock className="w-4 h-4 text-[#E06C38] shrink-0 mt-0.5" />
                  <span className="leading-relaxed">
                    ⏱ <strong>Typically takes 2–3 months to complete</strong>, depending on size, color count, and stitch complexity.
                  </span>
                </div>
              </div>
            </div>

            {/* Action for Card 2 */}
            <div className="pt-2">
              <button
                onClick={() => handleOpenModal('custom-stitched')}
                className="w-full py-3.5 px-5 rounded-2xl bg-[#1D231E] hover:bg-[#323D34] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <Heart className="w-4 h-4 text-[#E06C38]" />
                <span>Request a Custom Stitched Product</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          </div>

        </div>

        {/* Studio Tier 15% Discount Promotional Banner (Visible ONLY for logged-in free/pro users) */}
        {showStudioPromo && (
          <div className="mt-12 p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-[#2D5A43] via-[#244835] to-[#1D3B2C] text-white border border-[#3D6E54] shadow-md relative overflow-hidden animate-fade-in">
            {/* Subtle decorative glows */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#E06C38]/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-[#93A28F]/20 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-3 max-w-2xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-[#E06C38] text-white text-[11px] font-extrabold uppercase tracking-wider shadow-xs flex items-center gap-1.5">
                    <Percent className="w-3.5 h-3.5" />
                    Studio Member Benefit
                  </span>
                  <span className="text-xs text-[#C8D7C5] font-medium">
                    Current Plan: <strong className="text-white capitalize">{userTier === 'pro' ? 'Pro Crafter' : 'Free Crafter'}</strong>
                  </span>
                </div>

                <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white leading-snug">
                  Studio members save 15% on every custom kit and stitched product order
                </h3>

                <p className="text-xs sm:text-sm text-[#D3E0D1] leading-relaxed">
                  Upgrade your membership to automatically receive an exclusive 15% discount applied directly to all bespoke handcrafted kits and finished stitched heirlooms, along with priority crafting and unlimited pattern exports.
                </p>
              </div>

              <div className="shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenUpgradeModal) {
                      onOpenUpgradeModal();
                    } else if (onNavigateToSection) {
                      onNavigateToSection('pricing-section');
                    } else {
                      onGoHome();
                    }
                  }}
                  className="px-6 py-3.5 rounded-2xl bg-[#E06C38] hover:bg-[#d05c28] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap"
                >
                  <Sparkles className="w-4 h-4 text-amber-200" />
                  <span>Upgrade to Studio Plan</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Quote Request Modal */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-[#FAF6EE] rounded-3xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-[#E8E1D2] relative overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-[#E8E1D2] bg-white flex items-center justify-between shrink-0 sticky top-0 z-20">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                  activeModal === 'assisted-kit' ? 'bg-[#E06C38]/10 text-[#E06C38]' : 'bg-[#3D5239]/10 text-[#3D5239]'
                }`}>
                  {activeModal === 'assisted-kit' ? <Package className="w-5 h-5" /> : <Palette className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#1D231E]">
                    {activeModal === 'assisted-kit' ? 'Request an Assisted Kit' : 'Request Custom Stitched Product'}
                  </h3>
                  <p className="text-xs text-[#6B7869]">
                    {activeModal === 'assisted-kit' 
                      ? 'Our team will convert your photo and pack the materials.' 
                      : 'Our artisan stitchers will create the complete finished piece.'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActiveModal(null)}
                className="p-2 text-[#6B7869] hover:text-[#1D231E] hover:bg-[#E8E1D2]/60 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 sm:p-8 overflow-y-auto flex-1 overscroll-contain">
              {isSuccess ? (
                <div className="text-center py-6 space-y-4">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="text-xl font-bold text-[#1D231E]">
                      Order Received
                    </h4>
                    <p className="text-sm font-medium text-[#2D382E] max-w-md mx-auto leading-relaxed bg-white border border-[#E8E1D2] p-4 rounded-2xl">
                      Order received — we'll confirm final pricing and delivery charges in your dashboard within 24-48 hours.
                    </p>
                  </div>

                  <div className="bg-[#F3EDE0] p-4 rounded-2xl text-left text-xs space-y-2 border border-[#E2D8C3] max-w-md mx-auto">
                    <div className="flex justify-between">
                      <span className="text-[#6B7869]">Order Type:</span>
                      <span className="font-semibold text-[#1D231E]">
                        {activeModal === 'assisted-kit' ? 'Assisted Custom Kit' : 'Custom Hand-Stitched Art'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#6B7869]">Size Preference:</span>
                      <span className="font-semibold text-[#1D231E]">{sizePreference}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#6B7869]">Colors:</span>
                      <span className="font-semibold text-[#1D231E]">{colorCount}</span>
                    </div>
                    {activeModal === 'assisted-kit' ? (
                      <div className="flex justify-between">
                        <span className="text-[#6B7869]">Product Style:</span>
                        <span className="font-semibold text-[#1D231E]">{productStyle}</span>
                      </div>
                    ) : (
                      <div className="flex justify-between">
                        <span className="text-[#6B7869]">Framing:</span>
                        <span className="font-semibold text-[#1D231E]">
                          {isFramed ? framingOption : 'Unframed'}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-[#6B7869]">Status:</span>
                      <span className="font-semibold text-[#E06C38] bg-[#E06C38]/10 px-2 py-0.5 rounded">
                        Pending Quote
                      </span>
                    </div>
                  </div>

                  <div className="pt-4 flex items-center justify-center gap-3">
                    <button
                      onClick={() => setActiveModal(null)}
                      className="px-6 py-2.5 bg-[#1D231E] hover:bg-[#323D34] text-white text-xs font-bold rounded-full transition-colors cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmitRequest} className="space-y-4">
                  
                  {/* Prominent Production Timeline Notice for Custom Stitched Orders */}
                  {activeModal === 'custom-stitched' && (
                    <div className="p-4 bg-[#FFF8F2] border-2 border-[#E06C38]/30 rounded-2xl flex items-start gap-3.5 text-xs text-[#2D231E] shadow-2xs">
                      <div className="w-9 h-9 rounded-xl bg-[#E06C38]/15 text-[#E06C38] flex items-center justify-center shrink-0 mt-0.5">
                        <Clock className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-[#1D231E]">Production Timeline Notice</span>
                          <span className="px-2 py-0.5 rounded-md bg-[#E06C38]/15 text-[#E06C38] font-bold text-[10px] uppercase tracking-wider">
                            2–3 Months
                          </span>
                        </div>
                        <p className="text-[#5A4B41] leading-relaxed">
                          ⏱ <strong>Typically takes 2–3 months to complete</strong>, depending on size, color count, and stitch complexity. Every single cross-stitch is meticulously hand-embroidered by our master artisans to deliver an heirloom piece that lasts generations.
                        </p>
                      </div>
                    </div>
                  )}

                  {errorMessage && (
                    <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2 text-rose-700 text-xs">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  {/* Photo Upload Area */}
                  <div>
                    <label className="block text-xs font-bold text-[#1D231E] mb-1">
                      Upload Photo / Image <span className="text-rose-500">*</span>
                    </label>
                    <div className="border-2 border-dashed border-[#D5CDC0] hover:border-[#E06C38] bg-white rounded-2xl p-4 text-center relative transition-colors">
                      {imagePreview ? (
                        <div className="flex items-center gap-4 text-left">
                          <img 
                            src={imagePreview} 
                            alt="Uploaded preview" 
                            className="w-16 h-16 rounded-xl object-cover border border-[#E8E1D2]" 
                          />
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-bold text-[#1D231E] block truncate">Photo attached</span>
                            <span className="text-[10px] text-[#70806E]">Ready for studio review</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setImagePreview(null)}
                            className="p-1.5 rounded-full hover:bg-[#FAF6EE] text-[#6B7869] cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div>
                          <Upload className="w-6 h-6 text-[#93A28F] mx-auto mb-1" />
                          <p className="text-xs font-semibold text-[#1D231E]">
                            Click or drag to attach your photo
                          </p>
                          <p className="text-[10px] text-[#70806E] mt-0.5">JPG, PNG, WebP up to 10MB</p>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Size & Color Selection */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#1D231E] mb-1">Size</label>
                      <select
                        value={sizePreference}
                        onChange={(e) => setSizePreference(e.target.value)}
                        className="w-full px-3 py-2.5 bg-white border border-[#D5CDC0] rounded-xl text-xs text-[#1D231E] focus:outline-none focus:border-[#E06C38] cursor-pointer"
                      >
                        <option value="Small (5&quot; × 7&quot;)">Small (5" × 7")</option>
                        <option value="Medium (8&quot; × 10&quot;)">Medium (8" × 10")</option>
                        <option value="Large (11&quot; × 14&quot;)">Large (11" × 14")</option>
                        <option value="Extra Large (16&quot; × 20&quot;)">Extra Large (16" × 20")</option>
                        <option value="Custom Size">Custom Size</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#1D231E] mb-1">Color Count</label>
                      <select
                        value={colorCount}
                        onChange={(e) => setColorCount(e.target.value)}
                        className="w-full px-3 py-2.5 bg-white border border-[#D5CDC0] rounded-xl text-xs text-[#1D231E] focus:outline-none focus:border-[#E06C38] cursor-pointer"
                      >
                        {activeModal === 'assisted-kit' ? (
                          <>
                            <option value="12-18 Colors (Beginner Friendly)">12-18 Colors (Simple & Clean)</option>
                            <option value="20-30 Colors">20-30 Colors (Rich & Detailed)</option>
                            <option value="32-45 Colors">32-45 Colors (High Precision)</option>
                            <option value="50+ Colors">50+ Colors (Studio Realism)</option>
                          </>
                        ) : (
                          <>
                            <option value="15-25 Threads">15-25 Threads (Natural Palette)</option>
                            <option value="26-40 Threads">26-40 Threads (Detailed Heritage)</option>
                            <option value="40+ Threads">40+ Threads (Masterpiece Ultra)</option>
                          </>
                        )}
                      </select>
                    </div>
                  </div>

                  {/* Flow-Specific Options */}
                  {activeModal === 'assisted-kit' ? (
                    <div>
                      <label className="block text-xs font-bold text-[#1D231E] mb-1">Product Style</label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setProductStyle('Completed Product')}
                          className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                            productStyle === 'Completed Product'
                              ? 'border-[#E06C38] bg-[#E06C38]/10 text-[#E06C38]'
                              : 'border-[#D5CDC0] bg-white text-[#1D231E] hover:bg-[#FAF6EE]'
                          }`}
                        >
                          <span>Full Physical Kit</span>
                          {productStyle === 'Completed Product' && <Check className="w-4 h-4" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => setProductStyle('Pattern Only')}
                          className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                            productStyle === 'Pattern Only'
                              ? 'border-[#E06C38] bg-[#E06C38]/10 text-[#E06C38]'
                              : 'border-[#D5CDC0] bg-white text-[#1D231E] hover:bg-[#FAF6EE]'
                          }`}
                        >
                          <span>Pattern Only (Digital PDF)</span>
                          {productStyle === 'Pattern Only' && <Check className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-bold text-[#1D231E] mb-1">Framing & Presentation</label>
                      <div className="space-y-2">
                        <div className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-[#D5CDC0]">
                          <label className="flex items-center gap-2 text-xs font-semibold text-[#1D231E] cursor-pointer">
                            <input
                              type="radio"
                              name="framed"
                              checked={isFramed}
                              onChange={() => setIsFramed(true)}
                              className="accent-[#E06C38]"
                            />
                            <span>Framed / Hoop Mounted</span>
                          </label>
                          <label className="flex items-center gap-2 text-xs font-semibold text-[#1D231E] cursor-pointer ml-4">
                            <input
                              type="radio"
                              name="framed"
                              checked={!isFramed}
                              onChange={() => setIsFramed(false)}
                              className="accent-[#E06C38]"
                            />
                            <span>Unframed (Ironed Cloth)</span>
                          </label>
                        </div>

                        {isFramed && (
                          <select
                            value={framingOption}
                            onChange={(e) => setFramingOption(e.target.value)}
                            className="w-full px-3 py-2.5 bg-white border border-[#D5CDC0] rounded-xl text-xs text-[#1D231E] focus:outline-none focus:border-[#E06C38] cursor-pointer"
                          >
                            <option value="Museum Framed & Matted (With Glass)">Museum Framed & Matted (With Anti-Glare Glass)</option>
                            <option value="Stretched in Bamboo/Wood Hoop">Stretched in Bamboo/Wood Hoop (Ready to Hang)</option>
                            <option value="Custom Wood Floating Frame">Custom Wood Floating Frame</option>
                          </select>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Delivery Address */}
                  <div>
                    <label className="block text-xs font-bold text-[#1D231E] mb-1">
                      Delivery Address <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      required
                      rows={2}
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="Street address, Apt/Suite, City, State/Province, Postal Code, Country"
                      className="w-full px-3.5 py-2 bg-white border border-[#D5CDC0] rounded-xl text-xs text-[#1D231E] focus:outline-none focus:border-[#E06C38]"
                    />
                  </div>

                  {/* Phone Number */}
                  <div>
                    <label className="block text-xs font-bold text-[#1D231E] mb-1">
                      Contact Phone Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="w-full px-3.5 py-2.5 bg-white border border-[#D5CDC0] rounded-xl text-xs text-[#1D231E] focus:outline-none focus:border-[#E06C38]"
                    />
                  </div>

                  {/* Special Instructions */}
                  <div>
                    <label className="block text-xs font-bold text-[#1D231E] mb-1">
                      Notes or Specific Requests (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Tell us about deadline, color preferences, dedication text, or questions..."
                      className="w-full px-3.5 py-2 bg-white border border-[#D5CDC0] rounded-xl text-xs text-[#1D231E] focus:outline-none focus:border-[#E06C38]"
                    />
                  </div>

                  {/* Custom Stitched Timeline Reminder before Submit */}
                  {activeModal === 'custom-stitched' && (
                    <div className="p-3 bg-[#FAF6EE] border border-[#E8E1D2] rounded-xl flex items-center gap-2.5 text-[11px] text-[#4A544A]">
                      <Clock className="w-4 h-4 text-[#E06C38] shrink-0" />
                      <span>
                        Reminder: Handcrafted finished art typically takes <strong>2–3 months</strong> to complete before shipping.
                      </span>
                    </div>
                  )}

                  {/* Submit Button */}
                  <div className="pt-1">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className={`w-full py-3.5 px-6 rounded-2xl text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer ${
                        activeModal === 'assisted-kit' 
                          ? 'bg-[#E06C38] hover:bg-[#d05c28]' 
                          : 'bg-[#1D231E] hover:bg-[#323D34]'
                      } disabled:opacity-50`}
                    >
                      {isSubmitting ? (
                        <span>Submitting Request...</span>
                      ) : (
                        <>
                          <FileText className="w-4 h-4" />
                          <span>Submit Quote Request</span>
                        </>
                      )}
                    </button>
                    <p className="text-[11px] text-[#6B7869] text-center mt-2">
                      No payment required now. You will receive a quote directly in your dashboard.
                    </p>
                  </div>

                </form>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Auth Modal Triggered if Guest clicks Submit */}
      {authModalConfig?.isOpen && (
        <AuthModal
          isOpen={true}
          onClose={() => setAuthModalConfig(null)}
          defaultTab={authModalConfig.defaultTab}
          customTitle={authModalConfig.customTitle}
          customSubtitle={authModalConfig.customSubtitle}
          onLoginSuccess={(u) => {
            if (onLoginSuccess) onLoginSuccess(u);
            setAuthModalConfig(null);
          }}
        />
      )}

    </div>
  );
};
