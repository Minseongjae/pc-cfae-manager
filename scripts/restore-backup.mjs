import fs from 'node:fs';

const BASE = process.argv[2] ?? 'https://pc-cafe-manager.vercel.app';
const backupPath = process.argv[3] ?? 'C:/Users/pc/Downloads/1pc-cafe-backup-2026-06-17.json';

const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
const now = new Date().toISOString();

const payload = {
  employees: backup.employees.map((e) => ({ ...e, updatedAt: now })),
  scheduleShifts: backup.scheduleShifts.map((s) => ({ ...s, updatedAt: now })),
  actualWorkRecords: (backup.actualWorkRecords ?? []).map((r) => ({
    id: r.id,
    employeeId: r.employeeId,
    employeeName: r.employeeName,
    date: r.date,
    shiftId: r.shiftId,
    scheduledStart: r.scheduledStart,
    scheduledEnd: r.scheduledEnd,
    actualStart: r.actualStart,
    actualEnd: r.actualEnd,
    status: r.status,
    modificationReason: r.modificationReason,
    isManuallyEdited: r.isManuallyEdited,
    updatedAt: r.updatedAt || now,
  })),
  payrollAdjustmentRecords: backup.payrollAdjustmentRecords ?? [],
  schoolSchedules: backup.appSettings?.schedule?.schoolSchedules ?? [],
  appSettings: backup.appSettings,
  inventoryItems: (backup.inventoryItems ?? []).map((i) => ({
    ...i,
    updatedAt: i.updatedAt || now,
  })),
  purchaseOrders: backup.purchaseOrders ?? [],
  salesRecords: backup.salesRecords ?? [],
  notices: backup.notices ?? [],
};

console.log(
  'Restoring:',
  payload.employees.length,
  'employees,',
  payload.scheduleShifts.length,
  'shifts,',
  payload.actualWorkRecords.length,
  'work records'
);

const putRes = await fetch(`${BASE}/api/data`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});
const putBody = await putRes.json();
console.log('PUT', putRes.status, putBody);
if (!putRes.ok) process.exit(1);

const verifyRes = await fetch(`${BASE}/api/data`);
const verify = await verifyRes.json();
console.log(
  'VERIFY employees',
  verify.employees?.length,
  'shifts',
  verify.scheduleShifts?.length,
  'work',
  verify.actualWorkRecords?.length
);
console.log('VERIFY hireDate sample', verify.employees?.[0]?.hireDate);
