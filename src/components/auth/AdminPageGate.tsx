import { useState, type FormEvent } from 'react';
import { Lock } from 'lucide-react';
import { unlockAdmin } from '@/lib/adminLockSession';

interface AdminPageGateProps {
  title?: string;
  description?: string;
}

export function AdminPageGate({
  title = '관리자 인증',
  description = '이 메뉴는 관리자 비밀번호 입력 후 이용할 수 있습니다.',
}: AdminPageGateProps) {
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
    <div className="flex-1 flex items-center justify-center bg-stone-50 px-4 md:px-6">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl border border-stone-200/80 shadow-sm p-6 md:p-8 space-y-6">
          <div className="text-center space-y-3">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-stone-100 flex items-center justify-center">
              <Lock className="text-stone-600" size={26} strokeWidth={1.75} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-stone-800">{title}</h2>
              <p className="text-sm text-stone-500 mt-1">{description}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="page-gate-password" className="label-caps block mb-2">
                비밀번호
              </label>
              <input
                id="page-gate-password"
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
            </div>

            {error && (
              <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">
                {error}
              </p>
            )}

            <button type="submit" disabled={submitting} className="btn-primary w-full touch-target">
              {submitting ? '확인 중…' : '관리자 모드 시작'}
            </button>
          </form>

          <p className="text-[11px] text-stone-400 text-center leading-relaxed">
            인증 후 8시간 동안 관리자 모드가 유지됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}
