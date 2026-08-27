import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  X, 
  CheckCircle2, 
  RotateCcw, 
  ZoomIn, 
  ZoomOut, 
  Maximize2,
  Sparkles, 
  Eye, 
  Download, 
  Check, 
  Layers, 
  Loader2,
  ListFilter,
  Save,
  Clock,
  Scissors,
  ShieldAlert,
  ShieldCheck,
  Info
} from 'lucide-react';
import { 
  SupabaseConversionJobRow, 
  SupabaseStitchOrderRow, 
  getJobPatternConfig, 
  saveOrderStitchProgress 
} from '../../lib/supabase';
import { 
  generatePatternFromImage, 
  renderPatternViewportCanvas, 
  GeneratedPattern, 
  PatternConfig,
  getDefaultOrderPatternConfig 
} from '../../utils/patternEngine';
import { exportPatternToPDF, downloadFileFromUrl } from '../../utils/pdfExporter';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import dogImg from '../../assets/images/hoop_dog.png';

export interface StitchTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
  job?: SupabaseConversionJobRow | null;
  order?: SupabaseStitchOrderRow | null;
  mode?: 'user-editable' | 'admin-editable' | 'view-only';
  onProgressSaved?: (progressPercent: number, cells: string[], info?: { autoAdvancedToQualityCheck?: boolean; newStatus?: string }) => void;
  onOpenConverter?: (order: SupabaseStitchOrderRow) => void;
}

