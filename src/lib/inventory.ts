import type { InventoryItem } from '@/lib/appStorage';

export const INVENTORY_CHANGED_EVENT = 'inventory-changed';

export function isLowStock(item: InventoryItem): boolean {
  return item.currentStock < item.minStock;
}

export function inventoryStatusLabel(item: InventoryItem): string {
  if (isLowStock(item)) return '재고 부족';
  return '정상';
}
