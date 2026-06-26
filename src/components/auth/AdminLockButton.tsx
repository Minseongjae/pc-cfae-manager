import { LogOut, Lock } from 'lucide-react';
import { useAdminLockContext } from '@/contexts/AdminLockContext';
import { getRoleLabel } from '@/lib/pageAccess';

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
  const { role, unlocked, logout, openUnlockDialog } = useAdminLockContext();

  const iconSize = size === 'sm' ? 14 : 16;
  const btnClass =
    size === 'sm'
      ? 'btn-ghost text-xs py-1.5 px-2.5 gap-1.5'
      : 'btn-secondary text-sm gap-2';

  if (unlocked) {
    return (
      <button
        type="button"
        onClick={logout}
        className={`${btnClass} ${className}`}
        title="로그아웃"
      >
        <LogOut size={iconSize} />
        {showLabel && `로그아웃 (${getRoleLabel(role)})`}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => openUnlockDialog()}
      className={`${btnClass} ${className}`}
      title="로그인"
    >
      <Lock size={iconSize} />
      {showLabel && '로그인'}
    </button>
  );
}
