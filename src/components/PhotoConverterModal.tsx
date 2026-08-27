import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X, Upload, Sparkles, Sliders, Layers, Check, Download,
  RefreshCw, Lock, Shield, ArrowRight, Eye, CheckCircle2,
  Edit3, Trash2, Repeat, Ruler, Calculator, ZoomIn, Info,
  ShoppingBag, Package, Truck, CreditCard, Crown, AlertCircle
} from 'lucide-react';
import { DMCItem, DMC_DATABASE } from '../utils/dmcPalette';
import {
  PatternConfig,
  GeneratedPattern,
  FABRIC_COUNTS,
  generatePatternFromImage,
  renderPatternCanvas,
  generatePrintableImage,
  createScaledThumbnail
} from '../utils/patternEngine';
import { exportPatternToPDF, generatePatternPDFBlob } from '../utils/pdfExporter';
import { 
  fetchUserProfile, 
  getEffectiveTier,
  saveUserConversionJob, 
  saveAdminOrderGeneratedPattern,
  uploadPDFToSupabase, 
  uploadThumbnailToSupabase, 
  uploadOriginalPhotoToSupabase, 
  uploadPatternPreviewToSupabase, 
  createOrderRequest, 
  supabase,
  SupabaseStitchOrderRow
} from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { AuthModal } from './AuthModal';
import { StudioImageEditorModal } from './StudioImageEditorModal';
import dogImg from '../assets/images/hoop_dog.png';

interface PhotoConverterModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: { id?: string; name: string; email: string; avatar_url?: string } | null;
  onLoginSuccess?: (user: { id?: string; name: string; email: string; avatar_url?: string }) => void;
  adminOrder?: SupabaseStitchOrderRow | null;
  onAdminPatternSaved?: (updatedOrder: any) => void;
}

