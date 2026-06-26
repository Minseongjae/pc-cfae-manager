import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, AlertTriangle, Check, X } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  deleteInventoryItem,
  getInventoryCategories,
  getInventoryItems,
  renameInventoryItem,
  saveInventoryCategoryName,
  saveInventoryItem,
  type InventoryItem,
} from '@/lib/storage';
import { INVENTORY_CHANGED_EVENT, inventoryStatusLabel, isLowStock } from '@/lib/inventory';
import { SETTINGS_CHANGED_EVENT } from '@/lib/appSettings';
import { DATA_SYNC_CHANGED_EVENT } from '@/lib/dataStore';
import type { InventoryCategoryId, InventoryCategory } from '@/lib/inventoryCategories';

const emptyForm = {
  name: '',
  currentStock: 0,
  minStock: 0,
  expiryDate: '',
};

export function InventoryPage() {
  const [categories, setCategories] = useState<InventoryCategory[]>(() => getInventoryCategories());
  const [activeCategory, setActiveCategory] = useState<InventoryCategoryId>('inv-1');
  const [items, setItems] = useState<InventoryItem[]>(() => getInventoryItems('inv-1'));
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [editingTabId, setEditingTabId] = useState<InventoryCategoryId | null>(null);
  const [tabNameDraft, setTabNameDraft] = useState('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [itemNameDraft, setItemNameDraft] = useState('');

  const refresh = useCallback(() => {
    setCategories(getInventoryCategories());
    setItems([...getInventoryItems(activeCategory)]);
  }, [activeCategory]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const handler = () => refresh();
    window.addEventListener(INVENTORY_CHANGED_EVENT, handler);
    window.addEventListener(SETTINGS_CHANGED_EVENT, handler);
    window.addEventListener(DATA_SYNC_CHANGED_EVENT, handler);
    return () => {
      window.removeEventListener(INVENTORY_CHANGED_EVENT, handler);
      window.removeEventListener(SETTINGS_CHANGED_EVENT, handler);
      window.removeEventListener(DATA_SYNC_CHANGED_EVENT, handler);
    };
  }, [refresh]);

  const lowStockCount = useMemo(() => items.filter(isLowStock).length, [items]);

  const activeCategoryLabel =
    categories.find((row) => row.id === activeCategory)?.name ?? activeCategory;

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const aLow = isLowStock(a) ? 0 : 1;
      const bLow = isLowStock(b) ? 0 : 1;
      if (aLow !== bLow) return aLow - bLow;
      return a.name.localeCompare(b.name, 'ko');
    });
  }, [items]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (item: InventoryItem) => {
    setEditing(item);
    setForm({
      name: item.name,
      currentStock: item.currentStock,
      minStock: item.minStock,
      expiryDate: item.expiryDate,
    });
    setShowForm(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    saveInventoryItem({
      id: editing?.id,
      categoryId: editing?.categoryId ?? activeCategory,
      ...form,
    });
    setShowForm(false);
    setEditing(null);
    setForm(emptyForm);
    refresh();
  };

  const handleDelete = (id: string) => {
    if (!confirm('이 상품을 삭제할까요?')) return;
    deleteInventoryItem(id);
    setShowForm(false);
    refresh();
  };

  const startTabRename = (category: InventoryCategory) => {
    setEditingTabId(category.id);
    setTabNameDraft(category.name);
  };

  const commitTabRename = () => {
    if (!editingTabId) return;
    saveInventoryCategoryName(editingTabId, tabNameDraft);
    setEditingTabId(null);
    setTabNameDraft('');
    refresh();
  };

  const cancelTabRename = () => {
    setEditingTabId(null);
    setTabNameDraft('');
  };

  const startItemRename = (item: InventoryItem) => {
    setEditingItemId(item.id);
    setItemNameDraft(item.name);
  };

  const commitItemRename = () => {
    if (!editingItemId) return;
    const updated = renameInventoryItem(editingItemId, itemNameDraft);
    if (updated) {
      setEditingItemId(null);
      setItemNameDraft('');
      refresh();
    }
  };

  const cancelItemRename = () => {
    setEditingItemId(null);
    setItemNameDraft('');
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <PageHeader
        title="재고 관리"
        subtitle={`${activeCategoryLabel} · 총 ${items.length}개 · 부족 ${lowStockCount}개`}
      >
        <button type="button" className="btn-primary touch-target" onClick={openCreate}>
          <Plus size={16} />
          상품 추가
        </button>
      </PageHeader>

      <div className="shrink-0 px-4 md:px-6 pt-3 border-b border-stone-200/80 bg-white/80">
        <div className="flex gap-2 overflow-x-auto pb-3 -mx-1 px-1">
          {categories.map((category) => {
            const isActive = category.id === activeCategory;
            const isEditing = editingTabId === category.id;

            return (
              <div key={category.id} className="flex items-center gap-1 shrink-0">
                {isEditing ? (
                  <div className="flex items-center gap-1 bg-stone-100 rounded-xl px-2 py-1.5">
                    <input
                      className="input-luxury text-xs w-[7.5rem] md:w-28 py-1.5"
                      value={tabNameDraft}
                      onChange={(e) => setTabNameDraft(e.target.value)}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitTabRename();
                        if (e.key === 'Escape') cancelTabRename();
                      }}
                    />
                    <button type="button" className="p-1 text-emerald-600" onClick={commitTabRename}>
                      <Check size={14} />
                    </button>
                    <button type="button" className="p-1 text-stone-400" onClick={cancelTabRename}>
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-colors touch-target ${
                      isActive
                        ? 'bg-stone-800 text-white shadow-sm'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                    onClick={() => setActiveCategory(category.id)}
                    onDoubleClick={() => startTabRename(category)}
                  >
                    {category.name}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-6 space-y-4">
        {lowStockCount > 0 && (
          <div className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 flex items-start gap-3">
            <AlertTriangle size={18} className="text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-rose-800">
                재고 부족 {lowStockCount}개 항목
              </p>
              <p className="text-xs text-rose-700 mt-0.5">
                최소 재고 이하 상품이 상단에 표시됩니다. 발주를 검토해 주세요.
              </p>
            </div>
          </div>
        )}

        {showForm && (
          <div className="card p-4 md:p-5 space-y-3">
            <h3 className="text-sm font-semibold text-stone-700">
              {editing ? '상품 수정' : '상품 추가'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="상품명" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
              <Field
                label="현재 재고"
                type="number"
                value={String(form.currentStock)}
                onChange={(v) => setForm({ ...form, currentStock: Number(v) || 0 })}
              />
              <Field
                label="최소 재고"
                type="number"
                value={String(form.minStock)}
                onChange={(v) => setForm({ ...form, minStock: Number(v) || 0 })}
              />
              <Field
                label="유통기한"
                type="date"
                value={form.expiryDate}
                onChange={(v) => setForm({ ...form, expiryDate: v })}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-primary touch-target" onClick={handleSave}>
                저장
              </button>
              <button type="button" className="btn-secondary touch-target" onClick={() => setShowForm(false)}>
                취소
              </button>
              {editing && (
                <button type="button" className="btn-secondary touch-target text-rose-600" onClick={() => handleDelete(editing.id)}>
                  삭제
                </button>
              )}
            </div>
          </div>
        )}

        {items.length === 0 ? (
          <div className="card p-10 text-center text-sm text-stone-500">등록된 재고가 없습니다.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
            {sortedItems.map((item) => {
              const low = isLowStock(item);
              return (
              <div
                key={item.id}
                className={`card p-4 md:p-5 space-y-3 ${
                  low ? 'border-rose-400 bg-rose-50/70 ring-1 ring-rose-200' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    {editingItemId === item.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          className="input-luxury text-sm py-1.5 flex-1 min-w-0"
                          value={itemNameDraft}
                          onChange={(e) => setItemNameDraft(e.target.value)}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') commitItemRename();
                            if (e.key === 'Escape') cancelItemRename();
                          }}
                        />
                        <button type="button" className="p-1 text-emerald-600 shrink-0" onClick={commitItemRename}>
                          <Check size={14} />
                        </button>
                        <button type="button" className="p-1 text-stone-400 shrink-0" onClick={cancelItemRename}>
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <p
                        className="font-semibold text-stone-800 whitespace-nowrap truncate cursor-text"
                        title="더블클릭하여 이름 수정"
                        onDoubleClick={() => startItemRename(item)}
                      >
                        {item.name}
                      </p>
                    )}
                    <p className="text-xs text-stone-400 mt-1">
                      유통기한 {item.expiryDate || '미입력'}
                    </p>
                  </div>
                  {isLowStock(item) ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 shrink-0">
                      <AlertTriangle size={12} />
                      재고 부족
                    </span>
                  ) : (
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 shrink-0">
                      {inventoryStatusLabel(item)}
                    </span>
                  )}
                </div>
                <dl className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <dt className="text-stone-400 text-xs">현재 재고</dt>
                    <dd className="font-semibold text-stone-800">{item.currentStock}</dd>
                  </div>
                  <div>
                    <dt className="text-stone-400 text-xs">최소 재고</dt>
                    <dd className="font-semibold text-stone-800">{item.minStock}</dd>
                  </div>
                </dl>
                <button type="button" className="btn-secondary w-full touch-target justify-center" onClick={() => openEdit(item)}>
                  <Pencil size={15} />
                  수정
                </button>
              </div>
            );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="label-caps block mb-2">{label}</span>
      <input className="input-luxury" type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
