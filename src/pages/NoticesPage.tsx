import { useEffect, useState } from 'react';
import { Megaphone, Building2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { useSettings } from '@/contexts/SettingsContext';

export function NoticesPage() {
  const { settings } = useSettings();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const storeNotes = settings.store.notes.trim();
  const schoolSchedules = settings.schedule.schoolSchedules;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <PageHeader
        title="공지사항"
        subtitle={now.toLocaleDateString('ko-KR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          weekday: 'short',
        })}
      />

      <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-6 space-y-4 md:space-y-5">
        <section className="card p-5 md:p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Building2 size={18} className="text-stone-500" />
            <h2 className="text-sm font-semibold text-stone-800">매장 안내</h2>
          </div>

          <dl className="grid gap-3 text-sm">
            <div>
              <dt className="text-stone-400 text-xs mb-1">매장명</dt>
              <dd className="text-stone-800 font-medium">{settings.store.name || '1% PC&CAFE'}</dd>
            </div>
            {settings.store.businessHours && (
              <div>
                <dt className="text-stone-400 text-xs mb-1">영업시간</dt>
                <dd className="text-stone-700">{settings.store.businessHours}</dd>
              </div>
            )}
            {settings.store.phone && (
              <div>
                <dt className="text-stone-400 text-xs mb-1">연락처</dt>
                <dd className="text-stone-700">{settings.store.phone}</dd>
              </div>
            )}
            {settings.store.address && (
              <div>
                <dt className="text-stone-400 text-xs mb-1">주소</dt>
                <dd className="text-stone-700">{settings.store.address}</dd>
              </div>
            )}
          </dl>

          {storeNotes ? (
            <div className="rounded-xl bg-amber-50/80 border border-amber-100 px-4 py-3 text-sm text-stone-700 whitespace-pre-wrap">
              {storeNotes}
            </div>
          ) : (
            <p className="text-sm text-stone-400">등록된 매장 공지가 없습니다.</p>
          )}
        </section>

        <section className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-stone-200 flex items-center gap-2">
            <Megaphone size={18} className="text-stone-500" />
            <h2 className="text-sm font-semibold text-stone-800">학교 일정 안내</h2>
          </div>

          {schoolSchedules.length === 0 ? (
            <div className="p-8 text-center text-sm text-stone-400">
              등록된 학교 일정이 없습니다.
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
              {schoolSchedules.map((item, index) => (
                <div key={`${item.school}-${index}`} className="px-5 py-4">
                  <p className="text-sm font-medium text-stone-800">{item.school}</p>
                  <p className="text-sm text-stone-500 mt-1 whitespace-pre-wrap">{item.schedule}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
