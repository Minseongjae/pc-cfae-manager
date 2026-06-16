import { Sidebar } from './Sidebar';
import { RightPanel } from './RightPanel';
import type { PageId } from '@/types';

interface AppLayoutProps {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
  children: React.ReactNode;
}

export function AppLayout({ currentPage, onNavigate, children }: AppLayoutProps) {
  const isSchedule = currentPage === 'schedule';

  return (
    <div className="flex h-screen w-screen overflow-hidden app-shell">
      <Sidebar currentPage={currentPage} onNavigate={onNavigate} />
      <main
        className={`overflow-hidden flex flex-col min-w-0 ${
          isSchedule ? 'flex-[9]' : 'flex-1'
        }`}
      >
        {children}
      </main>
      {isSchedule && <RightPanel />}
    </div>
  );
}
