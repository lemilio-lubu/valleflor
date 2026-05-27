'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface Props {
  /** Ref to the table's overflow-x-auto container */
  scrollRef: React.RefObject<HTMLDivElement | null>;
  /** True while the table container intersects the viewport */
  isVisible: boolean;
}

/**
 * A fixed-to-viewport horizontal scrollbar that:
 * - Anchors to the bottom of the browser window while the table is on screen
 * - Fades in/out as the table enters/leaves the viewport
 * - Syncs bidirectionally: dragging the bar moves the table and vice versa
 */
export function FloatingScrollbar({ scrollRef, isVisible }: Props) {
  const barRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<{ left: number; width: number } | null>(null);
  const [scrollWidth, setScrollWidth] = useState(0);

  // Guards to prevent scroll event loops
  const fromTable = useRef(false);
  const fromBar = useRef(false);

  // Track container geometry (position + scroll width)
  const updateGeometry = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setRect({ left: r.left, width: r.width });
    setScrollWidth(el.scrollWidth);
  }, [scrollRef]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    updateGeometry();

    const ro = new ResizeObserver(updateGeometry);
    ro.observe(el);
    window.addEventListener('scroll', updateGeometry, { passive: true });
    window.addEventListener('resize', updateGeometry);

    return () => {
      ro.disconnect();
      window.removeEventListener('scroll', updateGeometry);
      window.removeEventListener('resize', updateGeometry);
    };
  }, [updateGeometry]);

  // Bidirectional sync
  useEffect(() => {
    const table = scrollRef.current;
    const bar = barRef.current;
    if (!table || !bar) return;

    const onTableScroll = () => {
      if (fromBar.current) return;
      fromTable.current = true;
      bar.scrollLeft = table.scrollLeft;
      fromTable.current = false;
    };

    const onBarScroll = () => {
      if (fromTable.current) return;
      fromBar.current = true;
      table.scrollLeft = bar.scrollLeft;
      fromBar.current = false;
    };

    table.addEventListener('scroll', onTableScroll, { passive: true });
    bar.addEventListener('scroll', onBarScroll, { passive: true });

    return () => {
      table.removeEventListener('scroll', onTableScroll);
      bar.removeEventListener('scroll', onBarScroll);
    };
  }, [scrollRef]);

  // Don't render if table fits entirely in view (no horizontal overflow)
  if (!rect || scrollWidth <= rect.width + 4) return null;

  return (
    <div
      ref={barRef}
      aria-hidden="true"
      className={`fixed bottom-0 z-50 overflow-x-auto transition-opacity duration-300 ease-in-out ${
        isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      style={{
        left: rect.left,
        width: rect.width,
        height: 10,
        // Use the same scrollbar style as .scrollbar-always
        scrollbarWidth: 'thin',
      }}
    >
      {/* Phantom element that stretches the scrollbar thumb to the correct proportion */}
      <div style={{ width: scrollWidth, height: 1 }} />
    </div>
  );
}
