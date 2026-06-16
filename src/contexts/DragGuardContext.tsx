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

const SUPPRESS_DISMISS_MS = 300;

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

    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('dragend', handleDragEnd);
    document.addEventListener('drop', handleDragEnd);

    return () => {
      document.removeEventListener('dragstart', handleDragStart);
      document.removeEventListener('dragend', handleDragEnd);
      document.removeEventListener('drop', handleDragEnd);
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
