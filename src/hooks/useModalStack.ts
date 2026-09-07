import { useEffect, useState, useId, useRef } from 'react';

export interface ModalStackEntry {
  id: string;
  zIndex: number;
  onClose?: () => void;
}

// Global modal stack state
let modalStack: ModalStackEntry[] = [];
let nextZIndex = 100000;
let originalOverflow = '';
let originalPaddingRight = '';
let globalWheelListenerAttached = false;
let globalKeydownListenerAttached = false;

const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((fn) => fn());
}

// Custom continuously-eased smooth scroll state
let smoothScrollRafId: number | null = null;
let activeScrollElement: HTMLElement | null = null;
let targetScrollTop = 0;
let targetScrollLeft = 0;
const EASING_FACTOR = 0.2;

export function cancelSmoothScroll() {
  if (smoothScrollRafId !== null) {
    cancelAnimationFrame(smoothScrollRafId);
    smoothScrollRafId = null;
  }
  activeScrollElement = null;
}

function animateSmoothScroll() {
  if (!activeScrollElement || !document.body.contains(activeScrollElement)) {
    cancelSmoothScroll();
    return;
  }

  const currentY = activeScrollElement.scrollTop;
  const currentX = activeScrollElement.scrollLeft;

  const diffY = targetScrollTop - currentY;
  const diffX = targetScrollLeft - currentX;

  // If close enough to target (under 1px), snap to exact target and stop the loop
  if (Math.abs(diffY) < 1.0 && Math.abs(diffX) < 1.0) {
    activeScrollElement.scrollTop = targetScrollTop;
    activeScrollElement.scrollLeft = targetScrollLeft;
    smoothScrollRafId = null;
    activeScrollElement = null;
    return;
  }

  // Smooth lerp easing step
  let stepY = diffY * EASING_FACTOR;
  let stepX = diffX * EASING_FACTOR;

  // Prevent subpixel stagnation
  if (Math.abs(stepY) < 1.0 && Math.abs(diffY) >= 1.0) {
    stepY = Math.sign(diffY) * Math.min(1.0, Math.abs(diffY));
  }
  if (Math.abs(stepX) < 1.0 && Math.abs(diffX) >= 1.0) {
    stepX = Math.sign(diffX) * Math.min(1.0, Math.abs(diffX));
  }

  activeScrollElement.scrollTop = currentY + stepY;
  activeScrollElement.scrollLeft = currentX + stepX;

  smoothScrollRafId = requestAnimationFrame(animateSmoothScroll);
}

function lockBodyScroll() {
  if (modalStack.length === 1) {
    originalOverflow = document.body.style.overflow;
    originalPaddingRight = document.body.style.paddingRight;

    // Calculate scrollbar width to prevent layout shift
    const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollBarWidth > 0) {
      document.body.style.paddingRight = `${scrollBarWidth}px`;
    }
  }
}

function unlockBodyScroll() {
  if (modalStack.length === 0) {
    document.body.style.overflow = originalOverflow;
    document.body.style.paddingRight = originalPaddingRight;
  }
}

/**
 * Global wheel handler that always routes wheel events to the TOPMOST modal's scroll container.
 */
