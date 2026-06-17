import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  deleteInventoryItem,
  getInventoryItems,
  saveInventoryItem,
  type InventoryItem,
} from '@/lib/storage';
import { INVENTORY_CHANGED_EVENT, inventoryStatusLabel, isLowStock } from '@/lib/inventory';

const emptyForm = {
  name: '',
  currentStock: 0,
  minStock: 0,
  expiryDate: '',
};

export function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>(getInventoryItems);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    const sync = () => setItems(getInventoryItems());
    window.addEventListener(INVENTORY_CHANGED_EVENT, sync);
    return () => window.removeEventListener(INVENTORY_CHANGED_EVENT, sync);
  }, []);

  const lowStockCount = useMemo(() => items.filter(isLowStock).length, [items]);

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
      ...form,
    });
    setShowForm(false);
    setEditing(null);
    setForm(emptyForm);
  };

  const handleDelete = (id: string) => {
    if (!confirm('이 상품을 삭제할까요?')) return;
    deleteInventoryItem(id);
    setShowForm(false);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <PageHeader title="재고 관리" subtitle={`총 ${items.length}개 · 부족 ${lowStockCount}개`}>
        <button type="button" className="btn-primary touch-target" onClick={openCreate}>
          <Plus size={16} />
          상품 추가
        </button>
      </PageHeader>

      <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-6 space-y-4">
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
            {items.map((item) => (
              <div key={item.id} className="card p-4 md:p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-stone-800 whitespace-nowrap truncate">{item.name}</p>
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
            ))}
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
