import { useState, type FormEvent } from 'react';
import { Lock } from 'lucide-react';
import { ModalOverlay } from '@/components/ui/ModalOverlay';
import { unlockAdmin } from '@/lib/adminLockSession';

interface AdminUnlockDialogProps {
  open: boolean;
  onClose: () => void;
  onUnlocked?: () => void;
  title?: string;
  sessionHours?: number;
}

export function AdminUnlockDialog({
  open,
  onClose,
  onUnlocked,
  title = '관리자 인증',
  sessionHours = 8,
}: AdminUnlockDialogProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const handleClose = () => {
    setPassword('');
    setError('');
    onClose();
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    const result = await unlockAdmin(password);
    setSubmitting(false);

    if (result.ok) {
      setPassword('');
      setError('');
      onUnlocked?.();
      onClose();
      return;
    }

    setError(result.message);
    setPassword('');
  };

  return (
    <ModalOverlay onClose={handleClose}>
      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xl w-full max-w-sm p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-stone-100 flex items-center justify-center shrink-0">
            <Lock className="text-stone-600" size={20} strokeWidth={1.75} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-stone-800">{title}</h2>
            <p className="text-xs text-stone-500 mt-0.5">관리자 비밀번호를 입력하세요</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="admin-unlock-password" className="label-caps block mb-2">
              비밀번호
            </label>
            <input
              id="admin-unlock-password"
              type="password"
              autoComplete="current-password"
              className="input-luxury"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError('');
              }}
              placeholder="비밀번호 입력"
              autoFocus
            />
          </div>

          {error && (
            <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-2">
            <button type="button" onClick={handleClose} className="btn-secondary flex-1">
              취소
            </button>
            <button type="submit" disabled={submitting} className="btn-primary flex-1">
              {submitting ? '확인 중…' : '관리자 모드 시작'}
            </button>
          </div>
        </form>

        <p className="text-[11px] text-stone-400 text-center leading-relaxed">
          인증 후 {sessionHours}시간 동안 관리자 모드가 유지됩니다.
        </p>
      </div>
    </ModalOverlay>
  );
}
