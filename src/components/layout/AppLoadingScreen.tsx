import { Loader2 } from 'lucide-react';

export function AppLoadingScreen() {
  return (
    <div className="h-full w-full flex items-center justify-center bg-stone-100">
      <div className="text-center space-y-3">
        <Loader2 className="mx-auto animate-spin text-amber-600" size={28} />
        <div>
          <p className="text-sm font-medium text-stone-700">Google Sheets 연결 중</p>
          <p className="text-xs text-stone-400 mt-1">데이터를 불러오고 있습니다...</p>
        </div>
      </div>
    </div>
  );
}
