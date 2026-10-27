'use client';

import { useCallback, useEffect, useRef } from 'react';

export interface UseSwipeBackOptions {
  onBack: () => void;
  disabled?: boolean;
  edgeZone?: number;
  threshold?: number;
  pcBreakpoint?: number;
  animate?: boolean;
}

/** 左端からの右スワイプ。入れ子では最も内側の画面だけが操作を受け取る。 */
export function useSwipeBack<T extends HTMLElement>({
  onBack,
  disabled = false,
  edgeZone = 24,
  threshold = 80,
  pcBreakpoint = 768,
  animate = true,
}: UseSwipeBackOptions) {
  const onBackRef = useRef(onBack);
  useEffect(() => { onBackRef.current = onBack; });

  // callback ref にすることで、初回は非表示のパネルにも表示時に登録する。
  return useCallback((el: T | null) => {
    if (!el) return;
    el.setAttribute('data-swipe-back', '');
    let start: { x: number; y: number; id: number } | null = null;
    let dragging = false;
    let transform = '';
    let transition = '';

    function reset() {
      if (dragging && animate) {
        el!.style.transform = transform;
        el!.style.transition = transition;
      }
      start = null;
      dragging = false;
    }

    function onStart(e: TouchEvent) {
      reset();
      if (disabled || e.touches.length !== 1 ||
        window.matchMedia?.(`(min-width: ${pcBreakpoint}px)`).matches) return;
      if (!(e.target instanceof Element) || e.target.closest('[data-swipe-back]') !== el) return;
      const touch = e.touches[0];
      const x = touch.clientX - el!.getBoundingClientRect().left;
      if (x < 0 || x > edgeZone) return;
      start = { x: touch.clientX, y: touch.clientY, id: touch.identifier };
      transform = el!.style.transform;
      transition = el!.style.transition;
    }

    function onMove(e: TouchEvent) {
      if (!start) return;
      if (e.touches.length !== 1 || e.touches[0].identifier !== start.id) { reset(); return; }
      const dx = e.touches[0].clientX - start.x;
      const dy = e.touches[0].clientY - start.y;
      if (!dragging) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 8) return;
        if (dx <= 0 || Math.abs(dy) >= dx) { reset(); return; }
        dragging = true;
      }
      if (e.cancelable) e.preventDefault();
      if (animate) {
        el!.style.transition = 'none';
        el!.style.transform = `translateX(${Math.max(0, dx)}px)`;
      }
    }

    function onEnd(e: TouchEvent) {
      const touch = Array.from(e.changedTouches).find(t => t.identifier === start?.id);
      const goBack = !!(start && dragging && touch && touch.clientX - start.x >= threshold);
      reset();
      if (goBack) onBackRef.current();
    }

    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd, { passive: true });
    el.addEventListener('touchcancel', reset, { passive: true });
    return () => {
      reset();
      el.removeAttribute('data-swipe-back');
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
      el.removeEventListener('touchcancel', reset);
    };
  }, [disabled, edgeZone, threshold, pcBreakpoint, animate]);
}
