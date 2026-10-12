'use client';

import { useEffect, useRef, useState } from 'react';

const THRESHOLD = 64;
const MAX_DISTANCE = 96;

/** 最上部からの縦ドラッグだけを扱い、横スワイプと通常スクロールを優先する。 */
export function usePullToRefresh({ onRefresh, disabled = false }: {
  onRefresh?: () => Promise<void>;
  disabled?: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const optionsRef = useRef({ onRefresh, disabled });
  const refreshingRef = useRef(false);
  const [distance, setDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    optionsRef.current = { onRefresh, disabled };
  });

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let start: { x: number; y: number } | null = null;
    let pulling = false;
    let offset = 0;
    let suppressClickUntil = 0;
    let mounted = true;

    function reset() {
      start = null;
      pulling = false;
      offset = 0;
      setDistance(0);
    }

    function onStart(e: TouchEvent) {
      reset();
      if (e.touches.length !== 1 || el!.scrollTop > 0 ||
          optionsRef.current.disabled || !optionsRef.current.onRefresh || refreshingRef.current) return;
      start = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }

    function onMove(e: TouchEvent) {
      if (!start) return;
      if (e.touches.length !== 1 || optionsRef.current.disabled || el!.scrollTop > 0) {
        reset();
        return;
      }
      const dx = e.touches[0].clientX - start.x;
      const dy = e.touches[0].clientY - start.y;
      if (!pulling) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 8) return;
        if (dy <= 0 || Math.abs(dx) >= dy) {
          reset();
          return;
        }
        pulling = true;
      }
      // React の touchmove は passive のため、native listener でスクロールを止める。
      if (e.cancelable) e.preventDefault();
      e.stopPropagation();
      offset = Math.min(MAX_DISTANCE, Math.max(0, dy * 0.5));
      setDistance(offset);
    }

    function onEnd() {
      const refresh = pulling && offset >= THRESHOLD && !optionsRef.current.disabled;
      if (pulling) suppressClickUntil = Date.now() + 500;
      reset();
      const callback = optionsRef.current.onRefresh;
      if (!refresh || !callback || refreshingRef.current) return;
      refreshingRef.current = true;
      setIsRefreshing(true);
      // エラー表示は呼び出し元に委ね、成功・失敗のどちらでもジェスチャーを復帰させる。
      void Promise.resolve().then(callback).catch(() => {}).finally(() => {
        refreshingRef.current = false;
        if (mounted) setIsRefreshing(false);
      });
    }

    function onCancel() {
      if (pulling) suppressClickUntil = Date.now() + 500;
      reset();
    }

    function onClick(e: MouseEvent) {
      if (Date.now() >= suppressClickUntil ||
          !(e.target instanceof Element) || !e.target.closest('[role="option"]')) return;
      suppressClickUntil = 0;
      e.preventDefault();
      e.stopPropagation();
    }

    el.addEventListener('touchstart', onStart, { passive: true, capture: true });
    el.addEventListener('touchmove', onMove, { passive: false, capture: true });
    el.addEventListener('touchend', onEnd);
    el.addEventListener('touchcancel', onCancel);
    el.addEventListener('click', onClick, true);
    return () => {
      mounted = false;
      el.removeEventListener('touchstart', onStart, true);
      el.removeEventListener('touchmove', onMove, true);
      el.removeEventListener('touchend', onEnd);
      el.removeEventListener('touchcancel', onCancel);
      el.removeEventListener('click', onClick, true);
    };
  }, []);

  return { scrollRef, distance, isRefreshing, isReady: distance >= THRESHOLD };
}
