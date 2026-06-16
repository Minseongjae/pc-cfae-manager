import { useState } from 'react';
import { LockKeyhole } from 'lucide-react';

interface LoginScreenProps {
  onLogin: (password: string) => boolean;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!password.trim()) {
      setError('비밀번호를 입력하세요.');
      return;
    }

    if (!onLogin(password)) {
      setError('비밀번호가 올바르지 않습니다.');
      setPassword('');
      return;
    }
  };

  return (
    <div className="h-full w-full flex items-center justify-center bg-stone-100 p-6">
      <div className="card-elevated w-full max-w-md p-8 shadow-xl">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-900 text-white">
            <LockKeyhole size={24} />
          </div>
          <h1 className="heading-display text-xl text-stone-800">1% PC&CAFE Manager</h1>
          <p className="text-sm text-stone-500 mt-2">비밀번호를 입력하여 앱에 접속하세요.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="app-lock-password"
              className="label-caps normal-case tracking-wide block mb-2"
            >
              비밀번호
            </label>
            <input
              id="app-lock-password"
              type="password"
              autoComplete="current-password"
              autoFocus
              className="input-luxury"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError('');
              }}
              placeholder="비밀번호 입력"
            />
          </div>

          {error && (
            <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button type="submit" className="btn-primary w-full justify-center">
            로그인
          </button>
        </form>

        <p className="text-[11px] text-stone-400 text-center mt-6">
          로그인 상태는 이 기기에 30일간 유지됩니다.
        </p>
      </div>
    </div>
  );
}
