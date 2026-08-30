import { useEffect } from 'react';

// Reference counter to safely manage multiple / nested modals
let scrollLockCount = 0;
let originalOverflow = '';
let originalPaddingRight = '';

/**
 * Custom hook to lock body scrolling when a modal or overlay is open.
 * Automatically restores previous body scroll behavior on unmount or when isLocked becomes false.
 * Handles nested modals gracefully using reference counting.
 * Also captures wheel scroll input anywhere on the screen (including over the blurred backdrop / padding)
 * and directs the scroll delta to the active modal's scrollable container.
 */
export function useBodyScrollLock(isLocked: boolean = true) {
  useEffect(() => {
    if (!isLocked) return;

    if (scrollLockCount === 0) {
      originalOverflow = document.body.style.overflow;
      originalPaddingRight = document.body.style.paddingRight;

      // Calculate scrollbar width to prevent page layout jumping
      const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      if (scrollBarWidth > 0) {
        document.body.style.paddingRight = `${scrollBarWidth}px`;
      }
    }
    scrollLockCount++;

    // Global wheel handler: when cursor is outside the inner scroll container (e.g. on the backdrop),
    // forward the scroll to the topmost modal's scrollable container.
    const handleGlobalWheel = (e: WheelEvent) => {
      // Find all fixed modal overlays in DOM order
      const overlays = Array.from(document.querySelectorAll<HTMLElement>('.fixed.inset-0, [data-modal-overlay="true"]'))
        .filter((el) => {
          const style = window.getComputedStyle(el);
          return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
        });

      if (overlays.length === 0) return;

      // Topmost overlay
      const activeOverlay = overlays[overlays.length - 1];

      // Find scrollable container inside this overlay
      const scrollable = activeOverlay.querySelector<HTMLElement>('[data-modal-scroll="true"], .overflow-y-auto')
        || (activeOverlay.classList.contains('overflow-y-auto') ? activeOverlay : null);

      if (!scrollable) return;

      // If the wheel event target is already inside the scrollable container, allow native scroll
      if (scrollable.contains(e.target as Node)) {
        return;
      }

      // If the wheel event occurred on backdrop, header, or padding, scroll the modal content
      e.preventDefault();
      scrollable.scrollBy({
        top: e.deltaY,
        left: e.deltaX,
        behavior: 'auto',
      });
    };

    window.addEventListener('wheel', handleGlobalWheel, { passive: false });

    return () => {
      window.removeEventListener('wheel', handleGlobalWheel);
      scrollLockCount--;
      if (scrollLockCount <= 0) {
        scrollLockCount = 0;
        document.body.style.overflow = originalOverflow;
        document.body.style.paddingRight = originalPaddingRight;
      }
    };
  }, [isLocked]);
}

