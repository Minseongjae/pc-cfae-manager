import type { PageId } from '@/types';
import { hasAdminPasswordConfigured } from '@/lib/adminLockSession';

/** Pages viewable without admin authentication */
export const PUBLIC_PAGE_IDS: PageId[] = ['schedule', 'notices'];

/** Pages that require admin authentication */
export const PROTECTED_PAGE_IDS: PageId[] = [
  'dashboard',
  'employees',
  'actual-work',
  'payroll',
  'inventory',
  'purchase-orders',
  'sales',
  'settings',
];

/** Protected pages that show blurred preview before authentication */
export const BLUR_PROTECTED_PAGE_IDS: PageId[] = ['payroll', 'sales'];

export function requiresPageAuth(pageId: PageId): boolean {
  if (PUBLIC_PAGE_IDS.includes(pageId)) return false;
  if (pageId === 'settings' && !hasAdminPasswordConfigured()) return false;
  return PROTECTED_PAGE_IDS.includes(pageId);
}

export function usesBlurGate(pageId: PageId): boolean {
  return BLUR_PROTECTED_PAGE_IDS.includes(pageId);
}

export function isPublicPage(pageId: PageId): boolean {
  return !requiresPageAuth(pageId);
}
