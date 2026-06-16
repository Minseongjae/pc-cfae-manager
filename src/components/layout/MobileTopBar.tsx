import { Menu, Coffee } from 'lucide-react';
import type { PageId } from '@/types';

const PAGE_TITLES: Record<PageId, string> = {
  schedule: '근무 스케줄',
  payroll: '급여 관리',
  employees: '직원 관리',
  'actual-work': '실근무 관리',
  dashboard: '대시보드',
  settings: '설정',
};

interface MobileTopBarProps {
  currentPage: PageId;
  onOpenMenu: () => void;
}

export function MobileTopBar({ currentPage, onOpenMenu }: MobileTopBarProps) {
  return (
    <header className="md:hidden shrink-0 flex items-center gap-3 px-4 py-3 bg-white/95 backdrop-blur-md border-b border-stone-200/60 safe-top">
      <button
        type="button"
        onClick={onOpenMenu}
        className="btn-ghost touch-target shrink-0"
        aria-label="메뉴 열기"
      >
        <Menu size={22} strokeWidth={1.75} />
      </button>
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-stone-700 to-stone-600 flex items-center justify-center shrink-0">
          <Coffee className="text-stone-100" size={18} strokeWidth={1.75} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-stone-800 truncate">{PAGE_TITLES[currentPage]}</p>
          <p className="text-[10px] text-stone-400 tracking-wide">1% PC&CAFE</p>
        </div>
      </div>
    </header>
  );
}
