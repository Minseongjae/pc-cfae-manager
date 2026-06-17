import { Lock } from 'lucide-react';
import type { PageId } from '@/types';
import { SyncStatusBadge } from '@/components/layout/SyncStatusBadge';
import { AdminLockButton } from '@/components/auth/AdminLockButton';
import { useAdminLock } from '@/hooks/useAdminLock';
import { useAdminLockContext } from '@/contexts/AdminLockContext';
import { NAV_ITEMS, isNavItemLocked } from '@/lib/navConfig';
import { Coffee, X } from 'lucide-react';

interface SidebarProps {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
  className?: string;
  onClose?: () => void;
}

function formatSessionExpiry(date: Date | null): string | null {
  if (!date) return null;
  return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

export function Sidebar({ currentPage, onNavigate, className = '', onClose }: SidebarProps) {
  const isDrawer = Boolean(onClose);
  const unlocked = useAdminLock();
  const { sessionExpiresAt } = useAdminLockContext();
  const expiryLabel = formatSessionExpiry(sessionExpiresAt);

  return (
    <aside
      className={`w-[220px] h-full bg-white border-r border-stone-200/60 flex flex-col shrink-0 shadow-sm ${className}`}
    >
      <div className="px-5 py-6 border-b border-stone-200/80">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-stone-700 to-stone-600 flex items-center justify-center shadow-md shrink-0">
              <Coffee className="text-stone-100" size={20} strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <h1 className="heading-display text-base leading-tight">1% PC&CAFE</h1>
              <p className="label-caps mt-0.5 normal-case tracking-wide text-stone-400 text-[10px]">
                {unlocked ? '관리자 모드' : '조회 모드'}
              </p>
            </div>
          </div>
          {isDrawer && (
            <button
              type="button"
              onClick={onClose}
              className="btn-ghost touch-target shrink-0"
              aria-label="메뉴 닫기"
            >
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
        <p className="label-caps px-3 mb-3">Menu</p>
        {NAV_ITEMS.map((item) => {
          const isActive = currentPage === item.id;
          const locked = isNavItemLocked(item.id, unlocked);
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={`nav-item touch-nav ${isActive ? 'nav-item-active' : 'nav-item-inactive'}`}
            >
              <span className={isActive ? 'text-stone-700' : 'text-stone-400'}>
                <Icon size={18} strokeWidth={1.75} />
              </span>
              <span className="flex-1 text-left">{item.label}</span>
              {locked && (
                <Lock size={13} className="text-stone-400 shrink-0" aria-label="잠금 메뉴" />
              )}
            </button>
          );
        })}
      </nav>

      <SyncStatusBadge />

      <div className="px-3 pb-5 safe-bottom space-y-2">
        <div className="nav-item nav-item-inactive border border-stone-200/80 w-full touch-nav p-0 overflow-hidden">
          <AdminLockButton
            className="w-full justify-start px-3 py-2.5 border-0 rounded-none bg-transparent hover:bg-stone-50"
            showLabel
          />
        </div>
        <p className="text-[10px] text-stone-400 text-center px-2 leading-relaxed">
          {unlocked && expiryLabel ? (
            <>관리자 모드 · {expiryLabel}까지 유지</>
          ) : (
            <>
              <Lock size={10} className="inline mr-1" />
              잠긴 메뉴는 비밀번호 입력 후 이용
            </>
          )}
        </p>
      </div>
    </aside>
  );
}
