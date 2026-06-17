import { Lock, LockOpen } from 'lucide-react';
import { useAdminLockContext } from '@/contexts/AdminLockContext';

interface AdminLockButtonProps {
  className?: string;
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

export function AdminLockButton({
  className = '',
  size = 'md',
  showLabel = true,
}: AdminLockButtonProps) {
  const { unlocked, lock, openUnlockDialog } = useAdminLockContext();

  const iconSize = size === 'sm' ? 14 : 16;
  const btnClass =
    size === 'sm'
      ? 'btn-ghost text-xs py-1.5 px-2.5 gap-1.5'
      : 'btn-secondary text-sm gap-2';

  if (unlocked) {
    return (
      <button
        type="button"
        onClick={lock}
        className={`${btnClass} ${className}`}
        title="관리자 잠금"
      >
        <LockOpen size={iconSize} />
        {showLabel && '잠금'}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => openUnlockDialog()}
      className={`${btnClass} ${className}`}
      title="관리자 잠금 해제"
    >
      <Lock size={iconSize} />
      {showLabel && '잠금 해제'}
    </button>
  );
}
