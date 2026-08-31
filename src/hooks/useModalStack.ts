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

  // If the target is anywhere inside the topmost modal (e.g. editor pane, preview pane, dropdown, etc.),
  // let native browser scrolling take place completely unhindered
  if (activeOverlay.contains(e.target as Node)) {
    return;
  }

  // Locate the scrollable container inside the active topmost modal for backdrop scrolling
  const scrollable =
    activeOverlay.querySelector<HTMLElement>('[data-modal-scroll="true"], .overflow-y-auto') ||
    (activeOverlay.classList.contains('overflow-y-auto') ? activeOverlay : null);

  if (!scrollable) {
    e.preventDefault();
    return;
  }

  // Otherwise (e.g. mouse is over backdrop or outside active modal), prevent background scroll
  // and scroll the topmost modal's container
  e.preventDefault();
  scrollable.scrollBy({
    top: e.deltaY,
    left: e.deltaX,
    behavior: 'auto',
  });
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
      // Remove this modal from the stack
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
