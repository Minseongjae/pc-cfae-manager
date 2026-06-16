import { useEffect, useRef, type MouseEvent, type ReactNode } from 'react';
import { useDragGuard } from '@/contexts/DragGuardContext';

interface ModalOverlayProps {
  onClose: () => void;
  children: ReactNode;
  className?: string;
  panelClassName?: string;
}

export function ModalOverlay({
  onClose,
  children,
  className = 'fixed inset-0 z-50 flex items-center justify-center bg-stone-900/30 backdrop-blur-sm p-4',
  panelClassName,
}: ModalOverlayProps) {
  const { isDragging, canDismissOverlay } = useDragGuard();
  const backdropPressedRef = useRef(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleBackdropMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      backdropPressedRef.current = true;
    }
  };

  const handleBackdropMouseUp = (event: MouseEvent<HTMLDivElement>) => {
    const pressedOnBackdrop = backdropPressedRef.current;
    backdropPressedRef.current = false;

    if (
      pressedOnBackdrop &&
      event.target === event.currentTarget &&
      canDismissOverlay()
    ) {
      onClose();
    }
  };

  const handleBackdropMouseLeave = () => {
    backdropPressedRef.current = false;
  };

  return (
    <div
      className={`${className}${isDragging ? ' pointer-events-none' : ''}`}
      onMouseDown={handleBackdropMouseDown}
      onMouseUp={handleBackdropMouseUp}
      onMouseLeave={handleBackdropMouseLeave}
    >
      <div
        className={`${panelClassName ?? ''} pointer-events-auto`}
        onMouseDown={(event) => event.stopPropagation()}
        onMouseUp={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
