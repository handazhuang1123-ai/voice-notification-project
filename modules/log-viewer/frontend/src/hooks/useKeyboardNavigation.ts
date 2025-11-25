/**
 * useKeyboardNavigation Hook
 * 键盘导航 Hook
 */

import { useEffect, useCallback, useRef } from 'react';
import type { NavigationMode } from '../types';

interface KeyboardNavigationHandlers {
  onMoveUp: () => void;
  onMoveDown: () => void;
  onMoveToStart: () => void;
  onMoveToEnd: () => void;
  onEnter: () => void;
  onBack: () => void;
  onScrollUp?: () => void;
  onScrollDown?: () => void;
  onScrollToTop?: () => void;
  onScrollToBottom?: () => void;
}

export function useKeyboardNavigation(
  mode: NavigationMode,
  handlers: KeyboardNavigationHandlers
) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const h = handlersRef.current;

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        if (mode === 'detail' && h.onScrollUp) {
          h.onScrollUp();
        } else {
          h.onMoveUp();
        }
        break;

      case 'ArrowDown':
        e.preventDefault();
        if (mode === 'detail' && h.onScrollDown) {
          h.onScrollDown();
        } else {
          h.onMoveDown();
        }
        break;

      case 'Home':
        e.preventDefault();
        if (mode === 'detail' && h.onScrollToTop) {
          h.onScrollToTop();
        } else {
          h.onMoveToStart();
        }
        break;

      case 'End':
        e.preventDefault();
        if (mode === 'detail' && h.onScrollToBottom) {
          h.onScrollToBottom();
        } else {
          h.onMoveToEnd();
        }
        break;

      case 'Enter':
      case 'ArrowRight':
        e.preventDefault();
        h.onEnter();
        break;

      case 'Escape':
      case 'ArrowLeft':
        e.preventDefault();
        h.onBack();
        break;
    }
  }, [mode]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
}