export const StitchTrackerModal: React.FC<StitchTrackerModalProps> = ({
  isOpen,
  onClose,
  job,
  order,
  mode = 'user-editable',
  onProgressSaved,
  onOpenConverter,
}) => {
  const isOrderMode = Boolean(order);
  const isViewOnly = mode === 'view-only';
  const isAdminEditable = mode === 'admin-editable';

  // Lock body scroll when tracker modal is open
  useBodyScrollLock(isOpen);

  const [pattern, setPattern] = useState<GeneratedPattern | null>(null);
  const [loadingPattern, setLoadingPattern] = useState<boolean>(true);
  const [missingPatternConfig, setMissingPatternConfig] = useState<boolean>(false);
  const [completedStitches, setCompletedStitches] = useState<Set<number>>(new Set());
  const [viewMode, setViewMode] = useState<'tracker' | 'color' | 'symbol'>('tracker');
  const [zoomMultiplier, setZoomMultiplier] = useState<number>(1);
  const [filterDmcCode, setFilterDmcCode] = useState<string | null>(null);
  const [scrollOffset, setScrollOffset] = useState<{ left: number; top: number }>({ left: 0, top: 0 });
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'pending' | 'idle'>('saved');
  const [autoAdvancedNotice, setAutoAdvancedNotice] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const patternWrapperRef = useRef<HTMLDivElement | null>(null);
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({ width: 600, height: 420 });
  const prevZoomRef = useRef<number>(1);

  // Debounced auto-save timer ref for admin mode
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const latestStitchesRef = useRef<Set<number>>(completedStitches);
  latestStitchesRef.current = completedStitches;

  // Drag Panning State & Refs
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const isDraggingRef = useRef<boolean>(false);
  const dragStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragStartScrollRef = useRef<{ left: number; top: number }>({ left: 0, top: 0 });
  const totalDragDistanceRef = useRef<number>(0);

  // Measure canvas viewport container dimensions dynamically
  useEffect(() => {
    if (!isOpen) return;
    const updateSize = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        if (clientWidth > 0 && clientHeight > 0) {
          setContainerSize({ width: clientWidth, height: clientHeight });
        }
      }
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    if (containerRef.current) {
      ro.observe(containerRef.current);
    }
    return () => ro.disconnect();
  }, [isOpen]);

  // Reset zoom to 1 (Fit to screen) on new pattern, job, or order
  useEffect(() => {
    setZoomMultiplier(1);
    setScrollOffset({ left: 0, top: 0 });
    prevZoomRef.current = 1;
  }, [job?.id, order?.id]);

  // Maintain scroll center when zooming in/out
  useEffect(() => {
    if (containerRef.current && prevZoomRef.current !== zoomMultiplier) {
      const container = containerRef.current;
      const ratio = zoomMultiplier / prevZoomRef.current;
      if (container.scrollWidth > container.clientWidth || container.scrollHeight > container.clientHeight) {
        const currentCenterX = container.scrollLeft + container.clientWidth / 2;
        const currentCenterY = container.scrollTop + container.clientHeight / 2;
        container.scrollLeft = Math.max(0, currentCenterX * ratio - container.clientWidth / 2);
        container.scrollTop = Math.max(0, currentCenterY * ratio - container.clientHeight / 2);
      }
      prevZoomRef.current = zoomMultiplier;
    }
  }, [zoomMultiplier]);

  // Storage key for user-editable conversion job
  const storageKey = job ? `stitch_tracker_job_${job.id}` : '';

  // Helpers to serialize / deserialize "row-col" strings
  const serializeCells = useCallback((stitchesSet: Set<number>, width: number): string[] => {
    const arr: string[] = [];
    stitchesSet.forEach((idx) => {
      const r = Math.floor(idx / width);
      const c = idx % width;
      arr.push(`${r}-${c}`);
    });
    return arr;
  }, []);

  const deserializeCells = useCallback((rawCells: any, width: number): Set<number> => {
    const s = new Set<number>();
    if (!Array.isArray(rawCells)) return s;
    for (const item of rawCells) {
      if (typeof item === 'string' && item.includes('-')) {
        const parts = item.split('-');
        const r = parseInt(parts[0], 10);
        const c = parseInt(parts[1], 10);
        if (!isNaN(r) && !isNaN(c)) {
          s.add(r * width + c);
        }
      } else if (typeof item === 'number' || (typeof item === 'string' && !isNaN(Number(item)))) {
        s.add(Number(item));
      }
    }
    return s;
  }, []);

  // Save progress for personal job (localStorage) or order (Supabase debounced)
  const flushOrderSave = useCallback(async (currentSet: Set<number>, currentPattern: GeneratedPattern | null) => {
    if (!order || !currentPattern) return;
    const width = currentPattern.widthStitches;
    const total = currentPattern.totalStitches;
    const cells = serializeCells(currentSet, width);
    const progressPercent = Math.min(100, Math.max(0, Math.round((currentSet.size / Math.max(1, total)) * 100)));

    setSaveStatus('saving');
    try {
      const res = await saveOrderStitchProgress(order.id, cells, progressPercent);
      if (res.success) {
        setSaveStatus('saved');
        if (res.autoAdvancedToQualityCheck) {
          setAutoAdvancedNotice(true);
          // Update in-memory order object so subsequent actions know it reached quality_check
          order.fulfillment_status = 'quality_check';
          order.status = 'quality_check';
          if (order.request_details) {
            order.request_details.fulfillment_status = 'quality_check';
          }
        }
        onProgressSaved?.(progressPercent, cells, {
          autoAdvancedToQualityCheck: res.autoAdvancedToQualityCheck,
          newStatus: res.newStatus
        });
      } else {
        setSaveStatus('idle');
      }
    } catch (e) {
      console.error('[StitchTrackerModal] Error saving order progress:', e);
      setSaveStatus('idle');
    }
  }, [order, serializeCells, onProgressSaved]);

  const scheduleOrderSave = useCallback((newSet: Set<number>) => {
    if (!isAdminEditable || !order) return;
    setSaveStatus('pending');

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      if (pattern) {
        flushOrderSave(newSet, pattern);
      }
    }, 1200);
  }, [isAdminEditable, order, pattern, flushOrderSave]);

  const saveProgress = useCallback((newSet: Set<number>) => {
    if (isViewOnly) return;

    if (isAdminEditable && order) {
      scheduleOrderSave(newSet);
    } else if (storageKey) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(Array.from(newSet)));
      } catch (e) {
        console.error('Failed to save stitch tracker progress to localStorage:', e);
      }
    }
  }, [isViewOnly, isAdminEditable, order, scheduleOrderSave, storageKey]);

  // Load progress when opening or switching order/job
  useEffect(() => {
    if (!isOpen) return;

    if (order) {
      const rawCells = order.stitch_progress_cells || order.request_details?.stitch_progress_cells || [];
      const width = pattern?.widthStitches || (order.pattern_config?.gridWidth || order.request_details?.grid_width || 60);
      const parsedSet = deserializeCells(rawCells, width);
      setCompletedStitches(parsedSet);
      setSaveStatus('saved');
    } else if (storageKey) {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setCompletedStitches(new Set(parsed));
          }
        }
      } catch (e) {
        console.error('Failed to load stitch tracker progress:', e);
      }
    }
  }, [isOpen, order, storageKey, pattern?.widthStitches, deserializeCells]);

  // Clean up and flush pending save on unmount or close
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        if (isAdminEditable && order && pattern) {
          flushOrderSave(latestStitchesRef.current, pattern);
        }
      }
    };
  }, [isAdminEditable, order, pattern, flushOrderSave]);

  // Load or generate pattern data
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoadingPattern(true);
    setMissingPatternConfig(false);

    const initPattern = async () => {
      try {
        let sourcePhotoUrl = '';
        let config: PatternConfig;

        if (order) {
          const orderConfig = order.pattern_config || order.request_details?.pattern_config;
          if (!orderConfig) {
            // Strict constraint: Do NOT auto-generate a rough pattern as a silent fallback
            if (isMounted) {
              setPattern(null);
              setMissingPatternConfig(true);
              setLoadingPattern(false);
            }
            return;
          }

          const details = order.request_details || {};
          sourcePhotoUrl = details.photo_url || details.pattern_result_url || order.image_url || order.pattern_preview_url || '';

          if (!sourcePhotoUrl) {
            if (isMounted) {
              setPattern(null);
              setMissingPatternConfig(true);
              setLoadingPattern(false);
            }
            return;
          }

          config = {
            gridWidth: Number(orderConfig.gridWidth) || 60,
            colorLimit: Number(orderConfig.colorLimit) || 18,
            fabricCount: Number(orderConfig.fabricCount) || 14,
            showGridLines: orderConfig.showGridLines ?? true,
            showSymbols: orderConfig.showSymbols ?? true,
            brand: orderConfig.brand || 'DMC',
            dithering: orderConfig.dithering || 'floyd-steinberg',
            brightness: Number(orderConfig.brightness) || 0,
            contrast: Number(orderConfig.contrast) || 0,
            saturation: Number(orderConfig.saturation) || 0,
            isAdFree: true,
            planTier: 'studio',
          };
        } else if (job) {
          sourcePhotoUrl = job.original_image_url || job.photo_url || job.thumbnail_url || '';
          if (!sourcePhotoUrl || sourcePhotoUrl.length < 5 || sourcePhotoUrl.startsWith('blob:')) {
            try {
              const cachedPhoto = localStorage.getItem(`user_pattern_photo_${job.title}`);
              const cachedImgUser = localStorage.getItem(`user_pattern_img_${job.user_id}_${job.title}`);
              const cachedImgTitle = localStorage.getItem(`user_pattern_img_${job.title}`);
              const cachedThumb = localStorage.getItem(`user_pattern_thumb_${job.title}`);
              sourcePhotoUrl = cachedPhoto || cachedImgUser || cachedImgTitle || cachedThumb || sourcePhotoUrl || '';
            } catch {}
          }
          config = getJobPatternConfig(job);
        } else {
          sourcePhotoUrl = dogImg;
          config = {
            gridWidth: 60,
            colorLimit: 18,
            fabricCount: 14,
            showGridLines: true,
            showSymbols: true,
            brand: 'DMC',
            dithering: 'floyd-steinberg',
            brightness: 0,
            contrast: 0,
            saturation: 0,
            isAdFree: true,
            planTier: 'studio',
          };
        }

        if (!sourcePhotoUrl || sourcePhotoUrl.startsWith('blob:')) {
          if (order) {
            if (isMounted) {
              setPattern(null);
              setMissingPatternConfig(true);
              setLoadingPattern(false);
            }
            return;
          }
          sourcePhotoUrl = dogImg;
        }

        try {
          const result = await generatePatternFromImage(sourcePhotoUrl, config);
          if (isMounted) {
            setPattern(result);
            setMissingPatternConfig(false);
            if (order) {
              const rawCells = order.stitch_progress_cells || order.request_details?.stitch_progress_cells || [];
              setCompletedStitches(deserializeCells(rawCells, result.widthStitches));
            }
          }
        } catch (firstErr) {
          if (order) {
            console.error('Failed to generate pattern for order from configured source image:', firstErr);
            if (isMounted) {
              setPattern(null);
              setMissingPatternConfig(true);
            }
            return;
          }
          console.warn('First attempt image pattern generation failed, falling back to sample image:', firstErr);
          const fallbackResult = await generatePatternFromImage(dogImg, config);
          if (isMounted) {
            setPattern(fallbackResult);
          }
        }
      } catch (err) {
        console.error('Error rendering pattern for tracker:', err);
        if (isMounted) {
          setPattern(null);
          setMissingPatternConfig(true);
        }
      } finally {
        if (isMounted) {
          setLoadingPattern(false);
        }
      }
    };

    initPattern();

    return () => {
      isMounted = false;
    };
  }, [isOpen, job, order, deserializeCells]);

  // Aspect-ratio preserving fit dimensions based on measured container size
  const padding = 28;
  const availWidth = Math.max(120, containerSize.width - padding);
  const availHeight = Math.max(120, containerSize.height - padding);

  const patternWidth = pattern?.widthStitches || (order ? (order.pattern_config?.gridWidth || 60) : (job?.grid_width || 60));
  const patternHeight = pattern?.heightStitches || (order ? (order.pattern_config?.gridHeight || 60) : (job?.grid_height || 60));
  const patternAspectRatio = patternWidth / Math.max(1, patternHeight);

  let baseFitWidth = availWidth;
  let baseFitHeight = baseFitWidth / patternAspectRatio;

  if (baseFitHeight > availHeight) {
    baseFitHeight = availHeight;
    baseFitWidth = baseFitHeight * patternAspectRatio;
  }

  const displayWidth = Math.max(40, Math.round(baseFitWidth * zoomMultiplier));
  const displayHeight = Math.max(40, Math.round(baseFitHeight * zoomMultiplier));

  // Compute viewport bounds and overscan for virtualized canvas rendering
  const overscan = 64;
  const isFitMode = zoomMultiplier === 1 && displayWidth <= containerSize.width && displayHeight <= containerSize.height;
  const isZoomedIn = !isFitMode;

  let canvasX = 0;
  let canvasY = 0;
  let canvasW = displayWidth;
  let canvasH = displayHeight;

  if (!isFitMode) {
    canvasX = Math.max(0, scrollOffset.left - overscan);
    canvasY = Math.max(0, scrollOffset.top - overscan);
    canvasW = Math.min(displayWidth - canvasX, containerSize.width + overscan * 2);
    canvasH = Math.min(displayHeight - canvasY, containerSize.height + overscan * 2);
  }

  // Viewport scroll listener for smooth virtualized rendering
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollLeft, scrollTop } = e.currentTarget;
    setScrollOffset({ left: scrollLeft, top: scrollTop });
  };

  // Render pattern on canvas reliably with high-resolution DPI scaling
  const drawCanvas = useCallback(() => {
    if (canvasRef.current && pattern) {
      const config = order ? getDefaultOrderPatternConfig(order) : (job ? getJobPatternConfig(job) : getDefaultOrderPatternConfig({}));

      renderPatternViewportCanvas(
        canvasRef.current,
        pattern,
        {
          mode: viewMode,
          config,
          completedStitchesSet: completedStitches,
          filterDmcCode,
          displayWidth,
          displayHeight,
          canvasX,
          canvasY,
          canvasW,
          canvasH,
        }
      );
    }
  }, [
    pattern, 
    viewMode, 
    completedStitches, 
    filterDmcCode, 
    job, 
    order,
    displayWidth, 
    displayHeight, 
    canvasX, 
    canvasY, 
    canvasW, 
    canvasH
  ]);

  // Callback ref guarantees canvas rendering as soon as element mounts
  const setCanvasRef = useCallback((node: HTMLCanvasElement | null) => {
    canvasRef.current = node;
    if (node && pattern) {
      drawCanvas();
    }
  }, [pattern, drawCanvas]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // Toggle stitch completed status given client coordinate on pattern
  const toggleStitchAtPoint = useCallback((clientX: number, clientY: number, patternRect: DOMRect) => {
    // If view-only, clicking does nothing
    if (isViewOnly) return;
    if (viewMode !== 'tracker' || !pattern) return;

    const clickX = clientX - patternRect.left;
    const clickY = clientY - patternRect.top;

    const cellW = patternRect.width / pattern.widthStitches;
    const cellH = patternRect.height / pattern.heightStitches;

    const gridX = Math.floor(clickX / cellW);
    const gridY = Math.floor(clickY / cellH);

    if (gridX >= 0 && gridX < pattern.widthStitches && gridY >= 0 && gridY < pattern.heightStitches) {
      const index = gridY * pattern.widthStitches + gridX;

      const newSet = new Set(completedStitches);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      setCompletedStitches(newSet);
      saveProgress(newSet);
    }
  }, [isViewOnly, completedStitches, pattern, viewMode, saveProgress]);

  // Drag Panning Handlers (Enabled when zoomed in past fit-to-screen)
  const startDrag = (clientX: number, clientY: number) => {
    if (!isZoomedIn) return;
    isDraggingRef.current = true;
    setIsDragging(true);
    dragStartPosRef.current = { x: clientX, y: clientY };
    totalDragDistanceRef.current = 0;
    if (containerRef.current) {
      dragStartScrollRef.current = {
        left: containerRef.current.scrollLeft,
        top: containerRef.current.scrollTop
      };
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if (isZoomedIn) {
      startDrag(e.clientX, e.clientY);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isZoomedIn) {
      const touch = e.touches[0];
      startDrag(touch.clientX, touch.clientY);
    }
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !containerRef.current) return;
      const deltaX = e.clientX - dragStartPosRef.current.x;
      const deltaY = e.clientY - dragStartPosRef.current.y;
      totalDragDistanceRef.current = Math.hypot(deltaX, deltaY);

      const targetLeft = dragStartScrollRef.current.left - deltaX;
      const targetTop = dragStartScrollRef.current.top - deltaY;

      const maxScrollLeft = Math.max(0, containerRef.current.scrollWidth - containerRef.current.clientWidth);
      const maxScrollTop = Math.max(0, containerRef.current.scrollHeight - containerRef.current.clientHeight);

      containerRef.current.scrollLeft = Math.max(0, Math.min(maxScrollLeft, targetLeft));
      containerRef.current.scrollTop = Math.max(0, Math.min(maxScrollTop, targetTop));
    };

    const onMouseUp = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const distance = totalDragDistanceRef.current;
      isDraggingRef.current = false;
      setIsDragging(false);

      if (distance < 5 && patternWrapperRef.current && !isViewOnly) {
        const rect = patternWrapperRef.current.getBoundingClientRect();
        toggleStitchAtPoint(e.clientX, e.clientY, rect);
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isDraggingRef.current || !containerRef.current || e.touches.length !== 1) return;
      const touch = e.touches[0];
      const deltaX = touch.clientX - dragStartPosRef.current.x;
      const deltaY = touch.clientY - dragStartPosRef.current.y;
      totalDragDistanceRef.current = Math.hypot(deltaX, deltaY);

      const targetLeft = dragStartScrollRef.current.left - deltaX;
      const targetTop = dragStartScrollRef.current.top - deltaY;

      const maxScrollLeft = Math.max(0, containerRef.current.scrollWidth - containerRef.current.clientWidth);
      const maxScrollTop = Math.max(0, containerRef.current.scrollHeight - containerRef.current.clientHeight);

      containerRef.current.scrollLeft = Math.max(0, Math.min(maxScrollLeft, targetLeft));
      containerRef.current.scrollTop = Math.max(0, Math.min(maxScrollTop, targetTop));

      if (e.cancelable && totalDragDistanceRef.current > 3) {
        e.preventDefault();
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!isDraggingRef.current) return;
      const distance = totalDragDistanceRef.current;
      isDraggingRef.current = false;
      setIsDragging(false);

      if (distance < 5 && patternWrapperRef.current && !isViewOnly) {
        const touch = e.changedTouches[0];
        if (touch) {
          const rect = patternWrapperRef.current.getBoundingClientRect();
          toggleStitchAtPoint(touch.clientX, touch.clientY, rect);
        }
      }
    };

    window.addEventListener('mousemove', onMouseMove, { passive: false });
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    window.addEventListener('touchcancel', onTouchEnd);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [isZoomedIn, isViewOnly, toggleStitchAtPoint]);

  // Zoom control steps (up to 1200% / 12x zoom)
  const handleZoomIn = () => {
    setZoomMultiplier(prev => {
      if (prev < 1) return Number((prev + 0.25).toFixed(2));
      if (prev < 2) return Number((prev + 0.5).toFixed(2));
      if (prev < 4) return Number((prev + 1.0).toFixed(2));
      return Math.min(12.0, Number((prev + 2.0).toFixed(2)));
    });
  };

  const handleZoomOut = () => {
    setZoomMultiplier(prev => {
      if (prev <= 1) return Math.max(0.5, Number((prev - 0.25).toFixed(2)));
      if (prev <= 2) return Number((prev - 0.5).toFixed(2));
      if (prev <= 4) return Number((prev - 1.0).toFixed(2));
      return Math.max(0.5, Number((prev - 2.0).toFixed(2)));
    });
  };

  // Quick Action: Mark all stitches of a specific DMC thread as complete
  const handleToggleColorComplete = (dmcCode: string) => {
    if (isViewOnly || !pattern) return;

    const colorIndices: number[] = [];
    pattern.pixelDmcMap.forEach((dmc, idx) => {
      if (dmc.code === dmcCode) {
        colorIndices.push(idx);
      }
    });

    const allColorDone = colorIndices.every(idx => completedStitches.has(idx));
    const newSet = new Set(completedStitches);

    if (allColorDone) {
      colorIndices.forEach(idx => newSet.delete(idx));
    } else {
      colorIndices.forEach(idx => newSet.add(idx));
    }

    setCompletedStitches(newSet);
    saveProgress(newSet);
  };

  // Quick Action: Mark all stitches complete
  const handleMarkAllComplete = () => {
    if (isViewOnly || !pattern) return;
    const allSet = new Set<number>();
    for (let i = 0; i < pattern.totalStitches; i++) {
      allSet.add(i);
    }
    setCompletedStitches(allSet);
    saveProgress(allSet);
  };

  // Quick Action: Reset progress
  const handleResetProgress = () => {
    if (isViewOnly) return;
    if (confirm('Are you sure you want to reset all completed stitches for this pattern?')) {
      const empty = new Set<number>();
      setCompletedStitches(empty);
      saveProgress(empty);
    }
  };

  const handleManualSaveNow = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (pattern && order) {
      flushOrderSave(completedStitches, pattern);
    }
  };

  const handleCloseModal = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
      if (isAdminEditable && order && pattern) {
        flushOrderSave(completedStitches, pattern);
      }
    }
    onClose();
  };

  if (!isOpen) return null;

  const totalStitches = pattern ? pattern.totalStitches : (patternWidth * patternHeight);
  const completedCount = completedStitches.size;
  const progressPercentage = Math.min(100, Math.round((completedCount / Math.max(1, totalStitches)) * 100));

  const cardTitle = order
    ? (order.title || order.request_details?.title || `Order #${order.id}`)
    : (job?.title || job?.title_name || job?.filename || `Pattern #${job?.id || 'New'}`);

  const canvasCursorClass = isZoomedIn
    ? (isDragging ? 'cursor-grabbing' : 'cursor-grab')
    : (viewMode === 'tracker' && !isViewOnly ? 'cursor-pointer' : 'cursor-default');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/65 backdrop-blur-md animate-fade-in">
      <div className="bg-[#FAF6EE] rounded-3xl max-w-5xl w-full max-h-[92vh] shadow-2xl border border-[#E8E1D2] flex flex-col overflow-hidden">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#E8E1D2] bg-white/90 shrink-0 sticky top-0 z-20 backdrop-blur-md flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-xs shrink-0 ${
              isAdminEditable ? 'bg-[#2D5A43] text-white' : isViewOnly ? 'bg-[#556653] text-white' : 'bg-[#3D5239] text-white'
            }`}>
              {isAdminEditable ? (
                <Scissors className="w-5 h-5 text-[#E06C38]" />
              ) : isViewOnly ? (
                <Eye className="w-5 h-5 text-[#E06C38]" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-[#E06C38]" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                {isAdminEditable ? (
                  <span className="text-[10px] font-bold text-[#2D5A43] uppercase tracking-wider bg-[#2D5A43]/10 px-2 py-0.5 rounded-md border border-[#2D5A43]/20 flex items-center gap-1">
                    <Scissors className="w-3 h-3 text-[#E06C38]" /> Admin Production Tracker
                  </span>
                ) : isViewOnly ? (
                  <span className="text-[10px] font-bold text-[#556653] uppercase tracking-wider bg-[#556653]/10 px-2 py-0.5 rounded-md border border-[#556653]/20 flex items-center gap-1">
                    <Eye className="w-3 h-3 text-[#E06C38]" /> Live Workshop View
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-[#E06C38] uppercase tracking-wider bg-[#E06C38]/10 px-2 py-0.5 rounded-md border border-[#E06C38]/20">
                    Personal Stitch Tracker
                  </span>
                )}

                {order && order.customer_name && (
                  <span className="text-xs font-semibold text-[#556653] truncate hidden sm:inline">
                    for {order.customer_name}
                  </span>
                )}

                <span className="text-xs font-semibold text-[#6B7869]">
                  {patternWidth}×{patternHeight} sts
                </span>
              </div>

              <h3 className="text-lg font-bold text-[#1D231E] leading-tight truncate max-w-md">
                {cardTitle}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isAdminEditable && (
              <div className="hidden sm:flex items-center mr-2">
                {saveStatus === 'saving' ? (
                  <span className="text-xs text-[#E06C38] flex items-center gap-1 font-bold">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                  </span>
                ) : saveStatus === 'pending' ? (
                  <button 
                    onClick={handleManualSaveNow}
                    className="text-xs text-[#E06C38] hover:text-[#c05322] bg-[#E06C38]/10 hover:bg-[#E06C38]/20 px-2.5 py-1 rounded-lg border border-[#E06C38]/30 flex items-center gap-1 font-bold cursor-pointer"
                    title="Click to save changes to database immediately"
                  >
                    <Save className="w-3.5 h-3.5" /> Save Now
                  </button>
                ) : (
                  <span className="text-xs text-[#2D5A43] flex items-center gap-1 font-bold">
                    <Check className="w-3.5 h-3.5" /> Synced
                  </span>
                )}
              </div>
            )}

            <button
              onClick={async () => {
                if (job?.pattern_pdf_url) {
                  await downloadFileFromUrl(job.pattern_pdf_url, cardTitle);
                  return;
                }
                if (!pattern) return;
                try {
                  const config = order ? getDefaultOrderPatternConfig(order) : (job ? getJobPatternConfig(job) : getDefaultOrderPatternConfig({}));
                  await exportPatternToPDF(pattern, viewMode === 'symbol' ? 'symbol' : 'color', config, cardTitle);
                } catch (e) {
                  console.error(e);
                  alert('Unable to export PDF pattern.');
                }
              }}
              className="px-3 py-2 bg-[#E06C38] hover:bg-[#d05c28] text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
              title="Download PDF pattern chart"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download PDF</span>
            </button>

            <button
              onClick={handleCloseModal}
              className="p-2 rounded-xl text-[#6B7869] hover:text-[#1D231E] hover:bg-[#FAF6EE] transition-colors cursor-pointer border border-[#E8E1D2]"
              title="Close pattern viewer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Progress Summary Bar */}
        <div className={`px-6 py-3 border-b shrink-0 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-bold text-[#1D231E] ${
          isAdminEditable ? 'bg-[#E8EFE5] border-[#C5D3C2]' : isViewOnly ? 'bg-[#F2ECE1] border-[#E0D8C8]' : 'bg-[#E8EFE5] border-[#C5D3C2]'
        }`}>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="flex-1 sm:w-56 bg-white h-3.5 rounded-full overflow-hidden border border-[#A2B59E] shadow-inner">
              <div
                className="bg-gradient-to-r from-[#E06C38] to-[#2D5A43] h-full transition-all duration-300 rounded-full"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <span className="text-[#2D5A43] text-sm font-extrabold shrink-0">
              {progressPercentage}% Done
            </span>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-[#3D5239] justify-between w-full sm:w-auto">
            <span>
              Stitches: <strong className="text-[#1D231E]">{completedCount.toLocaleString()}</strong> / {totalStitches.toLocaleString()}
            </span>

            {!isViewOnly ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleMarkAllComplete}
                  className="px-2.5 py-1 bg-[#3D5239] hover:bg-[#2C3B29] text-white rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                  title="Mark all stitches complete"
                >
                  <Check className="w-3 h-3" />
                  <span>Mark All Done</span>
                </button>

                <button
                  onClick={handleResetProgress}
                  className="px-2.5 py-1 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                  title="Reset progress"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-[#6B7869] text-[11px]">
                <Info className="w-3.5 h-3.5 text-[#E06C38]" />
                <span>Live view updated by studio artisan</span>
              </div>
            )}
          </div>
        </div>

        {/* Automatic Stage Advance Notification Banner */}
        {autoAdvancedNotice && (
          <div className="mx-6 mt-3.5 p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-950 shadow-sm flex items-start sm:items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-emerald-950 flex flex-wrap items-center gap-2">
                  <span>All stitches marked complete — order automatically moved to Completed/Quality Check.</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-emerald-200 text-emerald-900 border border-emerald-400">
                    Quality Check
                  </span>
                </p>
                <p className="text-[11px] text-emerald-800 mt-0.5 leading-normal">
                  This piece has progressed to final workshop quality inspection. Advancing to Shipped requires manually entering a courier tracking number in the Completed tab.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAutoAdvancedNotice(false)}
              className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-100 hover:text-emerald-950 transition-colors shrink-0 cursor-pointer"
              title="Dismiss notice"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Main Content: Missing Pattern Config Notice OR Canvas Grid */}
        {missingPatternConfig ? (
          <div className="p-8 sm:p-14 flex-1 flex flex-col items-center justify-center text-center">
            <div className="max-w-md w-full bg-white rounded-3xl p-8 sm:p-10 border border-[#E8E1D2] shadow-sm space-y-5">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto shadow-xs ${
                isAdminEditable ? 'bg-purple-100 text-purple-700' : 'bg-amber-100 text-amber-800'
              }`}>
                {isAdminEditable ? (
                  <Sparkles className="w-8 h-8 text-purple-600" />
                ) : (
                  <Scissors className="w-8 h-8 text-amber-700" />
                )}
              </div>

              <div className="space-y-2">
                <h4 className="text-lg font-bold text-[#1D231E]">
                  {isAdminEditable ? 'No Pattern Generated Yet' : 'Pattern In Preparation'}
                </h4>
                <p className="text-xs text-[#5A6659] leading-relaxed">
                  {isAdminEditable
                    ? "No pattern generated yet for this order — use 'Open in Converter' first to create one."
                    : "Our studio artisan is currently preparing and converting the precision cross-stitch chart for this order. Live stitch tracking will become active as soon as crafting begins."}
                </p>
              </div>

              {isAdminEditable && order && (
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                  {onOpenConverter && (
                    <button
                      type="button"
                      onClick={() => {
                        handleCloseModal();
                        onOpenConverter(order);
                      }}
                      className="w-full sm:w-auto px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Open in Converter</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="w-full sm:w-auto px-4 py-2.5 bg-[#FAF6EE] hover:bg-[#F2ECE1] text-[#1D231E] text-xs font-semibold rounded-xl border border-[#E8E1D2] transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              )}

              {!isAdminEditable && (
                <div className="pt-2 flex justify-center">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-5 py-2.5 bg-[#2D5A43] hover:bg-[#234734] text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
                  >
                    Back to Orders
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Main Content Grid */
          <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 overflow-y-auto overscroll-contain">
          
          {/* Left Canvas Column */}
          <div className="lg:col-span-8 flex flex-col space-y-4">
            
            {/* Control Bar: Modes & Zoom */}
            <div className="bg-white p-3 rounded-2xl border border-[#E8E1D2] shadow-xs flex flex-wrap items-center justify-between gap-2">
              
              {/* View Modes */}
              <div className="flex items-center gap-1 bg-[#FAF6EE] p-1 rounded-xl border border-[#E8E1D2]">
                <button
                  onClick={() => setViewMode('tracker')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    viewMode === 'tracker' ? 'bg-[#3D5239] text-white shadow-xs' : 'text-[#5A6659]'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#E06C38]" />
                  <span>Stitch Tracker</span>
                </button>

                <button
                  onClick={() => setViewMode('color')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    viewMode === 'color' ? 'bg-white text-[#1D231E] shadow-xs border border-[#E8E1D2]' : 'text-[#5A6659]'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5 text-[#E06C38]" />
                  <span>Color Chart</span>
                </button>

                <button
                  onClick={() => setViewMode('symbol')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    viewMode === 'symbol' ? 'bg-white text-[#1D231E] shadow-xs border border-[#E8E1D2]' : 'text-[#5A6659]'
                  }`}
                >
                  <Download className="w-3.5 h-3.5 text-[#1D231E]" />
                  <span>Symbol Chart</span>
                </button>
              </div>

              {/* Zoom Controls */}
              <div className="flex items-center gap-1 bg-[#FAF6EE] p-1 rounded-xl border border-[#E8E1D2] text-xs">
                <button
                  onClick={handleZoomOut}
                  className="p-1.5 hover:bg-white text-[#5A6659] hover:text-[#1D231E] rounded-lg transition-colors cursor-pointer"
                  title="Zoom out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="px-2 font-bold text-[#1D231E] text-[11px] min-w-[46px] text-center font-mono">
                  {Math.round(zoomMultiplier * 100)}%
                </span>
                <button
                  onClick={handleZoomIn}
                  className="p-1.5 hover:bg-white text-[#5A6659] hover:text-[#1D231E] rounded-lg transition-colors cursor-pointer"
                  title="Zoom in (up to 1200%)"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>

                <div className="w-px h-3.5 bg-[#E8E1D2] mx-0.5" />

                {/* Quick Zoom Presets */}
                <button
                  onClick={() => setZoomMultiplier(1)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    zoomMultiplier === 1
                      ? 'bg-[#3D5239] text-white shadow-xs'
                      : 'bg-white text-[#5A6659] hover:text-[#1D231E] border border-[#E8E1D2]'
                  }`}
                  title="Fit entire pattern to screen"
                >
                  <Maximize2 className="w-3 h-3" />
                  <span>Fit</span>
                </button>

                <button
                  onClick={() => setZoomMultiplier(4)}
                  className={`px-1.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    zoomMultiplier === 4
                      ? 'bg-[#3D5239] text-white shadow-xs'
                      : 'bg-white text-[#5A6659] hover:text-[#1D231E] border border-[#E8E1D2]'
                  }`}
                  title="400% Zoom"
                >
                  400%
                </button>

                <button
                  onClick={() => setZoomMultiplier(8)}
                  className={`px-1.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    zoomMultiplier === 8
                      ? 'bg-[#3D5239] text-white shadow-xs'
                      : 'bg-white text-[#5A6659] hover:text-[#1D231E] border border-[#E8E1D2]'
                  }`}
                  title="800% Ultra HD Zoom"
                >
                  800%
                </button>
              </div>

            </div>

            {/* Pattern Canvas Container */}
            <div className="bg-white p-4 rounded-2xl border border-[#E8E1D2] shadow-xs flex-1 flex flex-col justify-between">
              
              <div className="flex items-center justify-between mb-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#1D231E]">
                    {viewMode === 'tracker' && (
                      <>
                        {isViewOnly ? (
                          <span className="text-[#556653]">Completed stitches shown with checkmarks (✓)</span>
                        ) : (
                          <span>Tap stitch to mark (✓)</span>
                        )}
                        {isZoomedIn && (
                          <span className="ml-1 font-normal text-[#5A6659] hidden sm:inline">
                            • Click & drag or scroll to pan
                          </span>
                        )}
                      </>
                    )}
                    {viewMode === 'color' && (
                      <>
                        Full DMC Color Cross-Stitch View
                        {isZoomedIn && <span className="ml-1 font-normal text-[#5A6659] hidden sm:inline">• Click & drag to pan</span>}
                      </>
                    )}
                    {viewMode === 'symbol' && (
                      <>
                        Black & White Printable Symbol Chart
                        {isZoomedIn && <span className="ml-1 font-normal text-[#5A6659] hidden sm:inline">• Click & drag to pan</span>}
                      </>
                    )}
                  </span>
                  {filterDmcCode && (
                    <span className="bg-[#E06C38]/10 text-[#E06C38] px-2 py-0.5 rounded-md text-[10px] font-bold border border-[#E06C38]/20 flex items-center gap-1">
                      Filtering: {filterDmcCode}
                      <button 
                        onClick={() => setFilterDmcCode(null)}
                        className="hover:text-black cursor-pointer font-bold ml-1"
                        title="Clear filter"
                      >
                        ×
                      </button>
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-[#6B7869] font-medium">
                  {pattern ? `${pattern.widthStitches} × ${pattern.heightStitches} stitches` : ''}
                </span>
              </div>

              <div 
                ref={containerRef}
                onScroll={handleScroll}
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
                className={`relative min-h-[380px] max-h-[520px] h-[52vh] overflow-auto bg-[#FAF6EE] border border-[#E0D8C8] rounded-xl flex p-3 select-none ${canvasCursorClass}`}
              >
                {loadingPattern && (
                  <div className="absolute inset-0 z-20 bg-[#FAF6EE]/90 backdrop-blur-xs flex flex-col items-center justify-center p-8 text-center text-[#5A6659]">
                    <Loader2 className="w-8 h-8 text-[#E06C38] animate-spin mb-3" />
                    <span className="text-xs font-bold">Rendering pattern chart...</span>
                  </div>
                )}

                {pattern ? (
                  <div 
                    ref={patternWrapperRef}
                    className={`relative shrink-0 ${canvasCursorClass}`}
                    style={{
                      width: `${displayWidth}px`,
                      height: `${displayHeight}px`,
                      margin: isFitMode ? 'auto' : undefined,
                    }}
                    onClick={(e) => {
                      if (!isZoomedIn && patternWrapperRef.current && !isViewOnly) {
                        const rect = patternWrapperRef.current.getBoundingClientRect();
                        toggleStitchAtPoint(e.clientX, e.clientY, rect);
                      }
                    }}
                  >
                    <canvas
                      ref={setCanvasRef}
                      style={{
                        position: 'absolute',
                        left: `${canvasX}px`,
                        top: `${canvasY}px`,
                        width: `${canvasW}px`,
                        height: `${canvasH}px`,
                      }}
                      className={`rounded shadow-md border border-[#1D231E]/20 ${canvasCursorClass}`}
                    />
                  </div>
                ) : !loadingPattern ? (
                  <div className="m-auto text-center p-6 text-[#5A6659] text-xs">
                    Failed to load pattern chart for tracking.
                  </div>
                ) : null}
              </div>

            </div>

          </div>

          {/* Right DMC Floss Palette Progress Checklist */}
          <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-[#E8E1D2] shadow-xs flex flex-col space-y-4">
            
            <div className="flex items-center justify-between border-b border-[#E8E1D2] pb-3">
              <div>
                <h4 className="text-sm font-bold text-[#1D231E] flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-[#E06C38]" />
                  <span>DMC Color Checklist</span>
                </h4>
                <p className="text-[10px] text-[#5A6659] mt-0.5">
                  {isViewOnly ? 'Click a shade to isolate on chart' : 'Click a shade to isolate or mark done'}
                </p>
              </div>

              {pattern && (
                <span className="text-[10px] font-bold text-[#3D5239] bg-[#E8EFE5] px-2 py-0.5 rounded-full border border-[#C5D3C2]">
                  {pattern.flossList.length} Shades
                </span>
              )}
            </div>

            {/* List of DMC colors with individual progress */}
            <div className="flex-1 max-h-[420px] overflow-y-auto space-y-2 pr-1">
              {pattern ? (
                pattern.flossList.map((item) => {
                  const colorIndices: number[] = [];
                  pattern.pixelDmcMap.forEach((dmc, idx) => {
                    if (dmc.code === item.dmc.code) {
                      colorIndices.push(idx);
                    }
                  });

                  const doneCount = colorIndices.filter(idx => completedStitches.has(idx)).length;
                  const isAllDone = colorIndices.length > 0 && doneCount === colorIndices.length;
                  const colorPct = Math.round((doneCount / Math.max(1, colorIndices.length)) * 100);
                  const isSelected = filterDmcCode === item.dmc.code;

                  return (
                    <div
                      key={item.dmc.code}
                      onClick={() => setFilterDmcCode(prev => prev === item.dmc.code ? null : item.dmc.code)}
                      className={`p-2.5 rounded-xl border text-xs transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#E06C38]/10 border-[#E06C38] ring-1 ring-[#E06C38]'
                          : isAllDone 
                          ? 'bg-[#E8EFE5]/60 border-[#C5D3C2]' 
                          : 'bg-[#FAF6EE] border-[#E8E1D2] hover:border-[#E06C38]/40'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5 gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {/* Color Swatch with Symbol */}
                          <div
                            className="w-5 h-5 rounded-md border border-black/20 flex items-center justify-center shrink-0 font-bold text-[10px]"
                            style={{
                              backgroundColor: item.dmc.hex,
                              color: parseInt(item.dmc.hex.replace('#',''), 16) > 0x888888 ? '#000' : '#FFF'
                            }}
                          >
                            {item.dmc.symbol}
                          </div>

                          <span className="font-bold text-[#1D231E] truncate text-[11px]">
                            {item.dmc.code} • {item.dmc.name}
                          </span>
                        </div>

                        {/* Toggle entire color button (disabled in view-only mode) */}
                        {!isViewOnly ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleColorComplete(item.dmc.code);
                            }}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors flex items-center gap-1 ${
                              isAllDone
                                ? 'bg-[#2E7D32] text-white'
                                : 'bg-white text-[#5A6659] border border-[#D5CDBC] hover:border-[#E06C38]'
                            }`}
                            title="Toggle all stitches for this color"
                          >
                            {isAllDone ? (
                              <>
                                <Check className="w-3 h-3" />
                                <span>Done</span>
                              </>
                            ) : (
                              <span>{doneCount}/{item.stitchCount}</span>
                            )}
                          </button>
                        ) : (
                          <span className="text-[10px] font-bold text-[#556653]">
                            {doneCount}/{item.stitchCount} ({colorPct}%)
                          </span>
                        )}
                      </div>

                      {/* Mini progress bar for this thread color */}
                      <div className="w-full bg-[#E8E1D2] h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 rounded-full ${isAllDone ? 'bg-[#2E7D32]' : 'bg-[#E06C38]'}`}
                          style={{ width: `${colorPct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-6 text-[#6B7869] text-xs">
                  Loading floss palette...
                </div>
              )}
            </div>

          </div>

        </div>
        )}

      </div>
    </div>
  );
};
