'use client';

import { useEffect, useRef } from 'react';

export interface UseSwipeBackOptions {
  onBack: () => void;
  disabled?: boolean;
  edgeZone?: number;
  threshold?: number;
  pcBreakpoint?: number;
}

/**
 * standalone PWA では OS のエッジスワイプバックが効かないため、
 * パネル左端からの右スワイプで戻る操作を模倣する。
 */
export function useSwipeBack<T extends HTMLElement>({
  onBack,
  disabled,
  edgeZone = 24,
  threshold = 80,
  pcBreakpoint = 768,
}: UseSwipeBackOptions) {
  const panelRef = useRef<T>(null);
  const onBackRef = useRef(onBack);
  useEffect(() => {
    onBackRef.current = onBack;
  });

  useEffect(() => {
    if (disabled) return;
    const isPC = typeof window.matchMedia === 'function' &&
      window.matchMedia(`(min-width: ${pcBreakpoint}px)`).matches;
    if (isPC) return;

    if (!panelRef.current) return;
    const el: HTMLElement = panelRef.current;

    let startX = 0;
    let startY = 0;
    let isTracking = false;
    let isDragging = false;

    function onTouchStart(e: TouchEvent) {
      const x = e.touches[0].clientX;
      isTracking = x <= edgeZone;
      if (!isTracking) return;
      startX = x;
      startY = e.touches[0].clientY;
      isDragging = false;
    }

    function onTouchMove(e: TouchEvent) {
      if (!isTracking) return;
      const deltaX = e.touches[0].clientX - startX;
      const deltaY = e.touches[0].clientY - startY;
      if (deltaX <= 0) return;
      if (Math.abs(deltaY) > Math.abs(deltaX)) return;

      if (!isDragging) {
        isDragging = true;
        el.style.transition = 'none';
      }
      e.preventDefault();
      el.style.transform = `translateX(${deltaX}px)`;
    }

    function onTouchEnd(e: TouchEvent) {
      if (!isTracking) return;
      isTracking = false;
      if (!isDragging) return;
      isDragging = false;

      const deltaX = e.changedTouches[0].clientX - startX;
      el.style.transition = 'transform 0.2s ease-out';
      if (deltaX >= threshold) {
        el.style.transform = 'translateX(100%)';
        onBackRef.current();
      } else {
        el.style.transform = 'translateX(0)';
      }
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [disabled, edgeZone, threshold, pcBreakpoint]);

  return panelRef;
}
