import { useState, useCallback } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { EmployeesProvider } from '@/contexts/EmployeesContext';
import { DragGuardProvider } from '@/contexts/DragGuardContext';
import { DataSyncProvider } from '@/contexts/DataSyncContext';
import { SettingsProvider } from '@/contexts/SettingsContext';
import { AdminLockProvider, useAdminLockContext } from '@/contexts/AdminLockContext';
import { PageAccessGuard } from '@/components/auth/PageAccessGuard';
import { DashboardPage } from '@/pages/DashboardPage';
import { SchedulePage } from '@/pages/SchedulePage';
import { NoticesPage } from '@/pages/NoticesPage';
import { EmployeesPage } from '@/pages/EmployeesPage';
import { PayrollPage } from '@/pages/PayrollPage';
import { ActualWorkProvider } from '@/contexts/ActualWorkContext';
import { PayrollAdjustmentsProvider } from '@/contexts/PayrollAdjustmentsContext';
import { ActualWorkPage } from '@/pages/ActualWorkPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { InventoryPage } from '@/pages/InventoryPage';
import { PurchaseOrdersPage } from '@/pages/PurchaseOrdersPage';
import { SalesPage } from '@/pages/SalesPage';
import type { PageId } from '@/types';

const pages: Record<PageId, React.ComponentType> = {
  dashboard: DashboardPage,
  schedule: SchedulePage,
  notices: NoticesPage,
  employees: EmployeesPage,
  payroll: PayrollPage,
  'actual-work': ActualWorkPage,
  inventory: InventoryPage,
  'purchase-orders': PurchaseOrdersPage,
  sales: SalesPage,
  settings: SettingsPage,
};

function AppContent() {
  const [currentPage, setCurrentPage] = useState<PageId>('schedule');
  const { requestPageNavigation } = useAdminLockContext();
  const PageComponent = pages[currentPage];

  const handleNavigate = useCallback(
    (page: PageId) => {
      requestPageNavigation(page, () => setCurrentPage(page));
    },
    [requestPageNavigation]
  );

  return (
    <AppLayout currentPage={currentPage} onNavigate={handleNavigate}>
      <PageAccessGuard pageId={currentPage}>
        <PageComponent />
      </PageAccessGuard>
    </AppLayout>
  );
}

export default function App() {
  return (
    <DragGuardProvider>
      <DataSyncProvider>
        <SettingsProvider>
          <AdminLockProvider>
            <EmployeesProvider>
              <ActualWorkProvider>
                <PayrollAdjustmentsProvider>
                  <AppContent />
                </PayrollAdjustmentsProvider>
              </ActualWorkProvider>
            </EmployeesProvider>
          </AdminLockProvider>
        </SettingsProvider>
      </DataSyncProvider>
    </DragGuardProvider>
  );
}
