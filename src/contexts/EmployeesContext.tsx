import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  createEmployee as createEmployeeInStorage,
  updateEmployee as updateEmployeeInStorage,
  deleteEmployee as deleteEmployeeInStorage,
  saveEmployeeScheduleColor,
  getEmployees,
  type EmployeeRow,
} from '@/lib/storage';
import { EMPLOYEES_CHANGED_EVENT } from '@/lib/employees';
import { EmployeeModal, type EmployeeSavePayload } from '@/components/employees/EmployeeModal';

export type EmployeeModalMode = 'create' | 'edit';

interface EmployeesContextValue {
  employees: EmployeeRow[];
  version: number;
  refresh: () => void;
  createEmployee: (payload: EmployeeSavePayload) => void;
  updateEmployee: (id: number, payload: EmployeeSavePayload) => void;
  deleteEmployee: (id: number) => void;
  openCreate: () => void;
  openEdit: (employee: EmployeeRow) => void;
  closeModal: () => void;
}

const EmployeesContext = createContext<EmployeesContextValue | null>(null);

export function EmployeesProvider({ children }: { children: ReactNode }) {
  const [employees, setEmployees] = useState<EmployeeRow[]>(() => getEmployees());
  const [version, setVersion] = useState(0);
  const [modalMode, setModalMode] = useState<EmployeeModalMode | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeRow | null>(null);

  const refresh = useCallback(() => {
    setEmployees(getEmployees());
    setVersion((v) => v + 1);
  }, []);

  useEffect(() => {
    const handler = () => refresh();
    window.addEventListener(EMPLOYEES_CHANGED_EVENT, handler);
    return () => window.removeEventListener(EMPLOYEES_CHANGED_EVENT, handler);
  }, [refresh]);

  const applyScheduleColor = useCallback(
    (employeeId: number, payload: EmployeeSavePayload, employee?: EmployeeRow) => {
      if (payload.useDefaultScheduleColor) {
        saveEmployeeScheduleColor(employeeId, null, employee ?? payload.input);
        return;
      }
      saveEmployeeScheduleColor(employeeId, payload.scheduleColor, employee ?? payload.input);
    },
    []
  );

  const createEmployee = useCallback(
    (payload: EmployeeSavePayload) => {
      const list = createEmployeeInStorage(payload.input);
      const created = list[list.length - 1];
      if (created) {
        applyScheduleColor(created.id, payload, created);
      }
      setEmployees(getEmployees());
      setVersion((v) => v + 1);
      setModalMode(null);
      setEditingEmployee(null);
    },
    [applyScheduleColor]
  );

  const updateEmployee = useCallback(
    (id: number, payload: EmployeeSavePayload) => {
      updateEmployeeInStorage(id, payload.input);
      applyScheduleColor(id, payload, { ...payload.input, id });
      setEmployees(getEmployees());
      setVersion((v) => v + 1);
      setModalMode(null);
      setEditingEmployee(null);
    },
    [applyScheduleColor]
  );

  const deleteEmployee = useCallback((id: number) => {
    setEmployees(deleteEmployeeInStorage(id));
    setVersion((v) => v + 1);
    setModalMode(null);
    setEditingEmployee(null);
  }, []);

  const openCreate = useCallback(() => {
    setModalMode('create');
    setEditingEmployee(null);
  }, []);

  const openEdit = useCallback((employee: EmployeeRow) => {
    setModalMode('edit');
    setEditingEmployee(employee);
  }, []);

  const closeModal = useCallback(() => {
    setModalMode(null);
    setEditingEmployee(null);
  }, []);

  const value = useMemo(
    () => ({
      employees,
      version,
      refresh,
      createEmployee,
      updateEmployee,
      deleteEmployee,
      openCreate,
      openEdit,
      closeModal,
    }),
    [
      employees,
      version,
      refresh,
      createEmployee,
      updateEmployee,
      deleteEmployee,
      openCreate,
      openEdit,
      closeModal,
    ]
  );

  return (
    <EmployeesContext.Provider value={value}>
      {children}
      {modalMode && (
        <EmployeeModal
          mode={modalMode}
          employee={editingEmployee}
          onSave={(payload) => {
            if (modalMode === 'create') {
              createEmployee(payload);
            } else if (editingEmployee) {
              updateEmployee(editingEmployee.id, payload);
            }
          }}
          onDelete={
            modalMode === 'edit' && editingEmployee
              ? () => deleteEmployee(editingEmployee.id)
              : undefined
          }
          onClose={closeModal}
        />
      )}
    </EmployeesContext.Provider>
  );
}

export function useEmployees(): EmployeesContextValue {
  const ctx = useContext(EmployeesContext);
  if (!ctx) {
    throw new Error('useEmployees must be used within EmployeesProvider');
  }
  return ctx;
}
