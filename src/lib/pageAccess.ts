import type { PageId } from '@/types';
import type { AuthRole } from '@/lib/authSession';
import { hasAdminPasswordConfigured } from '@/lib/authSession';

/** Anyone can view (아르바이트 / 비로그인) */
export const PUBLIC_PAGE_IDS: PageId[] = ['schedule', 'notices'];

/** 직원 비밀번호 이상 */
export const EMPLOYEE_PAGE_IDS: PageId[] = ['inventory', 'purchase-orders'];

/** 관리자 비밀번호만 */
export const ADMIN_ONLY_PAGE_IDS: PageId[] = [
  'dashboard',
  'employees',
  'actual-work',
  'payroll',
  'sales',
  'settings',
];

export function getPageRequiredRole(pageId: PageId): AuthRole {
  if (PUBLIC_PAGE_IDS.includes(pageId)) return 'guest';
  if (EMPLOYEE_PAGE_IDS.includes(pageId)) return 'employee';
  return 'admin';
}

export function canAccessPage(pageId: PageId, role: AuthRole): boolean {
  if (pageId === 'settings' && !hasAdminPasswordConfigured()) return true;
  const required = getPageRequiredRole(pageId);
  if (required === 'guest') return true;
  if (required === 'employee') return role === 'employee' || role === 'admin';
  return role === 'admin';
}

export function isPageVisibleInNav(pageId: PageId, role: AuthRole): boolean {
  if (PUBLIC_PAGE_IDS.includes(pageId)) return true;
  if (EMPLOYEE_PAGE_IDS.includes(pageId)) return true;
  if (pageId === 'settings' && !hasAdminPasswordConfigured()) return true;
  return role === 'admin';
}

export function isNavItemLocked(pageId: PageId, role: AuthRole): boolean {
  return isPageVisibleInNav(pageId, role) && !canAccessPage(pageId, role);
}

export function requiresAdmin(pageId: PageId): boolean {
  return getPageRequiredRole(pageId) === 'admin';
}

/** @deprecated Use canAccessPage with role */
export function requiresPageAuth(pageId: PageId): boolean {
  return getPageRequiredRole(pageId) !== 'guest';
}

/** @deprecated Blur gate removed — menus are hidden by role */
export function usesBlurGate(_pageId: PageId): boolean {
  return false;
}

export function isPublicPage(pageId: PageId): boolean {
  return PUBLIC_PAGE_IDS.includes(pageId);
}

export function getRoleLabel(role: AuthRole): string {
  if (role === 'admin') return '관리자';
  if (role === 'employee') return '직원';
  return '조회';
}
