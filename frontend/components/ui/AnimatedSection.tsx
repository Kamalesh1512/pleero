'use client';

import { useRef, useState, useEffect } from 'react';

export function useInView(threshold = 0.1) {
  const [isInView, setIsInView] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsInView(true); },
      { threshold }
    );
    observer.observe(el);
    return () => observer.unobserve(el);
  }, [threshold]);

  return { ref, isInView };
}

export default function AnimatedSection({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { ref, isInView } = useInView();
  return (
    <div ref={ref} className={`${isInView ? 'in-view' : 'before-view'} ${className}`}>
      {children}
    </div>
  );
}
