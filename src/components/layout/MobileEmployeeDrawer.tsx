import { useState } from 'react';
import { Users, X } from 'lucide-react';
import { RightPanel } from '@/components/layout/RightPanel';

export function MobileEmployeeDrawer() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-40 md:hidden btn-primary shadow-lg rounded-full px-4 py-3 gap-2 safe-bottom"
        aria-label="직원 관리 패널 열기"
      >
        <Users size={18} />
        직원
      </button>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-stone-900/40 backdrop-blur-[1px]"
            aria-label="직원 패널 닫기"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[78dvh] bg-stone-50 rounded-t-2xl shadow-2xl flex flex-col animate-slide-in-up safe-bottom">
            <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200 shrink-0">
              <h2 className="text-sm font-semibold text-stone-700">직원 관리</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="btn-ghost p-2 touch-target"
                aria-label="닫기"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden">
              <RightPanel className="max-w-none w-full h-full p-3 gap-3" />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
