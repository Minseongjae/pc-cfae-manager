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
  getEmployees,
  type EmployeeInput,
  type EmployeeRow,
} from '@/lib/storage';
import { EMPLOYEES_CHANGED_EVENT } from '@/lib/employees';
import { EmployeeModal } from '@/components/employees/EmployeeModal';

export type EmployeeModalMode = 'create' | 'edit';

interface EmployeesContextValue {
  employees: EmployeeRow[];
  version: number;
  refresh: () => void;
  createEmployee: (input: EmployeeInput) => void;
  updateEmployee: (id: number, input: EmployeeInput) => void;
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

  const createEmployee = useCallback(
    (input: EmployeeInput) => {
      setEmployees(createEmployeeInStorage(input));
      setVersion((v) => v + 1);
      setModalMode(null);
      setEditingEmployee(null);
    },
    []
  );

  const updateEmployee = useCallback(
    (id: number, input: EmployeeInput) => {
      setEmployees(updateEmployeeInStorage(id, input));
      setVersion((v) => v + 1);
      setModalMode(null);
      setEditingEmployee(null);
    },
    []
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
          onSave={(input) => {
            if (modalMode === 'create') {
              createEmployee(input);
            } else if (editingEmployee) {
              updateEmployee(editingEmployee.id, input);
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
