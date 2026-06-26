export const SALES_CHANGED_EVENT = 'sales-changed';

export function formatSalesCurrency(amount: number): string {
  return `₩${amount.toLocaleString('ko-KR')}`;
}

export function monthKeyFromDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
