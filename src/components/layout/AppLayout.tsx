import { useEffect, useState } from 'react';
import { Sidebar } from './Sidebar';
import { RightPanel } from './RightPanel';
import { MobileEmployeeDrawer } from './MobileEmployeeDrawer';
import { MobileTopBar } from './MobileTopBar';
import type { PageId } from '@/types';

interface AppLayoutProps {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
  children: React.ReactNode;
}

export function AppLayout({ currentPage, onNavigate, children }: AppLayoutProps) {
  const isSchedule = currentPage === 'schedule';
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [currentPage]);

  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  const handleNavigate = (page: PageId) => {
    onNavigate(page);
    setMenuOpen(false);
  };

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden app-shell">
      <Sidebar
        currentPage={currentPage}
        onNavigate={handleNavigate}
        className="hidden md:flex"
      />

      {menuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-stone-900/40 backdrop-blur-[1px]"
            aria-label="메뉴 닫기"
            onClick={() => setMenuOpen(false)}
          />
          <Sidebar
            currentPage={currentPage}
            onNavigate={handleNavigate}
            className="relative z-10 h-full w-[min(280px,88vw)] shadow-2xl animate-slide-in-left"
            onClose={() => setMenuOpen(false)}
          />
        </div>
      )}

      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <MobileTopBar currentPage={currentPage} onOpenMenu={() => setMenuOpen(true)} />

        <div className="flex flex-1 min-h-0 overflow-hidden">
          <main
            className={`overflow-hidden flex flex-col min-w-0 ${
              isSchedule ? 'flex-[9] md:flex-[9]' : 'flex-1'
            }`}
          >
            {children}
          </main>
          {isSchedule && (
            <>
              <RightPanel className="hidden md:flex" />
              <MobileEmployeeDrawer />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
