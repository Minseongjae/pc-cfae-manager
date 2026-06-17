import { LogOut, Lock } from 'lucide-react';
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
  const { unlocked, logout, openUnlockDialog } = useAdminLockContext();

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
        title="관리자 로그아웃"
      >
        <LogOut size={iconSize} />
        {showLabel && '로그아웃'}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => openUnlockDialog()}
      className={`${btnClass} ${className}`}
      title="관리자 인증"
    >
      <Lock size={iconSize} />
      {showLabel && '관리자 인증'}
    </button>
  );
}
