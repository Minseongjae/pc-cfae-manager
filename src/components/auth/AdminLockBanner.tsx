import { Lock } from 'lucide-react';
import { AdminLockButton } from '@/components/auth/AdminLockButton';

interface AdminLockBannerProps {
  message?: string;
}

export function AdminLockBanner({
  message = '잠금 상태입니다. 직원·근무표·급여 수정은 관리자 비밀번호 입력 후 가능합니다.',
}: AdminLockBannerProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 rounded-xl bg-stone-100/80 border border-stone-200 text-sm text-stone-600">
      <div className="flex items-start gap-2 flex-1 min-w-0">
        <Lock size={16} className="text-stone-500 shrink-0 mt-0.5" />
        <p className="text-xs md:text-sm leading-relaxed">{message}</p>
      </div>
      <AdminLockButton size="sm" className="shrink-0 self-start sm:self-center" />
    </div>
  );
}
