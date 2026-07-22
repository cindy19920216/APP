"use client";

import { useState, useEffect } from 'react';

const QUERY = '(min-width: 1024px)';

// SSR에서는 항상 모바일(false)로 시작 — mount 후 실제 뷰포트 폭으로 갱신.
export default function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(QUERY);
    setIsDesktop(mql.matches);
    const onChange = (e) => setIsDesktop(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return isDesktop;
}
