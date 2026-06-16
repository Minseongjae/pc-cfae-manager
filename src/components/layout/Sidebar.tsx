import {
  CalendarDays,
  ClipboardCheck,
  Users,
  LayoutDashboard,
  Wallet,
  Settings,
  LogOut,
  Coffee,
} from 'lucide-react';
import type { PageId } from '@/types';
import { SyncStatusBadge } from '@/components/layout/SyncStatusBadge';

interface NavItem {
  id: PageId;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { id: 'schedule', label: '근무 스케줄', icon: <CalendarDays size={18} strokeWidth={1.75} /> },
  { id: 'payroll', label: '급여 관리', icon: <Wallet size={18} strokeWidth={1.75} /> },
  { id: 'employees', label: '직원 관리', icon: <Users size={18} strokeWidth={1.75} /> },
  { id: 'actual-work', label: '실근무 관리', icon: <ClipboardCheck size={18} strokeWidth={1.75} /> },
  { id: 'dashboard', label: '대시보드', icon: <LayoutDashboard size={18} strokeWidth={1.75} /> },
  { id: 'settings', label: '설정', icon: <Settings size={18} strokeWidth={1.75} /> },
];

interface SidebarProps {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
}

export function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  return (
    <aside className="w-[220px] h-full bg-white border-r border-stone-200/60 flex flex-col shrink-0 shadow-sm">
      <div className="px-5 py-6 border-b border-stone-200/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-stone-700 to-stone-600 flex items-center justify-center shadow-md">
            <Coffee className="text-stone-100" size={20} strokeWidth={1.75} />
          </div>
          <div>
            <h1 className="heading-display text-base leading-tight">1% PC&CAFE</h1>
            <p className="label-caps mt-0.5 normal-case tracking-wide text-stone-400 text-[10px]">
              Workforce
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-5 space-y-1">
        <p className="label-caps px-3 mb-3">Menu</p>
        {navItems.map((item) => {
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`nav-item ${isActive ? 'nav-item-active' : 'nav-item-inactive'}`}
            >
              <span className={isActive ? 'text-stone-700' : 'text-stone-400'}>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <SyncStatusBadge />

      <div className="px-3 pb-5">
        <button className="nav-item nav-item-inactive border border-stone-200/80">
          <LogOut size={18} strokeWidth={1.75} className="text-stone-400" />
          <span>로그아웃</span>
        </button>
      </div>
    </aside>
  );
}
