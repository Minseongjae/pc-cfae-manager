import { useEffect, useState } from 'react';

const MOBILE_MAX_WIDTH = 768;

export function useIsMobile(maxWidth = MOBILE_MAX_WIDTH): boolean {
  const query = `(max-width: ${maxWidth}px)`;

  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const media = window.matchMedia(query);
    const sync = (event: MediaQueryListEvent) => setIsMobile(event.matches);
    setIsMobile(media.matches);
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, [query]);

  return isMobile;
}
