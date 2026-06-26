import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, PackageCheck, ClipboardList, Pencil, Check, X } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  deletePurchaseOrder,
  getPurchaseOrderCategories,
  getPurchaseOrders,
  savePurchaseOrder,
  savePurchaseOrderCategoryName,
  updatePurchaseOrderStatus,
  type PurchaseOrder,
} from '@/lib/storage';
import type { PurchaseOrderStatus } from '@/lib/appStorage';
import { SETTINGS_CHANGED_EVENT } from '@/lib/appSettings';
import { DATA_SYNC_CHANGED_EVENT } from '@/lib/dataStore';
import {
  PURCHASE_ORDERS_CHANGED_EVENT,
  PURCHASE_STATUS_LABELS,
  PURCHASE_STATUS_STYLES,
  type PurchaseCategoryId,
  type PurchaseOrderCategory,
} from '@/lib/purchaseOrders';

type OrderFormState = {
  id?: string;
  productName: string;
  quantity: number;
  status: PurchaseOrderStatus;
  scheduledDate: string;
  note: string;
};

function createEmptyForm(): OrderFormState {
  return {
    productName: '',
    quantity: 1,
    status: 'scheduled',
    scheduledDate: '',
    note: '',
  };
}

export function PurchaseOrdersPage() {
  const [categories, setCategories] = useState<PurchaseOrderCategory[]>(() =>
    getPurchaseOrderCategories()
  );
  const [activeCategory, setActiveCategory] = useState<PurchaseCategoryId>('po-1');
  const [orders, setOrders] = useState<PurchaseOrder[]>(() => getPurchaseOrders('po-1'));
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<OrderFormState>(createEmptyForm);
  const [editingTabId, setEditingTabId] = useState<PurchaseCategoryId | null>(null);
  const [tabNameDraft, setTabNameDraft] = useState('');

  const refresh = useCallback(() => {
    setCategories(getPurchaseOrderCategories());
    setOrders([...getPurchaseOrders(activeCategory)]);
  }, [activeCategory]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const handler = () => refresh();
    window.addEventListener(PURCHASE_ORDERS_CHANGED_EVENT, handler);
    window.addEventListener(SETTINGS_CHANGED_EVENT, handler);
    window.addEventListener(DATA_SYNC_CHANGED_EVENT, handler);
    return () => {
      window.removeEventListener(PURCHASE_ORDERS_CHANGED_EVENT, handler);
      window.removeEventListener(SETTINGS_CHANGED_EVENT, handler);
      window.removeEventListener(DATA_SYNC_CHANGED_EVENT, handler);
    };
  }, [refresh]);

  const counts = useMemo(
    () => ({
      scheduled: orders.filter((o) => o.status === 'scheduled').length,
      ordered: orders.filter((o) => o.status === 'ordered').length,
      received: orders.filter((o) => o.status === 'received').length,
    }),
    [orders]
  );

  const activeCategoryLabel =
    categories.find((row) => row.id === activeCategory)?.name ?? activeCategory;

  const openCreateForm = () => {
    setForm(createEmptyForm());
    setShowForm(true);
  };

  const openEditForm = (order: PurchaseOrder) => {
    setForm({
      id: order.id,
      productName: order.productName,
      quantity: order.quantity,
      status: order.status,
      scheduledDate: order.scheduledDate,
      note: order.note,
    });
    setShowForm(true);
  };

  const handleSave = () => {
    if (!form.productName.trim()) return;
    savePurchaseOrder({
      id: form.id,
      categoryId: activeCategory,
      productName: form.productName,
      quantity: form.quantity,
      status: form.status,
      scheduledDate: form.scheduledDate,
      note: form.note,
    });
    setForm(createEmptyForm());
    setShowForm(false);
    refresh();
  };

  const handleStatusChange = (id: string, status: PurchaseOrderStatus) => {
    updatePurchaseOrderStatus(id, status);
    refresh();
  };

  const handleDelete = (order: PurchaseOrder) => {
    if (!window.confirm(`"${order.productName}" 발주를 삭제할까요?`)) return;
    deletePurchaseOrder(order.id);
    refresh();
  };

  const startTabRename = (category: PurchaseOrderCategory) => {
    setEditingTabId(category.id);
    setTabNameDraft(category.name);
  };

  const commitTabRename = () => {
    if (!editingTabId) return;
    savePurchaseOrderCategoryName(editingTabId, tabNameDraft);
    setEditingTabId(null);
    setTabNameDraft('');
    refresh();
  };

  const cancelTabRename = () => {
    setEditingTabId(null);
    setTabNameDraft('');
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <PageHeader
        title="발주 관리"
        subtitle={`${activeCategoryLabel} · 예정 ${counts.scheduled} · 완료 ${counts.ordered} · 입고 ${counts.received}`}
      >
        <button type="button" className="btn-primary touch-target" onClick={openCreateForm}>
          <Plus size={16} />
          발주 추가
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
                    <button
                      type="button"
                      className="btn-ghost p-1 touch-target"
                      onClick={commitTabRename}
                      aria-label="탭 이름 저장"
                    >
                      <Check size={14} />
                    </button>
                    <button
                      type="button"
                      className="btn-ghost p-1 touch-target"
                      onClick={cancelTabRename}
                      aria-label="탭 이름 취소"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveCategory(category.id);
                      setShowForm(false);
                    }}
                    className={`segment-item touch-segment shrink-0 flex items-center gap-1.5 ${
                      isActive ? 'segment-item-active' : ''
                    }`}
                  >
                    <span>{category.name}</span>
                    {isActive && (
                      <span
                        role="button"
                        tabIndex={0}
                        className="inline-flex p-0.5 rounded hover:bg-stone-200/80"
                        onClick={(e) => {
                          e.stopPropagation();
                          startTabRename(category);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.stopPropagation();
                            startTabRename(category);
                          }
                        }}
                        aria-label="탭 이름 변경"
                      >
                        <Pencil size={12} />
                      </span>
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-6 space-y-4">
        {showForm && (
          <div className="card p-4 md:p-5 space-y-3">
            <h3 className="text-sm font-semibold text-stone-700">
              {form.id ? '발주 수정' : '발주 등록'} · {activeCategoryLabel}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="block">
                <span className="label-caps block mb-2">상품명</span>
                <input
                  className="input-luxury"
                  value={form.productName}
                  onChange={(e) => setForm({ ...form, productName: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="label-caps block mb-2">수량</span>
                <input
                  className="input-luxury"
                  type="number"
                  min={1}
                  value={String(form.quantity)}
                  onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) || 1 })}
                />
              </label>
              <label className="block">
                <span className="label-caps block mb-2">예정일</span>
                <input
                  className="input-luxury"
                  type="date"
                  value={form.scheduledDate}
                  onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="label-caps block mb-2">메모</span>
                <input
                  className="input-luxury"
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                />
              </label>
            </div>
            <div className="flex gap-2">
              <button type="button" className="btn-primary touch-target" onClick={handleSave}>
                저장
              </button>
              <button
                type="button"
                className="btn-secondary touch-target"
                onClick={() => {
                  setShowForm(false);
                  setForm(createEmptyForm());
                }}
              >
                취소
              </button>
            </div>
          </div>
        )}

        {orders.length === 0 ? (
          <div className="card p-10 text-center text-sm text-stone-500">
            {activeCategoryLabel}에 등록된 발주가 없습니다.
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <div key={order.id} className="card p-4 md:p-5">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-stone-800 whitespace-nowrap truncate">
                      {order.productName}
                    </p>
                    <p className="text-sm text-stone-500 mt-1">
                      수량 {order.quantity}
                      {order.scheduledDate ? ` · 예정 ${order.scheduledDate}` : ''}
                    </p>
                    {order.note && <p className="text-xs text-stone-400 mt-1">{order.note}</p>}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-xs font-medium px-2.5 py-1 rounded-full ${PURCHASE_STATUS_STYLES[order.status]}`}
                    >
                      {PURCHASE_STATUS_LABELS[order.status]}
                    </span>
                    <button
                      type="button"
                      className="btn-ghost touch-target text-xs"
                      onClick={() => openEditForm(order)}
                    >
                      <Pencil size={14} />
                      수정
                    </button>
                    {order.status === 'scheduled' && (
                      <button
                        type="button"
                        className="btn-secondary touch-target text-xs"
                        onClick={() => handleStatusChange(order.id, 'ordered')}
                      >
                        <ClipboardList size={14} />
                        발주 완료
                      </button>
                    )}
                    {order.status === 'ordered' && (
                      <button
                        type="button"
                        className="btn-secondary touch-target text-xs"
                        onClick={() => handleStatusChange(order.id, 'received')}
                      >
                        <PackageCheck size={14} />
                        입고 완료
                      </button>
                    )}
                    {order.status !== 'received' && (
                      <button
                        type="button"
                        className="btn-ghost touch-target text-xs text-rose-600"
                        onClick={() => handleDelete(order)}
                      >
                        삭제
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
