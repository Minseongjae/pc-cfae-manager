import type { PageId } from '@/types';
import {
  CalendarDays,
  ClipboardCheck,
  Users,
  LayoutDashboard,
  Wallet,
  Settings,
  Package,
  ClipboardList,
  Banknote,
  Megaphone,
  type LucideIcon,
} from 'lucide-react';
import { requiresPageAuth } from '@/lib/pageAccess';

export interface NavItemConfig {
  id: PageId;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItemConfig[] = [
  { id: 'schedule', label: '근무 스케줄', icon: CalendarDays },
  { id: 'notices', label: '공지사항', icon: Megaphone },
  { id: 'dashboard', label: '대시보드', icon: LayoutDashboard },
  { id: 'employees', label: '직원 관리', icon: Users },
  { id: 'actual-work', label: '실근무 관리', icon: ClipboardCheck },
  { id: 'payroll', label: '급여 관리', icon: Wallet },
  { id: 'sales', label: '매출 관리', icon: Banknote },
  { id: 'inventory', label: '재고 관리', icon: Package },
  { id: 'purchase-orders', label: '발주 관리', icon: ClipboardList },
  { id: 'settings', label: '설정', icon: Settings },
];

export function isNavItemLocked(pageId: PageId, adminUnlocked: boolean): boolean {
  return requiresPageAuth(pageId) && !adminUnlocked;
}
