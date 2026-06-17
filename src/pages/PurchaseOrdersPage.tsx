import { useEffect, useMemo, useState } from 'react';
import { Plus, PackageCheck, ClipboardList } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  deletePurchaseOrder,
  getPurchaseOrders,
  savePurchaseOrder,
  updatePurchaseOrderStatus,
  type PurchaseOrder,
} from '@/lib/storage';
import type { PurchaseOrderStatus } from '@/lib/appStorage';
import {
  PURCHASE_ORDERS_CHANGED_EVENT,
  PURCHASE_STATUS_LABELS,
  PURCHASE_STATUS_STYLES,
} from '@/lib/purchaseOrders';

const emptyForm = {
  productName: '',
  quantity: 1,
  status: 'scheduled' as PurchaseOrderStatus,
  scheduledDate: '',
  note: '',
};

export function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>(getPurchaseOrders);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    const sync = () => setOrders(getPurchaseOrders());
    window.addEventListener(PURCHASE_ORDERS_CHANGED_EVENT, sync);
    return () => window.removeEventListener(PURCHASE_ORDERS_CHANGED_EVENT, sync);
  }, []);

  const counts = useMemo(
    () => ({
      scheduled: orders.filter((o) => o.status === 'scheduled').length,
      ordered: orders.filter((o) => o.status === 'ordered').length,
      received: orders.filter((o) => o.status === 'received').length,
    }),
    [orders]
  );

  const handleSave = () => {
    if (!form.productName.trim()) return;
    savePurchaseOrder(form);
    setForm(emptyForm);
    setShowForm(false);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <PageHeader
        title="발주 관리"
        subtitle={`예정 ${counts.scheduled} · 완료 ${counts.ordered} · 입고 ${counts.received}`}
      >
        <button type="button" className="btn-primary touch-target" onClick={() => setShowForm(true)}>
          <Plus size={16} />
          발주 추가
        </button>
      </PageHeader>

      <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-6 space-y-4">
        {showForm && (
          <div className="card p-4 md:p-5 space-y-3">
            <h3 className="text-sm font-semibold text-stone-700">발주 등록</h3>
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
              <button type="button" className="btn-secondary touch-target" onClick={() => setShowForm(false)}>
                취소
              </button>
            </div>
          </div>
        )}

        {orders.length === 0 ? (
          <div className="card p-10 text-center text-sm text-stone-500">등록된 발주가 없습니다.</div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <div key={order.id} className="card p-4 md:p-5">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="min-w-0">
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
                    {order.status === 'scheduled' && (
                      <button
                        type="button"
                        className="btn-secondary touch-target text-xs"
                        onClick={() => updatePurchaseOrderStatus(order.id, 'ordered')}
                      >
                        <ClipboardList size={14} />
                        발주 완료
                      </button>
                    )}
                    {order.status === 'ordered' && (
                      <button
                        type="button"
                        className="btn-secondary touch-target text-xs"
                        onClick={() => updatePurchaseOrderStatus(order.id, 'received')}
                      >
                        <PackageCheck size={14} />
                        입고 완료
                      </button>
                    )}
                    {order.status !== 'received' && (
                      <button
                        type="button"
                        className="btn-ghost touch-target text-xs text-rose-600"
                        onClick={() => {
                          if (confirm('발주를 삭제할까요?')) deletePurchaseOrder(order.id);
                        }}
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
