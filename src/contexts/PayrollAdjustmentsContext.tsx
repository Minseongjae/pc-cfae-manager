import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { PayrollEntry, PayrollPeriod } from '@/lib/payroll';
import {
  getEmployeePayrollAdjustments,
  saveEmployeePayrollAdjustments,
} from '@/lib/storage';
import { PAYROLL_ADJUSTMENTS_CHANGED_EVENT, type PayrollAdjustments } from '@/lib/payrollAdjustments';
import { PayrollAdjustmentModal } from '@/components/payroll/PayrollAdjustmentModal';

interface EditTarget {
  entry: PayrollEntry;
  period: PayrollPeriod;
  periodKey: string;
  periodLabel: string;
}

interface PayrollAdjustmentsContextValue {
  version: number;
  openEdit: (target: EditTarget) => void;
}

const PayrollAdjustmentsContext = createContext<PayrollAdjustmentsContextValue | null>(
  null
);

export function PayrollAdjustmentsProvider({ children }: { children: ReactNode }) {
  const [version, setVersion] = useState(0);
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [initialAdjustments, setInitialAdjustments] = useState<PayrollAdjustments | null>(
    null
  );

  const bump = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    const handler = () => bump();
    window.addEventListener(PAYROLL_ADJUSTMENTS_CHANGED_EVENT, handler);
    return () => window.removeEventListener(PAYROLL_ADJUSTMENTS_CHANGED_EVENT, handler);
  }, [bump]);

  const openEdit = useCallback((target: EditTarget) => {
    setInitialAdjustments(
      getEmployeePayrollAdjustments(
        target.entry.employeeId,
        target.period,
        target.periodKey
      )
    );
    setEditTarget(target);
  }, []);

  const closeEdit = () => {
    setEditTarget(null);
    setInitialAdjustments(null);
  };

  const saveEdit = (adjustments: PayrollAdjustments) => {
    if (!editTarget) return;
    saveEmployeePayrollAdjustments(
      editTarget.entry.employeeId,
      editTarget.period,
      editTarget.periodKey,
      adjustments
    );
    closeEdit();
  };

  return (
    <PayrollAdjustmentsContext.Provider value={{ version, openEdit }}>
      {children}
      {editTarget && initialAdjustments && (
        <PayrollAdjustmentModal
          entry={editTarget.entry}
          period={editTarget.period}
          periodLabel={editTarget.periodLabel}
          initialAdjustments={initialAdjustments}
          onSave={saveEdit}
          onClose={closeEdit}
        />
      )}
    </PayrollAdjustmentsContext.Provider>
  );
}

export function usePayrollAdjustments(): PayrollAdjustmentsContextValue {
  const ctx = useContext(PayrollAdjustmentsContext);
  if (!ctx) {
    throw new Error('usePayrollAdjustments must be used within PayrollAdjustmentsProvider');
  }
  return ctx;
}
