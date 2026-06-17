import type { ReactNode } from 'react';
import type { PageId } from '@/types';
import { useAdminLockContext } from '@/contexts/AdminLockContext';
import { AdminPageGate } from '@/components/auth/AdminPageGate';

interface PageAccessGuardProps {
  pageId: PageId;
  children: ReactNode;
}

export function PageAccessGuard({ pageId, children }: PageAccessGuardProps) {
  const { canAccessPage } = useAdminLockContext();

  if (canAccessPage(pageId)) {
    return <>{children}</>;
  }

  return <AdminPageGate pageId={pageId} />;
}
