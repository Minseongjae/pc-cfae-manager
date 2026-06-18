import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

const SUPPRESS_DISMISS_MS = 500;

interface DragGuardContextValue {
  isDragging: boolean;
  beginDrag: () => void;
  endDrag: () => void;
  canDismissOverlay: () => boolean;
}

const DragGuardContext = createContext<DragGuardContextValue | null>(null);

export function DragGuardProvider({ children }: { children: ReactNode }) {
  const [isDragging, setIsDragging] = useState(false);
  const dragCountRef = useRef(0);
  const suppressDismissUntilRef = useRef(0);

  const beginDrag = useCallback(() => {
    dragCountRef.current += 1;
    setIsDragging(true);
  }, []);

  const endDrag = useCallback(() => {
    dragCountRef.current = Math.max(0, dragCountRef.current - 1);
    if (dragCountRef.current === 0) {
      setIsDragging(false);
      suppressDismissUntilRef.current = Date.now() + SUPPRESS_DISMISS_MS;
    }
  }, []);

  const canDismissOverlay = useCallback(() => {
    return dragCountRef.current === 0 && Date.now() >= suppressDismissUntilRef.current;
  }, []);

  useEffect(() => {
    const handleDragStart = () => beginDrag();
    const handleDragEnd = () => endDrag();

    let touchActive = false;
    let touchStartX = 0;
    let touchStartY = 0;

    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) return;
      touchActive = true;
      touchStartX = event.touches[0].clientX;
      touchStartY = event.touches[0].clientY;
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (!touchActive || event.touches.length !== 1) return;
      const dx = Math.abs(event.touches[0].clientX - touchStartX);
      const dy = Math.abs(event.touches[0].clientY - touchStartY);
      if (dx > 8 || dy > 8) beginDrag();
    };

    const handleTouchEnd = () => {
      touchActive = false;
      endDrag();
    };

    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('dragend', handleDragEnd);
    document.addEventListener('drop', handleDragEnd);
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd);
    document.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      document.removeEventListener('dragstart', handleDragStart);
      document.removeEventListener('dragend', handleDragEnd);
      document.removeEventListener('drop', handleDragEnd);
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [beginDrag, endDrag]);

  const value = useMemo(
    () => ({ isDragging, beginDrag, endDrag, canDismissOverlay }),
    [isDragging, beginDrag, endDrag, canDismissOverlay]
  );

  return (
    <DragGuardContext.Provider value={value}>{children}</DragGuardContext.Provider>
  );
}

export function useDragGuard(): DragGuardContextValue {
  const ctx = useContext(DragGuardContext);
  if (!ctx) {
    throw new Error('useDragGuard must be used within DragGuardProvider');
  }
  return ctx;
}
