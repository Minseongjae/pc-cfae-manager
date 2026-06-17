import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { EmployeesProvider } from '@/contexts/EmployeesContext';
import { DragGuardProvider } from '@/contexts/DragGuardContext';
import { DataSyncProvider } from '@/contexts/DataSyncContext';
import { SettingsProvider } from '@/contexts/SettingsContext';
import { AdminLockProvider } from '@/contexts/AdminLockContext';
import { DashboardPage } from '@/pages/DashboardPage';
import { SchedulePage } from '@/pages/SchedulePage';
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
  employees: EmployeesPage,
  payroll: PayrollPage,
  'actual-work': ActualWorkPage,
  inventory: InventoryPage,
  'purchase-orders': PurchaseOrdersPage,
  sales: SalesPage,
  settings: SettingsPage,
};

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageId>('schedule');
  const PageComponent = pages[currentPage];

  return (
    <DragGuardProvider>
      <DataSyncProvider>
        <SettingsProvider>
          <AdminLockProvider>
          <EmployeesProvider>
            <ActualWorkProvider>
              <PayrollAdjustmentsProvider>
                <AppLayout currentPage={currentPage} onNavigate={setCurrentPage}>
                  <PageComponent />
                </AppLayout>
              </PayrollAdjustmentsProvider>
            </ActualWorkProvider>
          </EmployeesProvider>
          </AdminLockProvider>
        </SettingsProvider>
      </DataSyncProvider>
    </DragGuardProvider>
  );
}
