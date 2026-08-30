import { useModalStack } from './useModalStack';

/**
 * Custom hook to lock body scrolling when a modal or overlay is open.
 * Automatically manages modal stacking, dynamic z-indices, and routes scroll input
 * to the topmost modal's scroll container.
 */
export function useBodyScrollLock(isLocked: boolean = true) {
  useModalStack(isLocked);
}

export { useModalStack };