function handleGlobalWheel(e: WheelEvent) {
  if (modalStack.length === 0) return;

  const topmostEntry = modalStack[modalStack.length - 1];
  if (!topmostEntry) return;

  // Find the topmost modal overlay by ID or data-modal-id
  let activeOverlay = document.querySelector<HTMLElement>(`[data-modal-id="${topmostEntry.id}"]`);

  // Fallback: look for overlay with highest style zIndex
  if (!activeOverlay) {
    const overlays = Array.from(
      document.querySelectorAll<HTMLElement>('[data-modal-overlay="true"], .fixed.inset-0')
    ).filter((el) => {
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
    });

    if (overlays.length === 0) return;
    activeOverlay = overlays[overlays.length - 1];
  }

  if (!activeOverlay) return;

  // Locate the scrollable container inside the active topmost modal
  const scrollable =
    activeOverlay.querySelector<HTMLElement>('[data-modal-scroll="true"], .overflow-y-auto') ||
    (activeOverlay.classList.contains('overflow-y-auto') ? activeOverlay : null);

  if (!scrollable) {
    e.preventDefault();
    return;
  }

  if (scrollable.contains(e.target as Node)) {
    // Cursor is over the modal's actual scrollable content — let native 
    // scroll behavior handle it directly, and cancel any active backdrop easing
    cancelSmoothScroll();
    return;
  }

  // Normalize delta values based on deltaMode:
  // deltaMode 0: pixels (default)
  // deltaMode 1: lines (~20px per line)
  // deltaMode 2: pages
  let deltaY = e.deltaY;
  let deltaX = e.deltaX;
  if (e.deltaMode === 1) {
    deltaY *= 20;
    deltaX *= 20;
  } else if (e.deltaMode === 2) {
    deltaY *= window.innerHeight;
    deltaX *= window.innerWidth;
  }

  // Prevent background scroll and forward smoothly to modal content
  e.preventDefault();

  // If active scroll target changed or animation wasn't running, sync target with current scroll position
  if (activeScrollElement !== scrollable || smoothScrollRafId === null) {
    cancelSmoothScroll();
    activeScrollElement = scrollable;
    targetScrollTop = scrollable.scrollTop;
    targetScrollLeft = scrollable.scrollLeft;
  }

  // Calculate container boundaries
  const maxScrollTop = Math.max(0, scrollable.scrollHeight - scrollable.clientHeight);
  const maxScrollLeft = Math.max(0, scrollable.scrollWidth - scrollable.clientWidth);

  // Accumulate the delta into target scroll coordinates (clamped to bounds)
  targetScrollTop = Math.max(0, Math.min(maxScrollTop, targetScrollTop + deltaY));
  targetScrollLeft = Math.max(0, Math.min(maxScrollLeft, targetScrollLeft + deltaX));

  // If already at boundary and cannot scroll further, nothing to animate
  if (
    Math.abs(targetScrollTop - scrollable.scrollTop) < 0.5 &&
    Math.abs(targetScrollLeft - scrollable.scrollLeft) < 0.5
  ) {
    return;
  }

  // Start the requestAnimationFrame easing loop if not already active
  if (smoothScrollRafId === null) {
    smoothScrollRafId = requestAnimationFrame(animateSmoothScroll);
  }
}

/**
 * Global keydown handler: pressing Escape closes ONLY the topmost modal in the stack.
 */
function handleGlobalKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && modalStack.length > 0) {
    const topmostEntry = modalStack[modalStack.length - 1];
    if (topmostEntry?.onClose) {
      e.preventDefault();
      e.stopPropagation();
      topmostEntry.onClose();
    }
  }
}

function ensureGlobalListeners() {
  if (modalStack.length > 0) {
    if (!globalWheelListenerAttached) {
      window.addEventListener('wheel', handleGlobalWheel, { passive: false });
      globalWheelListenerAttached = true;
    }
    if (!globalKeydownListenerAttached) {
      window.addEventListener('keydown', handleGlobalKeydown);
      globalKeydownListenerAttached = true;
    }
  } else {
    cancelSmoothScroll();
    if (globalWheelListenerAttached) {
      window.removeEventListener('wheel', handleGlobalWheel);
      globalWheelListenerAttached = false;
    }
    if (!globalKeydownListenerAttached) {
      window.removeEventListener('keydown', handleGlobalKeydown);
      globalKeydownListenerAttached = false;
    }
  }
}

/**
 * Hook to manage modal stacking order, dynamic z-index, and scroll lock.
 * Ensures the most recently opened modal is always on top (higher z-index)
 * and receives all scroll interactions and escape closures.
 */
export function useModalStack(
  isOpen: boolean = true,
  options?: {
    id?: string;
    onClose?: () => void;
  }
) {
  const generatedId = useId();
  const modalId = options?.id || generatedId;
  const [zIndex, setZIndex] = useState<number>(() => 100000);

  // Keep a stable ref to the latest onClose callback without re-triggering the effect
  const onCloseRef = useRef(options?.onClose);
  onCloseRef.current = options?.onClose;

  useEffect(() => {
    if (!isOpen) return;

    // Allocate a strictly higher z-index for this newly opened modal
    nextZIndex += 10;
    const allocatedZ = nextZIndex;
    setZIndex(allocatedZ);

    // Cancel any previous modal's easing animation when a new modal opens
    cancelSmoothScroll();

    const entry: ModalStackEntry = {
      id: modalId,
      zIndex: allocatedZ,
      get onClose() {
        return onCloseRef.current;
      },
    };

    modalStack.push(entry);
    lockBodyScroll();
    ensureGlobalListeners();
    notifyListeners();

    return () => {
      // Cancel active animation when this modal unmounts or closes
      cancelSmoothScroll();
      modalStack = modalStack.filter((item) => item.id !== modalId);
      unlockBodyScroll();
      ensureGlobalListeners();
      notifyListeners();
    };
  }, [isOpen, modalId]);

  const isTopmost = modalStack.length > 0 && modalStack[modalStack.length - 1]?.id === modalId;

  return {
    zIndex,
    isTopmost,
    modalId,
    stackDepth: modalStack.length,
  };
}
