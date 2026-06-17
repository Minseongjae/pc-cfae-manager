import type { PurchaseOrderStatus } from '@/lib/appStorage';

export const PURCHASE_ORDERS_CHANGED_EVENT = 'purchase-orders-changed';

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
