interface SalesChartProps {
  data: Array<{ day: number; amount: number }>;
  year: number;
  month: number;
}

export function SalesChart({ data, year, month }: SalesChartProps) {
  const max = Math.max(...data.map((item) => item.amount), 1);

  return (
    <div className="card p-4 md:p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-stone-700">
          {year}년 {month}월 일별 매출
        </h3>
      </div>
      <div className="overflow-x-auto">
        <div className="flex items-end gap-1 min-w-[640px] h-44 px-1">
          {data.map((item) => {
            const height = Math.max(4, Math.round((item.amount / max) * 100));
            return (
              <div key={item.day} className="flex-1 min-w-[14px] flex flex-col items-center gap-1">
                <div className="w-full flex items-end justify-center h-32">
                  <div
                    className="w-full max-w-[18px] rounded-t-md bg-stone-700/80"
                    style={{ height: `${height}%` }}
                    title={`${item.day}일: ₩${item.amount.toLocaleString('ko-KR')}`}
                  />
                </div>
                <span className="text-[10px] text-stone-400">{item.day}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
