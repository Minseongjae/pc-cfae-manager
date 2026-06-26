export const INVENTORY_CHANGED_EVENT = 'inventory-changed';

export const INVENTORY_CATEGORY_IDS = ['inv-1', 'inv-2', 'inv-3', 'inv-4'] as const;
export type InventoryCategoryId = (typeof INVENTORY_CATEGORY_IDS)[number];

export interface InventoryCategory {
  id: InventoryCategoryId;
  name: string;
  sortOrder: number;
}

export const DEFAULT_INVENTORY_CATEGORIES: InventoryCategory[] = [
  { id: 'inv-1', name: '재고관리1', sortOrder: 0 },
  { id: 'inv-2', name: '재고관리2', sortOrder: 1 },
  { id: 'inv-3', name: '재고관리3', sortOrder: 2 },
  { id: 'inv-4', name: '재고관리4', sortOrder: 3 },
];

export function migrateInventoryCategories(
  input: InventoryCategory[] | undefined
): InventoryCategory[] {
  const known = new Set((input ?? []).map((row) => row.id));
  const merged = [...(input ?? [])];

  for (const fallback of DEFAULT_INVENTORY_CATEGORIES) {
    if (!known.has(fallback.id)) {
      merged.push({ ...fallback });
      known.add(fallback.id);
    }
  }

  return merged
    .filter((row): row is InventoryCategory =>
      INVENTORY_CATEGORY_IDS.includes(row.id as InventoryCategoryId)
    )
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((row, index) => ({ ...row, sortOrder: index }));
}

export function normalizeInventoryCategoryId(categoryId: string | undefined): InventoryCategoryId {
  if (categoryId && INVENTORY_CATEGORY_IDS.includes(categoryId as InventoryCategoryId)) {
    return categoryId as InventoryCategoryId;
  }
  return 'inv-1';
}