export const PhotoConverterModal: React.FC<PhotoConverterModalProps> = ({
  isOpen,
  onClose,
  user: propUser,
  onLoginSuccess,
  adminOrder,
  onAdminPatternSaved
}) => {
  const { session, isLoggedIn: isAuthLoggedIn, user: authUser } = useAuth();
  const effectiveUser = authUser || propUser;
  const isAdminOrderMode = Boolean(adminOrder);

  // Admin order mode save state
  const [isSavingToAdminOrder, setIsSavingToAdminOrder] = useState<boolean>(false);
  const [adminOrderSaveSuccess, setAdminOrderSaveSuccess] = useState<boolean>(false);

  // User Tier & Active Plan Tier State (Free, Pro, Studio)
  const [userTier, setUserTier] = useState<'free' | 'pro' | 'studio'>(isAdminOrderMode ? 'studio' : 'free');
  const [planTier, setPlanTier] = useState<'free' | 'pro' | 'studio'>(isAdminOrderMode ? 'studio' : 'free');

  // Converter Login Prompt & Auth Modal State
  const [showGuestPrompt, setShowGuestPrompt] = useState<boolean>(false);
  const [authModalConfig, setAuthModalConfig] = useState<{
    isOpen: boolean;
    defaultTab: 'login' | 'signup';
    customTitle?: string;
    customSubtitle?: string;
  } | null>(null);

  // Sync plan mode according to user's subscription_tier from Supabase profile (or unlock studio for admin mode)
  useEffect(() => {
    if (isAdminOrderMode) {
      setUserTier('studio');
      setPlanTier('studio');
      return;
    }

    let active = true;
    const syncUserTier = async () => {
      let targetTier: 'free' | 'pro' | 'studio' = 'free';

      if (effectiveUser?.id || effectiveUser?.email) {
        try {
          const profile = await fetchUserProfile(effectiveUser.id, effectiveUser.email);
          targetTier = getEffectiveTier(profile);
        } catch (err) {
          console.error('Error fetching user profile for converter tier:', err);
          targetTier = 'free';
        }
      }

      if (active) {
        setUserTier(targetTier);
        setPlanTier(targetTier);
      }
    };

    if (isOpen) {
      syncUserTier();
    }

    const handleTierChange = (e: any) => {
      let extractedTier: 'free' | 'pro' | 'studio' | null = null;
      if (typeof e?.detail === 'string') {
        extractedTier = e.detail as any;
      } else if (typeof e?.detail?.tier === 'string') {
        extractedTier = e.detail.tier as any;
      }

      if (extractedTier === 'free' || extractedTier === 'pro' || extractedTier === 'studio') {
        setUserTier(extractedTier);
        setPlanTier(extractedTier);
      } else {
        syncUserTier();
      }
    };

    window.addEventListener('dev-tier-changed', handleTierChange);
    window.addEventListener('tierChanged', handleTierChange);

    return () => {
      active = false;
      window.removeEventListener('dev-tier-changed', handleTierChange);
      window.removeEventListener('tierChanged', handleTierChange);
    };
  }, [isOpen, effectiveUser, isAdminOrderMode]);

  // Input Image State
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string>('');
  const [originalPhotoUrl, setOriginalPhotoUrl] = useState<string>('');
  const [customPhotoName, setCustomPhotoName] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isImageEditorOpen, setIsImageEditorOpen] = useState<boolean>(false);

  // Pattern Parameters with Default Initial Values
  const [gridWidth, setGridWidth] = useState<number>(60);
  const [fabricCount, setFabricCount] = useState<number>(14);
  const [colorLimit, setColorLimit] = useState<number>(18);
  const [dithering, setDithering] = useState<'none' | 'soft' | 'floyd-steinberg' | 'atkinson'>('none');
  const [brightness, setBrightness] = useState<number>(0);
  const [contrast, setContrast] = useState<number>(0);
  const [saturation, setSaturation] = useState<number>(0);
  const [showGridLines, setShowGridLines] = useState<boolean>(true);
  const [showSymbolsOnColor, setShowSymbolsOnColor] = useState<boolean>(true);
  const [brand, setBrand] = useState<'DMC' | 'Anchor'>('DMC');

  // Order Kit & Supplies Modal State
  const [isOrderKitModalOpen, setIsOrderKitModalOpen] = useState<boolean>(false);
  const [orderDeliveryAddress, setOrderDeliveryAddress] = useState<string>('');
  const [orderPhone, setOrderPhone] = useState<string>('');
  const [orderNotes, setOrderNotes] = useState<string>('');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState<boolean>(false);
  const [orderSuccess, setOrderSuccess] = useState<boolean>(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [pendingOrderSubmit, setPendingOrderSubmit] = useState<boolean>(false);

  // Reset converter state to defaults for a new conversion session
  const resetSessionState = () => {
    lastSavedSignatureRef.current = null;
    isSavingWorkflowRef.current = false;
    setSelectedPhotoUrl('');
    setOriginalPhotoUrl('');
    setCustomPhotoName('');
    setIsImageEditorOpen(false);
    setGridWidth(60);
    setFabricCount(14);
    setColorLimit(18);
    setDithering('none');
    setBrightness(0);
    setContrast(0);
    setSaturation(0);
    setShowGridLines(true);
    setShowSymbolsOnColor(true);
    setBrand('DMC');
    setCompletedStitches(new Set());
    setViewMode('color');
    setPattern(null);
    setIsOrderKitModalOpen(false);
    setOrderSuccess(false);
    setOrderError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleConvertAnotherImage = () => {
    resetSessionState();
  };

  const handleOpenOrderKitModal = () => {
    setOrderSuccess(false);
    setOrderError(null);
    setIsOrderKitModalOpen(true);
  };

  const handleOrderKitSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!orderDeliveryAddress.trim()) {
      setOrderError('Please provide a valid delivery address.');
      return;
    }
    if (!orderPhone.trim()) {
      setOrderError('Please provide a contact phone number.');
      return;
    }

    const activeUserId = session?.user?.id || effectiveUser?.id;
    const activeUserEmail = session?.user?.email || effectiveUser?.email;

    if (!activeUserId && !activeUserEmail) {
      setPendingOrderSubmit(true);
      setAuthModalConfig({
        isOpen: true,
        defaultTab: 'login',
        customTitle: 'Log In to Submit Order',
        customSubtitle: 'Please log in or create an account to place your custom kit request and track quotes.',
      });
      return;
    }

    setIsSubmittingOrder(true);
    setOrderError(null);

    try {
      // Background save of pattern
      executeSaveWorkflow().catch(() => {});

      let photoUrl = selectedPhotoUrl || originalPhotoUrl || '';
      let patternResultUrl = '';

      if (pattern && canvasRef.current) {
        try {
          patternResultUrl = canvasRef.current.toDataURL('image/png');
        } catch {}
      }

      const sizeStr = pattern
        ? `${pattern.physicalWidthInches}" × ${pattern.physicalHeightInches}" (${pattern.widthStitches} × ${pattern.heightStitches} sts, ${fabricCount}ct Aida)`
        : `${gridWidth} stitches, ${fabricCount}ct Aida`;

      // Extract thread requirements from pattern floss list for admin quoting
      const threadRequirements = pattern?.flossList?.map((floss) => ({
        dmc_code: String(floss.dmc?.code || '').trim(),
        color_name: floss.dmc?.name || `DMC ${floss.dmc?.code || ''}`,
        hex: floss.dmc?.hex || '#888888',
        stitch_count: floss.stitchCount || 0,
        skeins_needed: floss.skeinsNeeded || Math.max(1, Math.ceil((floss.stitchCount || 0) / 1800)),
      })) || [];

      const fabricDetails = pattern ? {
        fabric_count: fabricCount,
        fabric_type: `${fabricCount}-Count Aida Cloth`,
        width_inches: pattern.physicalWidthInches,
        height_inches: pattern.physicalHeightInches,
        dimensions_str: `${pattern.physicalWidthInches}" × ${pattern.physicalHeightInches}"`,
      } : {
        fabric_count: fabricCount,
        fabric_type: `${fabricCount}-Count Aida Cloth`,
      };

      const result = await createOrderRequest({
        userId: activeUserId,
        userEmail: activeUserEmail,
        orderType: 'custom_kit_converter',
        requestDetails: {
          photo_url: photoUrl,
          pattern_result_url: patternResultUrl,
          size: sizeStr,
          color_count: pattern ? pattern.flossList.length : colorLimit,
          stitch_count: pattern ? pattern.totalStitches : null,
          delivery_address: orderDeliveryAddress.trim(),
          phone: orderPhone.trim(),
          customer_notes: orderNotes.trim(),
          brand: brand,
          fabric_count: fabricCount,
          customer_name: effectiveUser?.name || '',
          customer_email: activeUserEmail || '',
          thread_requirements: threadRequirements,
          fabric_details: fabricDetails,
        }
      });

      if (result.success) {
        setOrderSuccess(true);
      } else {
        setOrderError(result.error?.message || 'Failed to submit order to database. Please try again.');
      }
    } catch (err: any) {
      console.error('Error submitting kit order from converter:', err);
      setOrderError(err?.message || 'Failed to submit order request.');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const handleClose = () => {
    resetSessionState();
    onClose();
  };

  // View Mode: 'color' (Color Chart), 'symbol' (B&W Printable Chart), 'tracker' (Interactive Stitch Tracker)
  const [viewMode, setViewMode] = useState<'color' | 'symbol' | 'tracker'>('color');

  // Processing & Generated Pattern
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [pattern, setPattern] = useState<GeneratedPattern | null>(null);

  // Daily Pattern Generations Counter (Free Plan Limit = 3)
  const [dailyGenerations, setDailyGenerations] = useState<number>(1);

  // Manual Color Editing (Studio Plan) - Overridden Palette
  const [customPalette, setCustomPalette] = useState<DMCItem[] | undefined>(undefined);
  const [editingDmcCode, setEditingDmcCode] = useState<string | null>(null);
  const [swapTargetCode, setSwapTargetCode] = useState<string>('');

  // Interactive Stitch Tracker State
  const [completedStitches, setCompletedStitches] = useState<Set<number>>(new Set());

  // Studio Plan DMC ↔ Anchor Bidirectional Converter State
  const [conversionDirection, setConversionDirection] = useState<'dmcToAnchor' | 'anchorToDmc'>('dmcToAnchor');
  const [lookupThreadCode, setLookupThreadCode] = useState<string>('DMC 310');

  // Compute lookup item for Studio Converter
  const lookupItem = useMemo(() => {
    if (conversionDirection === 'dmcToAnchor') {
      return DMC_DATABASE.find(d => d.code === lookupThreadCode) || DMC_DATABASE[0];
    } else {
      return DMC_DATABASE.find(d => d.anchorCode === lookupThreadCode) || DMC_DATABASE[0];
    }
  }, [lookupThreadCode, conversionDirection]);

  // Canvas Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Compute Max Allowed Grid Width & Colors based on Tier
  const maxAllowedGrid = planTier === 'free' ? 100 : (planTier === 'pro' ? 300 : 400);
  const maxAllowedColors = planTier === 'free' ? 50 : (planTier === 'pro' ? 150 : 250);

  // Track saved conversion job signature to avoid duplicate saves for identical results
  const lastSavedSignatureRef = useRef<string | null>(null);
  const isSavingWorkflowRef = useRef<boolean>(false);

  // Generate Pattern Callback (Local Preview Only - Does NOT trigger cloud save)
  const processPattern = async () => {
    if (!selectedPhotoUrl) return;
    setIsProcessing(true);
    try {
      const config: PatternConfig = {
        gridWidth: Math.min(gridWidth, maxAllowedGrid),
        fabricCount,
        colorLimit: Math.min(colorLimit, maxAllowedColors),
        showGridLines,
        showSymbols: showSymbolsOnColor,
        brand,
        dithering,
        brightness: planTier === 'studio' ? brightness : 0,
        contrast: planTier === 'studio' ? contrast : 0,
        saturation: planTier === 'studio' ? saturation : 0,
        isAdFree: planTier !== 'free',
        planTier
      };

      const result = await generatePatternFromImage(selectedPhotoUrl, config);
      setPattern(result);
    } catch (err) {
      console.error('Pattern processing error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Generate signature to uniquely identify the current conversion settings and output
  const getCurrentPatternSignature = () => {
    if (!pattern) return '';
    return `${selectedPhotoUrl.substring(0, 100)}_${gridWidth}_${fabricCount}_${colorLimit}_${brand}_${dithering}_${brightness}_${contrast}_${saturation}_${showGridLines}_${showSymbolsOnColor}_${customPhotoName}_${pattern.widthStitches}x${pattern.heightStitches}_${pattern.flossList.length}`;
  };

  // Triggered ONLY when the user clicks "Download Complete Pattern PDF" or "Order Kit & Supplies"
  const executeSaveWorkflow = async (): Promise<boolean> => {
    if (!pattern || !selectedPhotoUrl) return false;

    const signature = getCurrentPatternSignature();
    if (lastSavedSignatureRef.current === signature) {
      console.log('[ConversionSave] This specific conversion result was already saved in this session. Skipping duplicate save.');
      return true;
    }

    if (isAdminOrderMode) {
      // CRITICAL: In admin order mode, NEVER create a row in conversion_jobs under admin's account!
      return true;
    }

    if (isSavingWorkflowRef.current) {
      console.log('[ConversionSave] Save workflow is currently active, awaiting completion...');
      return false;
    }

    isSavingWorkflowRef.current = true;

    try {
      console.log('[ConversionSave] User initiated action. Executing save workflow & storage uploads...');

      const isAuthenticated = !!(session?.user && isAuthLoggedIn);
      const userIdToSave = isAuthenticated ? session.user.id : 'guest';

      let compactThumb = '';
      let scaledPhoto = selectedPhotoUrl;

      try {
        compactThumb = await createScaledThumbnail(selectedPhotoUrl, 250);
        console.log('[ConversionSave] Generated compact thumbnail (250px)');
      } catch (thumbGenErr) {
        console.error('[ConversionSave] Error creating scaled thumbnail:', thumbGenErr);
        compactThumb = selectedPhotoUrl;
      }

      if (selectedPhotoUrl.startsWith('blob:') || selectedPhotoUrl.startsWith('data:image/')) {
        try {
          scaledPhoto = await createScaledThumbnail(selectedPhotoUrl, 600);
          console.log('[ConversionSave] Generated scaled photo (600px)');
        } catch (scalePhotoErr) {
          console.error('[ConversionSave] Error creating scaled photo:', scalePhotoErr);
          scaledPhoto = compactThumb || selectedPhotoUrl;
        }
      }

      let pdfUrl = '';
      let uploadedThumbUrl = '';
      let uploadedOriginalUrl = '';
      let uploadedPreviewUrl = '';

      const config: PatternConfig = {
        gridWidth: Math.min(gridWidth, maxAllowedGrid),
        fabricCount,
        colorLimit: Math.min(colorLimit, maxAllowedColors),
        showGridLines,
        showSymbols: showSymbolsOnColor,
        brand,
        dithering,
        brightness: planTier === 'studio' ? brightness : 0,
        contrast: planTier === 'studio' ? contrast : 0,
        saturation: planTier === 'studio' ? saturation : 0,
        isAdFree: planTier !== 'free',
        planTier
      };

      const jobData = {
        user_id: userIdToSave,
        title: customPhotoName || 'Converted Pattern',
        status: 'complete',
        grid_width: pattern.widthStitches,
        grid_height: pattern.heightStitches,
        colors_count: pattern.flossList.length,
        photo_url: scaledPhoto,
        thumbnail_url: compactThumb,
        original_image_url: originalPhotoUrl || selectedPhotoUrl || '',
        pattern_pdf_url: '',
        pattern_preview_url: '',
        pattern_config: config,
      };

      try {
        localStorage.setItem(`user_pattern_config_${customPhotoName || 'Converted Pattern'}`, JSON.stringify(config));
      } catch {}

      // Generate standalone PNG stitch chart image (with symbols & grid lines)
      try {
        console.log('[ConversionSave] Rendering standalone PNG stitch chart image for pattern_preview_url...');
        const previewPngDataUrl = generatePrintableImage(pattern, 'color', {
          ...config,
          showSymbols: true,
          showGridLines: true,
        });
        if (previewPngDataUrl) {
          if (previewPngDataUrl.length < 250000) {
            jobData.pattern_preview_url = previewPngDataUrl;
          }
          try {
            localStorage.setItem(`user_pattern_preview_${customPhotoName || 'Converted Pattern'}`, previewPngDataUrl);
          } catch {}
        }

        if (isAuthenticated) {
          // 1. Upload original photo submitted by user to conversion-results storage bucket
          try {
            console.log('[ConversionSave] Uploading original submitted photo to Supabase conversion-results storage bucket...');
            const uploadedOrig = await uploadOriginalPhotoToSupabase(originalPhotoUrl || selectedPhotoUrl, customPhotoName || 'Converted Pattern', userIdToSave);
            if (uploadedOrig) {
              uploadedOriginalUrl = uploadedOrig;
              jobData.original_image_url = uploadedOriginalUrl;
              console.log('[ConversionSave] Assigned original_image_url to jobData:', uploadedOriginalUrl);
            }
          } catch (origErr) {
            console.error('[ConversionSave] Error uploading original photo to storage:', origErr);
          }

          // 2. Generate pattern PDF with DMC symbol chart & color key and upload to conversion-results storage bucket
          try {
            console.log('[ConversionSave] Generating pattern PDF blob for storage upload...');
            const pdfBlob = await generatePatternPDFBlob(pattern, 'color', config, customPhotoName || 'Converted Pattern');
            console.log('[ConversionSave] Uploading PDF blob to Supabase conversion-results storage bucket...');
            const uploadedPdf = await uploadPDFToSupabase(pdfBlob, customPhotoName || 'Converted Pattern', userIdToSave);
            if (uploadedPdf) {
              pdfUrl = uploadedPdf;
              jobData.pattern_pdf_url = pdfUrl;
            }
          } catch (pdfErr) {
            console.error('[ConversionSave] Error generating or uploading pattern PDF:', pdfErr);
          }

          // 3. Upload thumbnail to storage bucket
          try {
            const uploadedThumb = await uploadThumbnailToSupabase(compactThumb || scaledPhoto, customPhotoName || 'Converted Pattern', userIdToSave);
            if (uploadedThumb) {
              uploadedThumbUrl = uploadedThumb;
              jobData.photo_url = uploadedThumbUrl;
              jobData.thumbnail_url = uploadedThumbUrl;
            }
          } catch (thumbErr) {
            console.error('[ConversionSave] Error uploading thumbnail to storage:', thumbErr);
          }

          // 4. Upload standalone PNG pattern preview to Supabase storage bucket
          try {
            console.log('[ConversionSave] Uploading pattern preview PNG to Supabase conversion-results storage bucket...');
            const uploadedPrev = await uploadPatternPreviewToSupabase(previewPngDataUrl, customPhotoName || 'Converted Pattern', userIdToSave);
            if (uploadedPrev) {
              uploadedPreviewUrl = uploadedPrev;
              jobData.pattern_preview_url = uploadedPreviewUrl;
              console.log('[ConversionSave] Assigned pattern_preview_url to jobData:', uploadedPreviewUrl);
            }
          } catch (prevErr) {
            console.error('[ConversionSave] Error uploading pattern preview PNG:', prevErr);
          }
        }
      } catch (genErr) {
        console.error('[ConversionSave] Error preparing standalone pattern preview:', genErr);
      }

      console.log('[ConversionSave] Invoking saveUserConversionJob with parameters:', jobData);

      const saveSuccess = await saveUserConversionJob(jobData);

      if (saveSuccess) {
        lastSavedSignatureRef.current = signature;
        console.log('[ConversionSave] saveUserConversionJob finished successfully. Signature stored:', signature);
      }

      return saveSuccess;
    } catch (err) {
      console.error('[ConversionSave] Exception in save workflow:', err);
      return false;
    } finally {
      isSavingWorkflowRef.current = false;
    }
  };

  // Pre-load Admin Order details when opened in Admin Mode
  useEffect(() => {
    if (isOpen && adminOrder) {
      setUserTier('studio');
      setPlanTier('studio');

      const photo = adminOrder.request_details?.photo_url || 
                    adminOrder.request_details?.original_photo_url || 
                    adminOrder.image_url || '';

      if (photo) {
        setSelectedPhotoUrl(photo);
        setOriginalPhotoUrl(photo);
      }

      setCustomPhotoName(adminOrder.title || `Order #${adminOrder.id} Pattern`);

      // If existing pattern_config, pre-populate
      const savedConfig = adminOrder.pattern_config || adminOrder.request_details?.pattern_config;
      if (savedConfig) {
        if (savedConfig.gridWidth) setGridWidth(savedConfig.gridWidth);
        if (savedConfig.fabricCount) setFabricCount(savedConfig.fabricCount);
        if (savedConfig.colorLimit) setColorLimit(savedConfig.colorLimit);
        if (savedConfig.dithering) setDithering(savedConfig.dithering);
        if (savedConfig.brightness !== undefined) setBrightness(savedConfig.brightness);
        if (savedConfig.contrast !== undefined) setContrast(savedConfig.contrast);
        if (savedConfig.saturation !== undefined) setSaturation(savedConfig.saturation);
        if (savedConfig.brand) setBrand(savedConfig.brand);
      }
    } else if (isOpen && !adminOrder && !prevIsOpenRef.current) {
      resetSessionState();
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, adminOrder]);

  // Admin Mode: Download Customer's Original Image
  const handleDownloadOriginalImage = async () => {
    const url = originalPhotoUrl || selectedPhotoUrl || adminOrder?.request_details?.photo_url || adminOrder?.image_url;
    if (!url) {
      alert('No original image found to download.');
      return;
    }
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `Order_${adminOrder?.id || 'request'}_original_photo.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, '_blank');
    }
  };

  // Admin Mode: Save generated pattern directly to the Order row in Supabase
  const handleSaveToAdminOrder = async () => {
    if (!pattern || !adminOrder) return;
    setIsSavingToAdminOrder(true);
    setAdminOrderSaveSuccess(false);

    try {
      const config: PatternConfig = {
        gridWidth: Math.min(gridWidth, maxAllowedGrid),
        fabricCount,
        colorLimit: Math.min(colorLimit, maxAllowedColors),
        showGridLines,
        showSymbols: showSymbolsOnColor,
        brand,
        dithering,
        brightness,
        contrast,
        saturation,
        isAdFree: true,
        planTier: 'studio',
      };

      let uploadedPdfUrl = adminOrder.pattern_pdf_url || adminOrder.request_details?.pattern_pdf_url || '';
      let uploadedPreviewUrl = adminOrder.pattern_preview_url || adminOrder.request_details?.pattern_preview_url || '';

      // 1. Generate standalone pattern preview image
      let previewPngDataUrl = '';
      try {
        previewPngDataUrl = generatePrintableImage(pattern, 'color', {
          ...config,
          showSymbols: true,
          showGridLines: true,
        });
      } catch (err) {
        console.warn('Error generating printable preview image:', err);
      }

      // 2. Upload PDF to storage
      try {
        const pdfBlob = await generatePatternPDFBlob(pattern, 'color', config, customPhotoName || `Order_${adminOrder.id}_Pattern`);
        const pdfName = `order_${adminOrder.id}_pattern_${Date.now()}`;
        const uploaded = await uploadPDFToSupabase(pdfBlob, pdfName, 'admin');
        if (uploaded) {
          uploadedPdfUrl = uploaded;
        }
      } catch (pdfErr) {
        console.warn('Error uploading pattern PDF in admin mode:', pdfErr);
      }

      // 3. Upload preview PNG to storage
      if (previewPngDataUrl) {
        try {
          const prevName = `order_${adminOrder.id}_preview_${Date.now()}`;
          const uploadedPrev = await uploadPatternPreviewToSupabase(previewPngDataUrl, prevName, 'admin');
          if (uploadedPrev) {
            uploadedPreviewUrl = uploadedPrev;
          }
        } catch (prevErr) {
          console.warn('Error uploading pattern preview in admin mode:', prevErr);
        }
      }

      // 4. Extract thread requirements for quotation
      const threadRequirements = pattern.flossList.map((floss) => ({
        dmc_code: String(floss.dmc?.code || '').trim(),
        color_name: floss.dmc?.name || `DMC ${floss.dmc?.code || ''}`,
        hex: floss.dmc?.hex || '#888888',
        stitch_count: floss.stitchCount || 0,
        skeins_needed: floss.skeinsNeeded || Math.max(1, Math.ceil((floss.stitchCount || 0) / 1800)),
      }));

      // 5. Extract fabric specs
      const fabricDetails = {
        fabric_count: fabricCount,
        fabric_type: `${fabricCount}-Count Aida Cloth`,
        width_inches: pattern.physicalWidthInches,
        height_inches: pattern.physicalHeightInches,
        dimensions_str: `${pattern.physicalWidthInches}" × ${pattern.physicalHeightInches}"`,
      };

      const sizeStr = `${pattern.physicalWidthInches}" × ${pattern.physicalHeightInches}" (${pattern.widthStitches} × ${pattern.heightStitches} sts, ${fabricCount}ct Aida)`;

      const payload = {
        pattern_config: config,
        pattern_pdf_url: uploadedPdfUrl || '',
        pattern_preview_url: uploadedPreviewUrl || (previewPngDataUrl && previewPngDataUrl.length < 250000 ? previewPngDataUrl : ''),
        thread_requirements: threadRequirements,
        fabric_details: fabricDetails,
        size: sizeStr,
        color_count: pattern.flossList.length,
        stitch_count: pattern.totalStitches,
        photo_url: selectedPhotoUrl,
        original_photo_url: originalPhotoUrl || selectedPhotoUrl,
      };

      console.log('[AdminOrderConverter] Writing directly to Order #' + adminOrder.id + ' (no conversion_jobs created):', payload);

      const res = await saveAdminOrderGeneratedPattern(adminOrder.raw_order_id || adminOrder.id, payload);

      if (res.success) {
        setAdminOrderSaveSuccess(true);
        onAdminPatternSaved?.({
          ...adminOrder,
          ...payload,
          request_details: {
            ...(adminOrder.request_details || {}),
            ...payload,
          },
        });
        setTimeout(() => {
          setAdminOrderSaveSuccess(false);
        }, 4500);
      } else {
        alert('Failed to save pattern to order: ' + (res.error?.message || 'Unknown database error'));
      }
    } catch (err: any) {
      console.error('Exception saving pattern to order:', err);
      alert('An error occurred while saving pattern to order.');
    } finally {
      setIsSavingToAdminOrder(false);
    }
  };

  // Reset session whenever modal is opened freshly
  const prevIsOpenRef = useRef<boolean>(false);

  // Re-run pattern processing when parameters change
  useEffect(() => {
    if (isOpen && selectedPhotoUrl) {
      const timer = setTimeout(() => {
        processPattern();
      }, 300);
      return () => clearTimeout(timer);
    } else if (isOpen && !selectedPhotoUrl) {
      setPattern(null);
    }
  }, [isOpen, selectedPhotoUrl, gridWidth, fabricCount, colorLimit, dithering, brightness, contrast, saturation, showGridLines, showSymbolsOnColor, brand, planTier]);

  // Render Pattern to Canvas whenever pattern or viewMode changes
  useEffect(() => {
    if (canvasRef.current && pattern) {
      const config: PatternConfig = {
        gridWidth,
        fabricCount,
        colorLimit,
        showGridLines,
        showSymbols: showSymbolsOnColor,
        brand,
        isAdFree: planTier !== 'free',
        planTier
      };

      renderPatternCanvas(
        canvasRef.current,
        pattern,
        viewMode,
        config
      );
    }
  }, [pattern, viewMode, showGridLines, showSymbolsOnColor, planTier]);

  if (!isOpen) return null;

  // Process Custom Image File (Supports input selection & Drag & Drop)
  const processImageFile = (file: File) => {
    if (!file || !file.type.startsWith('image/')) return;

    if (planTier === 'free' && dailyGenerations >= 3) {
      alert('Free Plan daily limit reached (3 patterns/day). Upgrade to Pro or Studio for unlimited pattern conversions!');
      return;
    }
    
    if (!effectiveUser) {
      try {
        const choice = localStorage.getItem('converterGuestChoice');
        if (!choice) {
          setShowGuestPrompt(true);
        }
      } catch {}
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64DataUrl = event.target?.result as string;
      if (base64DataUrl) {
        const fileName = file.name.replace(/\.[^/.]+$/, "");
        setSelectedPhotoUrl(base64DataUrl);
        setOriginalPhotoUrl(base64DataUrl);
        setCustomPhotoName(fileName);
        setBrightness(0);
        setContrast(0);
        setSaturation(0);
        setCompletedStitches(new Set());
        setDailyGenerations(prev => prev + 1);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processImageFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processImageFile(files[0]);
    }
  };

  // Download Action - Generates Multi-Page Zoomed PDF with Color Symbols and Floss Key
  const handleDownloadChart = async (exportMode: 'color' | 'symbol') => {
    if (!pattern || isExportingPdf) return;

    setIsExportingPdf(true);

    try {
      // Trigger save workflow (uploads & Supabase insert) when user clicks "Download Complete Pattern PDF"
      await executeSaveWorkflow();

      const config: PatternConfig = {
        gridWidth,
        fabricCount,
        colorLimit,
        showGridLines,
        showSymbols: showSymbolsOnColor,
        brand,
        isAdFree: planTier !== 'free',
        planTier
      };

      await exportPatternToPDF(pattern, exportMode, config, customPhotoName);
    } catch (err) {
      console.error('Failed to generate PDF export:', err);
      alert('Unable to generate PDF pattern. Please try again.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Canvas Click for Interactive Stitch Tracker
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (viewMode !== 'tracker' || !canvasRef.current || !pattern) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const cellW = rect.width / pattern.widthStitches;
    const cellH = rect.height / pattern.heightStitches;

    const gridX = Math.floor(clickX / cellW);
    const gridY = Math.floor(clickY / cellH);

    const index = gridY * pattern.widthStitches + gridX;

    const newSet = new Set(completedStitches);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    setCompletedStitches(newSet);
  };

  return (
    <div id="photo-converter-modal" data-converter-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-md animate-fade-in">
      <div className="bg-[#FAF6EE] rounded-3xl max-w-6xl w-full max-h-[94vh] overflow-y-auto shadow-2xl border border-[#E8E1D2] flex flex-col">
        
        {/* Modal Top Header with Plan Switcher */}
        <div className="px-6 py-4 border-b border-[#E8E1D2] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white/70 sticky top-0 z-20 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${isAdminOrderMode ? 'bg-[#2D5A43]' : 'bg-[#E06C38]'} text-white flex items-center justify-center shadow-sm shrink-0`}>
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-[#1D231E]">
                  {isAdminOrderMode ? 'Admin Order Pattern Studio' : 'Stitchly • Pattern Studio'}
                </h2>
                {isAdminOrderMode && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#2D5A43]/15 text-[#2D5A43] border border-[#2D5A43]/30">
                    Order #{adminOrder?.id}
                  </span>
                )}
              </div>
              <p className="text-xs text-[#5C685A]">
                {isAdminOrderMode
                  ? `Configuring custom pattern for ${adminOrder?.customer_name || 'Customer'} (${adminOrder?.customer_email || adminOrder?.user_id}) • Studio Suite Unlocked`
                  : 'Photo to Cross-Stitch Pattern Studio • CIEDE2000 Color Matching'}
              </p>
            </div>
          </div>

          {/* Plan Tier Display according to User Subscription Tier */}
          <div className="flex items-center gap-2 bg-[#F5EFE4] p-1.5 rounded-full border border-[#DCD2C0]">
            <span className="text-[10px] font-bold text-[#70806E] uppercase px-2">
              {isAdminOrderMode ? 'Mode:' : 'Plan Mode:'}
            </span>
            
            {isAdminOrderMode ? (
              <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-[#2D5A43] text-white shadow-xs flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-[#E06C38]" />
                <span>Admin Order</span>
              </span>
            ) : userTier === 'free' ? (
              <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-[#1D231E] text-white shadow-xs">
                Free
              </span>
            ) : userTier === 'pro' ? (
              <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-[#E06C38] text-white shadow-xs flex items-center gap-1">
                <Crown className="w-3.5 h-3.5" />
                <span>Pro</span>
              </span>
            ) : (
              <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-[#3D5239] text-white shadow-xs flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-[#E06C38]" />
                <span>Studio</span>
              </span>
            )}

            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-full bg-white hover:bg-[#E5EDE2] text-[#3D5239] flex items-center justify-center transition-colors ml-1 cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Free Plan Limit Notice Banner if in Free Mode */}
        {!isAdminOrderMode && planTier === 'free' && (
          <div className="bg-[#FFF8EC] border-b border-[#E8D0B0] px-6 py-2.5 flex items-center justify-between text-xs text-[#8A511B]">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-[#E06C38] shrink-0" />
              <span>
                <strong>Free Plan Active:</strong> Limited to 100x100 max grid size & 3 patterns per day ({3 - dailyGenerations} remaining today). Exports contain watermark.
              </span>
            </div>
            <button
              onClick={() => setPlanTier('pro')}
              className="text-[11px] font-bold text-[#E06C38] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Unlock Pro (Ad-Free, 200 Grid)</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Modal Content Body */}
        <div className="p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Controls Panel Left (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Step 1: Upload or Drop Photo */}
            <div className="bg-white p-5 rounded-2xl border border-[#E8E1D2] shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-[#1D231E] flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Upload className="w-4 h-4 text-[#E06C38]" />
                  1. Select or Drop Photo
                </span>
                <span className="text-[10px] text-[#7A8877] font-normal truncate max-w-[150px]">
                  {customPhotoName || 'No photo selected'}
                </span>
              </h3>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileInputChange}
                accept="image/*"
                className="hidden"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`w-full py-6 px-4 border-2 border-dashed rounded-xl transition-all flex flex-col items-center justify-center gap-2 text-center group cursor-pointer ${
                  isDragging
                    ? 'border-[#E06C38] bg-[#E06C38]/10 scale-[1.01]'
                    : 'border-[#C5D3C2] hover:border-[#E06C38] bg-[#FAF6EE]/70 hover:bg-[#FAF6EE]'
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                  isDragging ? 'bg-[#E06C38] text-white' : 'bg-[#E5EDE2] text-[#3D5239] group-hover:bg-[#E06C38] group-hover:text-white'
                }`}>
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-[#1D231E] block">
                    {isDragging
                      ? 'Drop Image Here to Convert'
                      : selectedPhotoUrl
                      ? 'Click or Drag to Replace Image'
                      : 'Drag & Drop or Click to Upload Image'}
                  </span>
                  <span className="text-[10px] text-[#6B7869] block mt-0.5">
                    {selectedPhotoUrl ? customPhotoName : 'Supports PNG, JPG, WEBP, GIF'}
                  </span>
                </div>
              </div>

              {/* Studio Plan Feature: Image Editor Action Button */}
              {selectedPhotoUrl && (
                <div className="pt-1">
                  {planTier === 'studio' ? (
                    <button
                      onClick={() => setIsImageEditorOpen(true)}
                      className="w-full py-2.5 px-4 bg-[#3D5239] hover:bg-[#2C3B29] text-white rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                    >
                      <Sliders className="w-4 h-4 text-[#E06C38]" />
                      <span>Launch Studio Image Editor (Crop, Scale & Tone Shading)</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => alert('Studio Image Editor (Crop, Rotate, Flip, Scale & Tone Shading / Colour Adjustments) is exclusive to Studio Plan users. Switch to Studio Plan to unlock advanced tone calibration!')}
                      className="w-full py-2.5 px-4 bg-[#F0EBE1] text-[#7A8877] rounded-xl font-bold text-xs border border-[#DCD2C0] flex items-center justify-center gap-2 cursor-pointer hover:bg-[#E8E1D2]/80 transition-colors"
                    >
                      <Lock className="w-3.5 h-3.5 text-[#E06C38]" />
                      <span>Studio Image Editor & Tone Shading (Studio Plan Exclusive)</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Step 2: Algorithm Parameters */}
            <div className="bg-white p-5 rounded-2xl border border-[#E8E1D2] shadow-xs space-y-5">
              <h3 className="text-sm font-bold text-[#1D231E] flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#E06C38]" />
                2. Grid & Thread Parameters
              </h3>

              {/* Grid Width Slider */}
              <div>
                <div className="flex justify-between text-xs font-semibold text-[#1D231E] mb-1.5">
                  <span className="flex items-center gap-1">
                    <span>Pattern Grid Width</span>
                    {planTier === 'free' && gridWidth >= 100 && (
                      <span className="text-[9px] bg-[#E06C38]/10 text-[#E06C38] px-1.5 py-0.5 rounded font-bold">Free Max</span>
                    )}
                  </span>
                  <span className="text-[#E06C38] font-mono font-bold">{gridWidth} stitches wide</span>
                </div>

                <input
                  type="range"
                  min="30"
                  max={maxAllowedGrid}
                  step="5"
                  value={gridWidth}
                  onChange={(e) => setGridWidth(Number(e.target.value))}
                  className="w-full accent-[#E06C38] cursor-pointer"
                />

                <div className="flex justify-between text-[10px] text-[#7A8877] mt-1">
                  <span>Small (30st)</span>
                  <span>Medium (60st)</span>
                  <span>{planTier === 'free' ? 'Free Max (100st)' : (planTier === 'pro' ? 'Pro Max (300st)' : 'Studio Unlimited (400st)')}</span>
                </div>
              </div>

              {/* Fabric Count Selector */}
              <div>
                <label className="text-xs font-semibold text-[#1D231E] block mb-1.5 flex items-center gap-1">
                  <Ruler className="w-3.5 h-3.5 text-[#E06C38]" />
                  <span>Fabric Type & Count</span>
                </label>
                <select
                  value={fabricCount}
                  onChange={(e) => setFabricCount(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-[#FAF6EE] border border-[#E8E1D2] text-xs font-semibold text-[#1D231E] focus:outline-none focus:border-[#E06C38] cursor-pointer"
                >
                  {FABRIC_COUNTS.map((f) => (
                    <option key={f.count} value={f.count}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* DMC Color Limit */}
              <div>
                <div className="flex justify-between text-xs font-semibold text-[#1D231E] mb-1.5">
                  <span className="flex items-center gap-1">
                    <span>Thread Color Limit</span>
                    {planTier === 'free' && colorLimit >= 50 && (
                      <span className="text-[9px] bg-[#E06C38]/10 text-[#E06C38] px-1.5 py-0.5 rounded font-bold">Free Max (50)</span>
                    )}
                    {planTier === 'pro' && colorLimit >= 150 && (
                      <span className="text-[9px] bg-[#E06C38]/10 text-[#E06C38] px-1.5 py-0.5 rounded font-bold">Pro Max (150)</span>
                    )}
                    {planTier === 'studio' && (
                      <span className="text-[9px] bg-[#3D5239]/10 text-[#3D5239] px-1.5 py-0.5 rounded font-bold">Studio Unlimited</span>
                    )}
                  </span>
                  <span className="text-[#E06C38] font-mono font-bold">{colorLimit} threads</span>
                </div>
                <input
                  type="range"
                  min="8"
                  max={maxAllowedColors}
                  step="2"
                  value={colorLimit}
                  onChange={(e) => setColorLimit(Number(e.target.value))}
                  className="w-full accent-[#E06C38] cursor-pointer"
                />
                <span className="text-[10px] text-[#7A8877] block mt-1">
                  CIEDE2000 algorithm reduces photo down to exact {colorLimit} closest {brand} skein shades.
                  {planTier === 'free' && ' (Free plan capped at 50 colors)'}
                  {planTier === 'pro' && ' (Pro plan supports up to 150 colors)'}
                  {planTier === 'studio' && ' (Studio plan supports unlimited colors)'}
                </span>
              </div>

              {/* Dithering Algorithm Selector */}
              <div>
                <label className="text-xs font-semibold text-[#1D231E] block mb-1.5 flex items-center justify-between">
                  <span>Dithering Algorithm</span>
                  <span className="text-[10px] text-[#E06C38] font-mono uppercase">{dithering}</span>
                </label>
                <select
                  value={dithering}
                  onChange={(e) => setDithering(e.target.value as 'none' | 'soft' | 'floyd-steinberg' | 'atkinson')}
                  className="w-full px-3 py-2 rounded-xl bg-[#FAF6EE] border border-[#E8E1D2] text-xs font-semibold text-[#1D231E] focus:outline-none focus:border-[#E06C38] cursor-pointer"
                >
                  <option value="none">None (Clean Solid Color Blocks - Recommended)</option>
                  <option value="soft">Soft Blend (Gentle Gradient Transitions - No Dot Noise)</option>
                  <option value="floyd-steinberg">Floyd-Steinberg (Balanced Photo Diffusion)</option>
                  <option value="atkinson">Atkinson (Artistic Contrast Dithering)</option>
                </select>
                <span className="text-[10px] text-[#7A8877] block mt-1">
                  {dithering === 'none' && 'Direct CIEDE2000 color matching per stitch cell. Eliminates all noise speckles.'}
                  {dithering === 'soft' && 'Subtle damped error diffusion for smooth gradient transitions without harsh dots.'}
                  {dithering === 'floyd-steinberg' && 'Balanced Floyd-Steinberg error diffusion for photo-like blending.'}
                  {dithering === 'atkinson' && 'Macintosh Atkinson dithering for high-contrast artistic cross-stitch.'}
                </span>
              </div>

              {/* Thread Brand Selector (Pro & Studio Feature) */}
              <div className="pt-2 border-t border-[#F0EBE1] flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-[#1D231E] block">Thread Code System:</span>
                  <span className="text-[10px] text-[#7A8877]">Available in Pro & Studio Plans</span>
                </div>
                <div className="inline-flex rounded-lg bg-[#FAF6EE] p-1 border border-[#E8E1D2]">
                  <button
                    onClick={() => setBrand('DMC')}
                    className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                      brand === 'DMC' ? 'bg-[#1D231E] text-white shadow-xs' : 'text-[#5A6659]'
                    }`}
                  >
                    DMC
                  </button>
                  <button
                    onClick={() => {
                      if (planTier === 'free') {
                        alert('DMC & Anchor thread code selection is available on Pro & Studio Plans! Switch plan mode above to test.');
                        return;
                      }
                      setBrand('Anchor');
                    }}
                    className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      brand === 'Anchor' ? 'bg-[#3D5239] text-white shadow-xs' : 'text-[#5A6659]'
                    }`}
                  >
                    <span>Anchor</span>
                    {planTier === 'free' && <Lock className="w-2.5 h-2.5 text-[#E06C38]" />}
                  </button>
                </div>
              </div>

              {/* Grid Lines & Symbols Toggles */}
              <div className="space-y-2 pt-2 border-t border-[#F0EBE1]">
                <label className="flex items-center justify-between text-xs font-semibold text-[#1D231E] cursor-pointer">
                  <span>Show 10-Stitch Grid Lines</span>
                  <input
                    type="checkbox"
                    checked={showGridLines}
                    onChange={(e) => setShowGridLines(e.target.checked)}
                    className="w-4 h-4 rounded text-[#E06C38] focus:ring-[#E06C38] cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between text-xs font-semibold text-[#1D231E] cursor-pointer">
                  <span>Overlay Floss Symbols on Color Chart</span>
                  <input
                    type="checkbox"
                    checked={showSymbolsOnColor}
                    onChange={(e) => setShowSymbolsOnColor(e.target.checked)}
                    className="w-4 h-4 rounded text-[#E06C38] focus:ring-[#E06C38] cursor-pointer"
                  />
                </label>
              </div>

            </div>

            {/* Live Calculated Physical Specifications */}
            {pattern && (
              <div className="bg-[#93A28F]/15 p-4 rounded-2xl border border-[#93A28F]/30 space-y-2 text-xs text-[#2A3429]">
                <div className="flex justify-between items-center pb-2 border-b border-[#93A28F]/20">
                  <span className="font-bold flex items-center gap-1">
                    <Ruler className="w-3.5 h-3.5 text-[#E06C38]" />
                    <span>Physical Dimensions:</span>
                  </span>
                  <span className="font-bold font-mono">
                    {pattern.physicalWidthInches}" x {pattern.physicalHeightInches}" ({Math.round(pattern.physicalWidthInches * 2.54)} x {Math.round(pattern.physicalHeightInches * 2.54)} cm)
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span>Stitch Resolution:</span>
                  <span className="font-mono font-bold">{pattern.widthStitches} x {pattern.heightStitches} stitches</span>
                </div>

                <div className="flex justify-between items-center">
                  <span>Total Cross-Stitches:</span>
                  <span className="font-mono font-bold text-[#E06C38]">{pattern.totalStitches.toLocaleString()}</span>
                </div>
              </div>
            )}

          </div>

          {/* Pattern Preview Panel Right (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col space-y-4">
            
            {/* View Mode Tabs: Color Chart vs B&W Symbol Chart vs Interactive Tracker */}
            <div className="bg-white p-3 rounded-2xl border border-[#E8E1D2] shadow-xs flex items-center justify-between gap-2 overflow-x-auto">
              <div className="flex items-center gap-1 bg-[#FAF6EE] p-1 rounded-xl border border-[#E8E1D2]">
                <button
                  onClick={() => setViewMode('color')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    viewMode === 'color' ? 'bg-white text-[#1D231E] shadow-xs border border-[#E8E1D2]' : 'text-[#5A6659]'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5 text-[#E06C38]" />
                  <span>Color Pattern</span>
                </button>
                <button
                  onClick={() => setViewMode('symbol')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    viewMode === 'symbol' ? 'bg-white text-[#1D231E] shadow-xs border border-[#E8E1D2]' : 'text-[#5A6659]'
                  }`}
                >
                  <Download className="w-3.5 h-3.5 text-[#1D231E]" />
                  <span>Printable Symbol Chart (B&W)</span>
                </button>
              </div>

              {/* Quick Status */}
              {isProcessing && (
                <span className="text-xs text-[#E06C38] flex items-center gap-1 font-bold animate-pulse shrink-0 px-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Quantizing CIEDE2000...
                </span>
              )}
            </div>

            {/* Pattern Canvas Container */}
            <div className="bg-white p-5 rounded-2xl border border-[#E8E1D2] shadow-xs flex-1 flex flex-col justify-between">
              
              {/* Active View Title & Info */}
              <div className="flex items-center justify-between mb-3 text-xs">
                <span className="font-bold text-[#1D231E]">
                  {viewMode === 'color' && 'Full Color DMC Pattern Chart'}
                  {viewMode === 'symbol' && 'Black & White Symbol Chart (Print-Ready)'}
                </span>
              </div>

              {/* Canvas viewport */}
              <div className="relative flex-1 min-h-[320px] rounded-xl overflow-auto bg-[#FAF6EE] border border-[#E0D8C8] flex items-center justify-center p-4 group">
                {selectedPhotoUrl && pattern ? (
                  <canvas
                    ref={canvasRef}
                    className="max-w-full max-h-[420px] rounded shadow-md border border-[#1D231E]/20 transition-all"
                  />
                ) : isProcessing ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center text-[#505C4F]">
                    <RefreshCw className="w-8 h-8 text-[#E06C38] animate-spin mb-3" />
                    <span className="text-xs font-bold">Converting image to cross-stitch pattern...</span>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center justify-center p-8 text-center text-[#6B7869] cursor-pointer hover:text-[#1D231E] transition-colors"
                  >
                    <div className="w-14 h-14 rounded-full bg-[#E5EDE2] text-[#3D5239] flex items-center justify-center mb-3 shadow-xs group-hover:bg-[#E06C38] group-hover:text-white transition-colors">
                      <Upload className="w-6 h-6" />
                    </div>
                    <span className="text-sm font-bold text-[#1D231E] mb-1">No Image Uploaded Yet</span>
                    <span className="text-xs text-[#505C4F] max-w-xs mb-3">
                      Drag & drop or click here to choose an image file from your device to create a pattern.
                    </span>
                    <span className="px-4 py-2 rounded-xl bg-[#E06C38] text-white text-xs font-bold shadow-xs hover:bg-[#C95B28] transition-colors">
                      Select Photo to Start
                    </span>
                  </div>
                )}
              </div>

              {/* Required Floss Key & Skein Summary */}
              {pattern && (
                <div className="mt-4 pt-4 border-t border-[#E8E1D2]">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold text-[#1D231E] flex items-center gap-1.5">
                      <Calculator className="w-3.5 h-3.5 text-[#E06C38]" />
                      <span>Required Floss Palette & Skein Key ({pattern.flossList.length} threads)</span>
                    </h4>

                    {planTier === 'studio' && (
                      <span className="text-[10px] font-bold text-[#3D5239] bg-[#E8EFE5] px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Edit3 className="w-3 h-3 text-[#E06C38]" />
                        Studio DMC ⇄ Anchor Converter Active
                      </span>
                    )}
                  </div>

                  {/* Studio Feature: DMC ↔ Anchor Bidirectional Thread Converter Panel */}
                  {planTier === 'studio' && (
                    <div className="mb-3 p-3.5 bg-[#E8EFE5]/80 rounded-2xl border border-[#C5D3C2] space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Repeat className="w-4 h-4 text-[#E06C38]" />
                          <h4 className="text-xs font-bold text-[#1D231E]">
                            Studio DMC ⇄ Anchor Bidirectional Converter
                          </h4>
                        </div>
                        <div className="inline-flex rounded-lg bg-white p-0.5 border border-[#C5D3C2]">
                          <button
                            onClick={() => {
                              setConversionDirection('dmcToAnchor');
                              setLookupThreadCode('DMC 310');
                            }}
                            className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                              conversionDirection === 'dmcToAnchor' ? 'bg-[#3D5239] text-white shadow-xs' : 'text-[#5A6659]'
                            }`}
                          >
                            DMC ➔ Anchor
                          </button>
                          <button
                            onClick={() => {
                              setConversionDirection('anchorToDmc');
                              setLookupThreadCode('Anchor 403');
                            }}
                            className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                              conversionDirection === 'anchorToDmc' ? 'bg-[#3D5239] text-white shadow-xs' : 'text-[#5A6659]'
                            }`}
                          >
                            Anchor ➔ DMC
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                        {/* Source Thread Selector */}
                        <div className="sm:col-span-5">
                          <label className="text-[10px] font-bold text-[#5A6659] block mb-1">
                            Select {conversionDirection === 'dmcToAnchor' ? 'DMC Code' : 'Anchor Code'}:
                          </label>
                          <select
                            value={lookupThreadCode}
                            onChange={(e) => setLookupThreadCode(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-[#C5D3C2] text-xs font-bold text-[#1D231E] focus:outline-none focus:border-[#E06C38] cursor-pointer"
                          >
                            {DMC_DATABASE.map((d) => (
                              <option key={d.code} value={conversionDirection === 'dmcToAnchor' ? d.code : d.anchorCode}>
                                {conversionDirection === 'dmcToAnchor' ? `${d.code} • ${d.name}` : `${d.anchorCode} • ${d.name}`}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Arrow Divider */}
                        <div className="sm:col-span-2 flex justify-center text-[#E06C38] font-bold text-sm">
                          ➔
                        </div>

                        {/* Converted Output Card */}
                        <div className="sm:col-span-5 bg-white p-2 rounded-xl border border-[#C5D3C2] flex items-center gap-2">
                          <div
                            className="w-7 h-7 rounded-lg border border-black/20 shrink-0"
                            style={{ backgroundColor: lookupItem.hex }}
                          />
                          <div className="truncate">
                            <span className="text-[10px] text-[#7A8877] block font-semibold">
                              Equivalent {conversionDirection === 'dmcToAnchor' ? 'Anchor Thread' : 'DMC Thread'}
                            </span>
                            <span className="text-xs font-bold text-[#E06C38] block truncate">
                              {conversionDirection === 'dmcToAnchor' ? lookupItem.anchorCode : lookupItem.code} ({lookupItem.name})
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-[#3D5239] pt-1 border-t border-[#C5D3C2]/50">
                        <span>Pattern active brand: <strong>{brand}</strong></span>
                        <button
                          onClick={() => setBrand(prev => prev === 'DMC' ? 'Anchor' : 'DMC')}
                          className="px-3 py-1 rounded-full bg-[#3D5239] text-white font-bold hover:bg-[#2C3B29] transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <Repeat className="w-3 h-3 text-[#E06C38]" />
                          <span>Convert Entire Pattern to {brand === 'DMC' ? 'Anchor' : 'DMC'}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
                    {pattern.flossList.map((item) => (
                      <div
                        key={item.dmc.code}
                        className="flex items-center justify-between p-2 bg-[#FAF6EE] rounded-xl border border-[#E8E1D2] text-xs hover:border-[#E06C38]/40 transition-all gap-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {/* Color Swatch with Symbol */}
                          <div
                            className="w-6 h-6 rounded-md border border-black/20 flex items-center justify-center shrink-0 font-bold text-[10px]"
                            style={{
                              backgroundColor: item.dmc.hex,
                              color: parseInt(item.dmc.hex.replace('#',''), 16) > 0x888888 ? '#000' : '#FFF'
                            }}
                          >
                            {item.dmc.symbol}
                          </div>

                          <div className="truncate">
                            <span className="font-bold text-[#1D231E] block text-[11px] truncate">
                              {brand === 'Anchor' ? item.dmc.anchorCode : item.dmc.code} • {item.dmc.name}
                            </span>
                            <span className="text-[#6B7869] text-[10px] block">
                              {item.stitchCount} sts ({item.percentage}%)
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Skeins badge */}
                          <span className="text-[10px] font-bold text-[#E06C38] bg-[#E06C38]/10 px-2 py-0.5 rounded-md border border-[#E06C38]/20">
                            {item.skeinsNeeded} {item.skeinsNeeded === 1 ? 'skein' : 'skeins'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

            {/* Modal Bottom Actions & Download Button */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={handleClose}
                  className="px-5 py-2.5 rounded-full border border-[#D5CDC0] text-xs font-bold text-[#4A544A] hover:bg-white transition-colors cursor-pointer"
                >
                  Close Converter
                </button>
                {isAdminOrderMode ? (
                  <button
                    onClick={handleDownloadOriginalImage}
                    disabled={!selectedPhotoUrl && !originalPhotoUrl}
                    className="px-5 py-2.5 rounded-full border border-[#2D5A43]/40 bg-[#2D5A43]/10 text-xs font-bold text-[#2D5A43] hover:bg-[#2D5A43]/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5 cursor-pointer"
                    title="Download the raw photo submitted by the customer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Original Image</span>
                  </button>
                ) : (
                  <button
                    onClick={handleConvertAnotherImage}
                    className="px-5 py-2.5 rounded-full border border-[#E06C38]/40 bg-[#E06C38]/10 text-xs font-bold text-[#E06C38] hover:bg-[#E06C38]/20 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Convert Another Image</span>
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                {isAdminOrderMode ? (
                  <>
                    <button
                      onClick={() => handleDownloadChart('color')}
                      disabled={!pattern || isExportingPdf}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-full bg-white border border-[#D5CDC0] hover:bg-[#F5EFE4] disabled:opacity-40 disabled:cursor-not-allowed text-[#1D231E] text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
                    >
                      {isExportingPdf ? (
                        <RefreshCw className="w-4 h-4 animate-spin text-[#E06C38]" />
                      ) : (
                        <Download className="w-4 h-4 text-[#E06C38]" />
                      )}
                      <span>Download Pattern PDF</span>
                    </button>

                    <button
                      onClick={handleSaveToAdminOrder}
                      disabled={!pattern || isSavingToAdminOrder}
                      className={`w-full sm:w-auto px-6 py-2.5 rounded-full text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer ${
                        adminOrderSaveSuccess
                          ? 'bg-emerald-600 hover:bg-emerald-700'
                          : 'bg-[#2D5A43] hover:bg-[#234734] disabled:opacity-50 disabled:cursor-not-allowed'
                      }`}
                    >
                      {isSavingToAdminOrder ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin text-white" />
                          <span>Saving to Order #{adminOrder?.id}...</span>
                        </>
                      ) : adminOrderSaveSuccess ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-white" />
                          <span>Saved Directly to Order #{adminOrder?.id}!</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4 text-[#E06C38]" />
                          <span>Save Pattern to Order #{adminOrder?.id}</span>
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleOpenOrderKitModal}
                      disabled={!pattern}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-full bg-[#1D231E] hover:bg-[#323D34] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                    >
                      <Package className="w-4 h-4 text-[#E06C38]" />
                      <span>Order Kit & Supplies</span>
                    </button>

                    <button
                      onClick={() => handleDownloadChart('color')}
                      disabled={!pattern || isExportingPdf}
                      className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-[#E06C38] hover:bg-[#d05c28] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                    >
                      {isExportingPdf ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      <span>Download Complete Pattern PDF</span>
                    </button>
                  </>
                )}
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* Converter Order Kit & Supplies Modal */}
      {isOrderKitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
          <div className="bg-[#FAF6EE] rounded-3xl max-w-xl w-full shadow-2xl border border-[#E8E1D2] relative my-8 overflow-hidden">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 pb-4 border-b border-[#E8E1D2]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#E06C38]/10 text-[#E06C38] flex items-center justify-center">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#1D231E]">Order Kit & Supplies</h3>
                  <p className="text-xs text-[#5A6659]">
                    Custom fabric, sorted floss skeins, needles & printed chart delivered to you
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOrderKitModalOpen(false)}
                className="p-2 text-[#6B7869] hover:text-[#1D231E] rounded-full hover:bg-[#E8E1D2]/60 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {orderSuccess ? (
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
                      <span className="font-semibold text-[#1D231E]">Custom Kit (From Converter)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#6B7869]">Size & Fabric:</span>
                      <span className="font-semibold text-[#1D231E]">
                        {pattern ? `${pattern.physicalWidthInches}" × ${pattern.physicalHeightInches}" (${fabricCount}ct)` : 'Standard'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#6B7869]">Floss Palette:</span>
                      <span className="font-semibold text-[#1D231E]">
                        {pattern ? `${pattern.flossList.length} ${brand} Colors` : `${colorLimit} Colors`}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#6B7869]">Status:</span>
                      <span className="font-semibold text-[#E06C38] bg-[#E06C38]/10 px-2 py-0.5 rounded">
                        Pending Quote
                      </span>
                    </div>
                  </div>

                  <div className="pt-4 flex items-center justify-center gap-3">
                    <button
                      onClick={() => setIsOrderKitModalOpen(false)}
                      className="px-6 py-2.5 bg-[#1D231E] hover:bg-[#323D34] text-white text-xs font-bold rounded-full transition-all shadow-sm cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleOrderKitSubmit} className="space-y-4">
                  {orderError && (
                    <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-rose-800 text-xs">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{orderError}</span>
                    </div>
                  )}

                  {/* Pattern Specifications Summary (Read-Only) */}
                  <div className="p-4 bg-white border border-[#E8E1D2] rounded-2xl flex items-center gap-4">
                    {selectedPhotoUrl && (
                      <img
                        src={selectedPhotoUrl}
                        alt="Pattern Preview"
                        className="w-16 h-16 rounded-xl object-cover border border-[#E8E1D2] shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#E06C38] bg-[#E06C38]/10 px-2 py-0.5 rounded-md">
                          Configured in Converter
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-[#1D231E] truncate mt-1">
                        {customPhotoName || 'Custom Pattern Kit'}
                      </h4>
                      <p className="text-xs text-[#5A6659] mt-0.5">
                        {pattern ? (
                          <>
                            {pattern.physicalWidthInches}" × {pattern.physicalHeightInches}" • {pattern.flossList.length} {brand} Colors • {pattern.totalStitches.toLocaleString()} sts ({fabricCount}ct)
                          </>
                        ) : (
                          `${gridWidth} stitches • ${colorLimit} colors • ${fabricCount}ct Aida`
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Delivery Address */}
                  <div>
                    <label className="block text-xs font-bold text-[#1D231E] mb-1">
                      Delivery Address <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={orderDeliveryAddress}
                      onChange={(e) => setOrderDeliveryAddress(e.target.value)}
                      placeholder="Street address, Apt/Suite, City, State / Province, Postal Code, Country"
                      className="w-full px-3.5 py-2.5 bg-white border border-[#D5CDC0] rounded-xl text-xs text-[#1D231E] placeholder:text-[#8A9588] focus:outline-none focus:border-[#E06C38]"
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
                      value={orderPhone}
                      onChange={(e) => setOrderPhone(e.target.value)}
                      placeholder="+1 (555) 000-0000 (for courier tracking & delivery updates)"
                      className="w-full px-3.5 py-2.5 bg-white border border-[#D5CDC0] rounded-xl text-xs text-[#1D231E] placeholder:text-[#8A9588] focus:outline-none focus:border-[#E06C38]"
                    />
                  </div>

                  {/* Customer Notes */}
                  <div>
                    <label className="block text-xs font-bold text-[#1D231E] mb-1">
                      Customer Notes / Special Requests (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={orderNotes}
                      onChange={(e) => setOrderNotes(e.target.value)}
                      placeholder="Fabric color preference (White, Oatmeal, Black), hoop preferences, gift notes, or target deadline..."
                      className="w-full px-3.5 py-2 bg-white border border-[#D5CDC0] rounded-xl text-xs text-[#1D231E] placeholder:text-[#8A9588] focus:outline-none focus:border-[#E06C38]"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSubmittingOrder}
                      className="w-full py-3.5 px-6 rounded-2xl bg-[#E06C38] hover:bg-[#d05c28] disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                    >
                      {isSubmittingOrder ? (
                        <span>Submitting Request...</span>
                      ) : (
                        <>
                          <Package className="w-4 h-4" />
                          <span>Submit Kit Order Request</span>
                        </>
                      )}
                    </button>
                    <p className="text-[11px] text-[#6B7869] text-center mt-2">
                      No payment required now. Our team will prepare your custom quote with exact shipping.
                    </p>
                  </div>
                </form>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Converter First Upload Guest Login Choice Modal */}
      {showGuestPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-[#FAF6EE] border border-[#E8E1D2] rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative text-center">
            <button
              onClick={() => {
                try {
                  localStorage.setItem('converterGuestChoice', 'guest');
                } catch {}
                setShowGuestPrompt(false);
              }}
              className="absolute top-4 right-4 p-2 text-[#6B7869] hover:text-[#1D231E] rounded-full hover:bg-[#E8E1D2]/50 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-[#E06C38]/10 text-[#E06C38] flex items-center justify-center mx-auto mb-3">
              <Sparkles className="w-6 h-6" />
            </div>

            <h3 className="text-xl font-bold text-[#1D231E] mb-2">
              Welcome to Stitchly Pattern Studio
            </h3>
            <p className="text-xs text-[#5A6659] mb-6 leading-relaxed">
              Log in or sign up to save your pattern conversions to your account and access them from any device, or continue as a guest.
            </p>

            <div className="space-y-2.5">
              <button
                onClick={() => {
                  try {
                    localStorage.setItem('converterGuestChoice', 'login');
                  } catch {}
                  setShowGuestPrompt(false);
                  setAuthModalConfig({
                    isOpen: true,
                    defaultTab: 'login',
                    customTitle: 'Log In to Stitchly',
                    customSubtitle: 'Access your saved cross-stitch patterns across devices.'
                  });
                }}
                className="w-full py-3 bg-[#E06C38] hover:bg-[#d05c28] text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer"
              >
                Log in
              </button>

              <button
                onClick={() => {
                  try {
                    localStorage.setItem('converterGuestChoice', 'signup');
                  } catch {}
                  setShowGuestPrompt(false);
                  setAuthModalConfig({
                    isOpen: true,
                    defaultTab: 'signup',
                    customTitle: 'Create a Free Account',
                    customSubtitle: 'Save your custom patterns to your personal account.'
                  });
                }}
                className="w-full py-3 bg-white hover:bg-[#FAF6EE] border border-[#D5CDBC] text-[#1D231E] text-xs font-bold rounded-xl transition-all shadow-2xs cursor-pointer"
              >
                Sign up
              </button>

              <button
                onClick={() => {
                  try {
                    localStorage.setItem('converterGuestChoice', 'guest');
                  } catch {}
                  setShowGuestPrompt(false);
                }}
                className="w-full py-2.5 text-xs font-semibold text-[#6B7869] hover:text-[#1D231E] transition-colors cursor-pointer"
              >
                Continue as guest
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Studio Image Editor Modal */}
      {isImageEditorOpen && (
        <StudioImageEditorModal
          isOpen={isImageEditorOpen}
          onClose={() => setIsImageEditorOpen(false)}
          imageUrl={selectedPhotoUrl}
          originalImageUrl={originalPhotoUrl || selectedPhotoUrl}
          onApplyEdits={(editedDataUrl) => {
            setSelectedPhotoUrl(editedDataUrl);
          }}
        />
      )}

      {/* Auth Modal Triggered from Converter / Order Flow */}
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
