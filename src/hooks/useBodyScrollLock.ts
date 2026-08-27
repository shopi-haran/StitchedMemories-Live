import { useEffect } from 'react';

// Reference counter to safely manage multiple / nested modals
let scrollLockCount = 0;
let originalOverflow = '';
let originalPaddingRight = '';

/**
 * Custom hook to lock body scrolling when a modal or overlay is open.
 * Automatically restores previous body scroll behavior on unmount or when isLocked becomes false.
 * Handles nested modals gracefully using reference counting.
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

    return () => {
      scrollLockCount--;
      if (scrollLockCount <= 0) {
        scrollLockCount = 0;
        document.body.style.overflow = originalOverflow;
        document.body.style.paddingRight = originalPaddingRight;
      }
    };
  }, [isLocked]);
}
