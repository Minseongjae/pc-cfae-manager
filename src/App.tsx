import { useState } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { EmployeesProvider } from '@/contexts/EmployeesContext';
import { DragGuardProvider } from '@/contexts/DragGuardContext';
import { DataSyncProvider } from '@/contexts/DataSyncContext';
import { SettingsProvider } from '@/contexts/SettingsContext';
import { DashboardPage } from '@/pages/DashboardPage';
import { SchedulePage } from '@/pages/SchedulePage';
import { EmployeesPage } from '@/pages/EmployeesPage';
import { PayrollPage } from '@/pages/PayrollPage';
import { ActualWorkProvider } from '@/contexts/ActualWorkContext';
import { PayrollAdjustmentsProvider } from '@/contexts/PayrollAdjustmentsContext';
import { ActualWorkPage } from '@/pages/ActualWorkPage';
import { SettingsPage } from '@/pages/SettingsPage';
import type { PageId } from '@/types';

const pages: Record<PageId, React.ComponentType> = {
  dashboard: DashboardPage,
  schedule: SchedulePage,
  employees: EmployeesPage,
  payroll: PayrollPage,
  'actual-work': ActualWorkPage,
  settings: SettingsPage,
};

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageId>('schedule');
  const PageComponent = pages[currentPage];

  return (
    <AuthProvider>
      <DragGuardProvider>
        <DataSyncProvider>
          <SettingsProvider>
            <EmployeesProvider>
              <ActualWorkProvider>
                <PayrollAdjustmentsProvider>
                  <AppLayout currentPage={currentPage} onNavigate={setCurrentPage}>
                    <PageComponent />
                  </AppLayout>
                </PayrollAdjustmentsProvider>
              </ActualWorkProvider>
            </EmployeesProvider>
          </SettingsProvider>
        </DataSyncProvider>
      </DragGuardProvider>
    </AuthProvider>
  );
}
