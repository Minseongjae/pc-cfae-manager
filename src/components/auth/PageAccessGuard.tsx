import type { ReactNode } from 'react';
import type { PageId } from '@/types';
import { useAdminLock } from '@/hooks/useAdminLock';
import { requiresPageAuth, usesBlurGate } from '@/lib/pageAccess';
import { AdminBlurGate } from '@/components/auth/AdminBlurGate';
import { AdminPageGate } from '@/components/auth/AdminPageGate';

interface PageAccessGuardProps {
  pageId: PageId;
  children: ReactNode;
}

export function PageAccessGuard({ pageId, children }: PageAccessGuardProps) {
  const unlocked = useAdminLock();

  if (!requiresPageAuth(pageId) || unlocked) {
    return <>{children}</>;
  }

  if (usesBlurGate(pageId)) {
    return <AdminBlurGate>{children}</AdminBlurGate>;
  }

  return <AdminPageGate />;
}
