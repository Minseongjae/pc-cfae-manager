import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { SalesChart } from '@/components/sales/SalesChart';
import {
  deleteSalesRecord,
  getMonthlySalesBreakdown,
  getMonthlySalesTotal,
  getSalesRecords,
  saveSalesRecord,
  type SalesRecord,
} from '@/lib/storage';
import { SALES_CHANGED_EVENT, formatSalesCurrency, dateKey } from '@/lib/sales';

export function SalesPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [records, setRecords] = useState<SalesRecord[]>(getSalesRecords);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(dateKey(now));

  useEffect(() => {
    const sync = () => setRecords(getSalesRecords());
    window.addEventListener(SALES_CHANGED_EVENT, sync);
    return () => window.removeEventListener(SALES_CHANGED_EVENT, sync);
  }, []);

  const monthTotal = useMemo(
    () => getMonthlySalesTotal(year, month),
    [records, year, month]
  );
  const chartData = useMemo(
    () => getMonthlySalesBreakdown(year, month),
    [records, year, month]
  );

  const monthRecords = useMemo(
    () =>
      records
        .filter((record) => record.date.startsWith(`${year}-${String(month).padStart(2, '0')}`))
        .sort((a, b) => b.date.localeCompare(a.date)),
    [records, year, month]
  );

  const handleAdd = () => {
    const parsed = Number(amount.replace(/,/g, ''));
    if (!date || !Number.isFinite(parsed) || parsed <= 0) return;
    saveSalesRecord({ date, amount: parsed, note });
    setAmount('');
    setNote('');
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <PageHeader title="매출 관리" subtitle={`${year}년 ${month}월 합계 ${formatSalesCurrency(monthTotal)}`}>
        <div className="flex items-center gap-2">
          <select
            className="input-luxury w-auto touch-target"
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {m}월
              </option>
            ))}
          </select>
          <select
            className="input-luxury w-auto touch-target"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {[year - 1, year, year + 1].map((y) => (
              <option key={y} value={y}>
                {y}년
              </option>
            ))}
          </select>
        </div>
      </PageHeader>

      <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-6 space-y-4 md:space-y-6">
        <div className="card p-4 md:p-5 space-y-3">
          <h3 className="text-sm font-semibold text-stone-700">일매출 입력</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <label className="block">
              <span className="label-caps block mb-2">날짜</span>
              <input className="input-luxury" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
            <label className="block md:col-span-1">
              <span className="label-caps block mb-2">매출액</span>
              <input
                className="input-luxury"
                inputMode="numeric"
                placeholder="예: 350000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </label>
            <label className="block md:col-span-2">
              <span className="label-caps block mb-2">메모</span>
              <input
                className="input-luxury"
                placeholder="선택 입력"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </label>
          </div>
          <button type="button" className="btn-primary touch-target" onClick={handleAdd}>
            <Plus size={16} />
            매출 저장
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
          <div className="card p-5">
            <p className="label-caps normal-case tracking-wide">월매출 합계</p>
            <p className="text-2xl font-semibold text-stone-800 mt-2">{formatSalesCurrency(monthTotal)}</p>
          </div>
          <div className="card p-5">
            <p className="label-caps normal-case tracking-wide">입력 건수</p>
            <p className="text-2xl font-semibold text-stone-800 mt-2">{monthRecords.length}건</p>
          </div>
          <div className="card p-5">
            <p className="label-caps normal-case tracking-wide">일평균</p>
            <p className="text-2xl font-semibold text-stone-800 mt-2">
              {formatSalesCurrency(Math.round(monthTotal / Math.max(monthRecords.length, 1)))}
            </p>
          </div>
        </div>

        <SalesChart data={chartData} year={year} month={month} />

        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-stone-200 text-sm font-semibold text-stone-700">
            이번 달 매출 내역
          </div>
          {monthRecords.length === 0 ? (
            <div className="p-8 text-center text-sm text-stone-500">매출 기록이 없습니다.</div>
          ) : (
            <div className="divide-y divide-stone-100">
              {monthRecords.map((record) => (
                <div key={record.id} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-stone-800">{record.date}</p>
                    {record.note && <p className="text-xs text-stone-400 mt-0.5">{record.note}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-semibold text-stone-700">
                      {formatSalesCurrency(record.amount)}
                    </span>
                    <button
                      type="button"
                      className="btn-ghost touch-target text-rose-600"
                      onClick={() => {
                        if (confirm('이 매출 기록을 삭제할까요?')) deleteSalesRecord(record.id);
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
