import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useSwipeBack, type UseSwipeBackOptions } from '../useSwipeBack';

function Panel({ open = true, children, ...options }: UseSwipeBackOptions & { open?: boolean; children?: React.ReactNode }) {
  const ref = useSwipeBack<HTMLDivElement>(options);
  return open ? <div ref={ref} data-testid="panel" style={{ transform: 'translateY(0)', transition: 'opacity 0.15s' }}>{children}</div> : null;
}

function touch(x: number, y = 100, identifier = 0) {
  return { clientX: x, clientY: y, identifier };
}

function swipe(el: HTMLElement, from = touch(10), to = touch(100)) {
  fireEvent.touchStart(el, { touches: [from] });
  fireEvent.touchMove(el, { touches: [to] });
  fireEvent.touchEnd(el, { touches: [], changedTouches: [to] });
}

afterEach(() => vi.unstubAllGlobals());

describe('useSwipeBack', () => {
  it('returns once for a rightward edge swipe and restores inline styles', () => {
    const onBack = vi.fn();
    render(<Panel onBack={onBack} />);
    const el = screen.getByTestId('panel');
    swipe(el);
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(el.style.transform).toBe('translateY(0)');
    expect(el.style.transition).toBe('opacity 0.15s');
  });

  it.each([
    ['outside edge', touch(30), touch(140)],
    ['short', touch(10), touch(89)],
    ['leftward', touch(20), touch(-100)],
    ['vertical', touch(10), touch(20, 220)],
  ])('ignores %s gestures', (_, from, to) => {
    const onBack = vi.fn();
    render(<Panel onBack={onBack} />);
    swipe(screen.getByTestId('panel'), from, to);
    expect(onBack).not.toHaveBeenCalled();
  });

  it('locks vertical gestures even if the finger later moves right', () => {
    const onBack = vi.fn();
    render(<Panel onBack={onBack} />);
    const el = screen.getByTestId('panel');
    fireEvent.touchStart(el, { touches: [touch(10)] });
    fireEvent.touchMove(el, { touches: [touch(15, 130)] });
    fireEvent.touchMove(el, { touches: [touch(150, 140)] });
    fireEvent.touchEnd(el, { changedTouches: [touch(150, 140)], touches: [] });
    expect(onBack).not.toHaveBeenCalled();
  });

  it('cleans up cancelled gestures without returning', () => {
    const onBack = vi.fn();
    render(<Panel onBack={onBack} />);
    const el = screen.getByTestId('panel');
    fireEvent.touchStart(el, { touches: [touch(10)] });
    fireEvent.touchMove(el, { touches: [touch(150)] });
    expect(el.style.transform).toBe('translateX(140px)');
    fireEvent.touchCancel(el);
    fireEvent.touchEnd(el, { changedTouches: [touch(150)], touches: [] });
    expect(onBack).not.toHaveBeenCalled();
    expect(el.style.transform).toBe('translateY(0)');
    swipe(el);
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('cancels when a second finger joins', () => {
    const onBack = vi.fn();
    render(<Panel onBack={onBack} />);
    const el = screen.getByTestId('panel');
    fireEvent.touchStart(el, { touches: [touch(10)] });
    fireEvent.touchMove(el, { touches: [touch(100), touch(110, 100, 1)] });
    fireEvent.touchEnd(el, { changedTouches: [touch(100)], touches: [] });
    expect(onBack).not.toHaveBeenCalled();
  });

  it('registers on panels mounted after the first render and supports reopening', () => {
    const onBack = vi.fn();
    const { rerender } = render(<Panel open={false} onBack={onBack} />);
    for (let i = 0; i < 2; i++) {
      rerender(<Panel open onBack={onBack} />);
      swipe(screen.getByTestId('panel'));
      rerender(<Panel open={false} onBack={onBack} />);
    }
    expect(onBack).toHaveBeenCalledTimes(2);
  });

  it('uses the latest callback', () => {
    const old = vi.fn();
    const latest = vi.fn();
    const { rerender } = render(<Panel onBack={old} />);
    rerender(<Panel onBack={latest} />);
    swipe(screen.getByTestId('panel'));
    expect(old).not.toHaveBeenCalled();
    expect(latest).toHaveBeenCalledOnce();
  });

  it.each([true, false])('nested panel owns the gesture even when disabled=%s', (disabled) => {
    const parent = vi.fn();
    const child = vi.fn();
    render(<Panel onBack={parent}><Panel onBack={child} disabled={disabled}><span data-testid="target" /></Panel></Panel>);
    swipe(screen.getByTestId('target'));
    expect(parent).not.toHaveBeenCalled();
    expect(child).toHaveBeenCalledTimes(disabled ? 0 : 1);
  });

  it('does not transform the page when animation is disabled', () => {
    const onBack = vi.fn();
    render(<Panel onBack={onBack} animate={false} />);
    const el = screen.getByTestId('panel');
    fireEvent.touchStart(el, { touches: [touch(10)] });
    fireEvent.touchMove(el, { touches: [touch(100)] });
    expect(el.style.transform).toBe('translateY(0)');
    fireEvent.touchEnd(el, { changedTouches: [touch(100)], touches: [] });
    expect(onBack).toHaveBeenCalledOnce();
  });

  it('checks the breakpoint on every new gesture after resizing', () => {
    let isPC = true;
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: isPC })));
    const onBack = vi.fn();
    render(<Panel onBack={onBack} />);
    const el = screen.getByTestId('panel');
    swipe(el);
    expect(onBack).not.toHaveBeenCalled();
    isPC = false;
    swipe(el);
    expect(onBack).toHaveBeenCalledOnce();
  });

  it('measures the edge relative to the panel', () => {
    const onBack = vi.fn();
    render(<Panel onBack={onBack} />);
    const el = screen.getByTestId('panel');
    vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({ left: 40 } as DOMRect);
    swipe(el, touch(50), touch(140));
    expect(onBack).toHaveBeenCalledOnce();
  });
});
