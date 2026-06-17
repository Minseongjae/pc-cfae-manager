import { useState, type FormEvent, type ReactNode } from 'react';
import { Lock } from 'lucide-react';
import { unlockAdmin } from '@/lib/adminLockSession';

interface AdminBlurGateProps {
  children: ReactNode;
  title?: string;
}

export function AdminBlurGate({
  children,
  title = '관리자 인증이 필요합니다',
}: AdminBlurGateProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    const result = await unlockAdmin(password);
    setSubmitting(false);

    if (result.ok) {
      setPassword('');
      setError('');
      return;
    }

    setError(result.message);
    setPassword('');
  };

  return (
    <div className="relative flex-1 flex flex-col overflow-hidden min-h-0">
      <div
        className="flex-1 flex flex-col overflow-hidden blur-md pointer-events-none select-none"
        aria-hidden
      >
        {children}
      </div>

      <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/50 backdrop-blur-[3px] p-4">
        <div className="w-full max-w-sm bg-white rounded-2xl border border-stone-200/80 shadow-xl p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-stone-100 flex items-center justify-center shrink-0">
              <Lock className="text-stone-600" size={20} strokeWidth={1.75} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-stone-800">{title}</h2>
              <p className="text-xs text-stone-500 mt-0.5">
                비밀번호 입력 후 내용을 확인하고 수정할 수 있습니다
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="password"
              autoComplete="current-password"
              className="input-luxury"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError('');
              }}
              placeholder="관리자 비밀번호"
              autoFocus
            />

            {error && (
              <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">
                {error}
              </p>
            )}

            <button type="submit" disabled={submitting} className="btn-primary w-full touch-target">
              {submitting ? '확인 중…' : '관리자 모드 시작'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
