import { useRef, useState, useCallback, useEffect } from 'react';

export function useTableScroll(stepPx = 200) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const update = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setIsScrolled(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    update();
    el.addEventListener('scroll', update, { passive: true });

    const ro = new ResizeObserver(update);
    ro.observe(el);

    // Show/hide floating scrollbar based on table visibility in viewport
    const io = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.01 },
    );
    io.observe(el);

    return () => {
      el.removeEventListener('scroll', update);
      ro.disconnect();
      io.disconnect();
    };
  }, [update]);

  const scrollLeft = useCallback(() => {
    scrollRef.current?.scrollBy({ left: -stepPx, behavior: 'smooth' });
  }, [stepPx]);

  const scrollRight = useCallback(() => {
    scrollRef.current?.scrollBy({ left: stepPx, behavior: 'smooth' });
  }, [stepPx]);

  return { scrollRef, isScrolled, canScrollRight, isVisible, scrollLeft, scrollRight };
}
