import { useState, type FormEvent } from 'react';
import { Lock, type LucideIcon } from 'lucide-react';
import { unlockAdmin } from '@/lib/adminLockSession';

interface AdminLockScreenProps {
  title: string;
  description: string;
  icon: LucideIcon;
  onUnlock?: () => void;
}

export function AdminLockScreen({
  title,
  description,
  icon: Icon,
  onUnlock,
}: AdminLockScreenProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (unlockAdmin(password)) {
      setError('');
      onUnlock?.();
      return;
    }
    setError('비밀번호가 올바르지 않습니다.');
    setPassword('');
  };

  return (
    <div className="flex-1 flex items-center justify-center bg-stone-50 px-6">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl border border-stone-200/80 shadow-sm p-8 space-y-6">
          <div className="text-center space-y-3">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-stone-100 flex items-center justify-center">
              <Icon className="text-stone-600" size={26} strokeWidth={1.75} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-stone-800">{title}</h2>
              <p className="text-sm text-stone-500 mt-1">관리자 비밀번호를 입력하세요</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="admin-password" className="label-caps block mb-2">
                비밀번호
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
                />
                <input
                  id="admin-password"
                  type="password"
                  autoComplete="current-password"
                  className="input-luxury pl-10"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="비밀번호 입력"
                  autoFocus
                />
              </div>
            </div>

            {error && (
              <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">
                {error}
              </p>
            )}

            <button type="submit" className="btn-primary w-full">
              확인
            </button>
          </form>

          <p className="text-[11px] text-stone-400 text-center leading-relaxed">
            {description}
            <br />
            브라우저를 닫으면 다시 잠깁니다.
          </p>
        </div>
      </div>
    </div>
  );
}
