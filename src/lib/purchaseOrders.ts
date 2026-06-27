import type { PurchaseOrderStatus } from '@/lib/appStorage';

export const PURCHASE_ORDERS_CHANGED_EVENT = 'purchase-orders-changed';

export const PURCHASE_CATEGORY_IDS = ['po-1', 'po-2', 'po-3', 'po-4'] as const;
export type PurchaseCategoryId = (typeof PURCHASE_CATEGORY_IDS)[number];

export interface PurchaseOrderCategory {
  id: PurchaseCategoryId;
  name: string;
  sortOrder: number;
}

export const DEFAULT_PURCHASE_ORDER_CATEGORIES: PurchaseOrderCategory[] = [
  { id: 'po-1', name: '발주관리1', sortOrder: 0 },
  { id: 'po-2', name: '발주관리2', sortOrder: 1 },
  { id: 'po-3', name: '발주관리3', sortOrder: 2 },
  { id: 'po-4', name: '발주관리4', sortOrder: 3 },
];

export const PURCHASE_STATUS_LABELS: Record<PurchaseOrderStatus, string> = {
  scheduled: '발주 예정',
  ordered: '발주 완료',
  received: '입고 완료',
};

export const PURCHASE_STATUS_STYLES: Record<PurchaseOrderStatus, string> = {
  scheduled: 'bg-amber-50 text-amber-700',
  ordered: 'bg-sky-50 text-sky-700',
  received: 'bg-emerald-50 text-emerald-700',
};

export function migratePurchaseOrderCategories(
  input: PurchaseOrderCategory[] | undefined
): PurchaseOrderCategory[] {
  const known = new Set((input ?? []).map((row) => row.id));
  const merged = [...(input ?? [])];

  for (const fallback of DEFAULT_PURCHASE_ORDER_CATEGORIES) {
    if (!known.has(fallback.id)) {
      merged.push({ ...fallback });
      known.add(fallback.id);
    }
  }

  return merged
    .filter((row): row is PurchaseOrderCategory =>
      PURCHASE_CATEGORY_IDS.includes(row.id as PurchaseCategoryId)
    )
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((row, index) => ({ ...row, sortOrder: index }));
}

export function normalizePurchaseCategoryId(categoryId: string | undefined): PurchaseCategoryId {
  if (categoryId && PURCHASE_CATEGORY_IDS.includes(categoryId as PurchaseCategoryId)) {
    return categoryId as PurchaseCategoryId;
  }
  return 'po-1';
}
