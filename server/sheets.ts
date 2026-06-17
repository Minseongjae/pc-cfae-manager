import { google, type sheets_v4 } from 'googleapis';
import {
  getSheetsConfigStatus,
  loadServiceAccountCredentials,
} from './credentials.js';
import { HEADERS, SHEET_NAMES } from './schema.js';
import {
  attendanceFromRow,
  attendanceToRow,
  buildSettingsRows,
  computeSyncToken,
  employeeFromRow,
  employeeToRow,
  inventoryFromRow,
  inventoryToRow,
  parseSchoolSchedules,
  parseSettingsRows,
  payrollFromRow,
  payrollToRow,
  purchaseOrderFromRow,
  purchaseOrderToRow,
  salesFromRow,
  salesToRow,
  scheduleFromRow,
  scheduleToRow,
} from './mappers.js';
import type { AppDataPayload, AppSettingsPayload } from './types.js';

const EMPTY_APP_SETTINGS: AppSettingsPayload = {
  store: {},
  payroll: {},
  schedule: { schoolSchedules: [] },
  positions: [],
  shiftTypes: [],
  theme: {},
  security: {},
};

function createSheetsClient(): sheets_v4.Sheets {
  const { email, key } = loadServiceAccountCredentials();
  const sheetId = process.env.GOOGLE_SHEETS_ID;

  if (!email || !key || !sheetId) {
    throw new Error(
      'Missing Google Sheets configuration. Set GOOGLE_SHEETS_ID and either GOOGLE_SERVICE_ACCOUNT_JSON, GOOGLE_APPLICATION_CREDENTIALS (local file path), or GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_PRIVATE_KEY.'
    );
  }

  const auth = new google.auth.JWT({
    email,
    key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return google.sheets({ version: 'v4', auth });
}

function sheetId(): string {
  const id = process.env.GOOGLE_SHEETS_ID;
  if (!id) throw new Error('GOOGLE_SHEETS_ID is not configured');
  return id;
}

async function getSheetIdByName(
  sheets: sheets_v4.Sheets,
  title: string
): Promise<number | null> {
  const response = await sheets.spreadsheets.get({ spreadsheetId: sheetId() });
  const match = response.data.sheets?.find((sheet) => sheet.properties?.title === title);
  return match?.properties?.sheetId ?? null;
}

async function ensureSheetExists(sheets: sheets_v4.Sheets, title: string): Promise<void> {
  const existing = await getSheetIdByName(sheets, title);
  if (existing !== null) return;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: sheetId(),
    requestBody: {
      requests: [{ addSheet: { properties: { title } } }],
    },
  });
}

async function readRows(sheets: sheets_v4.Sheets, tabName: string): Promise<string[][]> {
  const range = `${tabName}!A:Z`;
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId(),
    range,
  });
  const values = response.data.values ?? [];
  if (values.length <= 1) return [];
  return values.slice(1).map((row) => row.map((cell) => String(cell ?? '')));
}

async function writeSheet(
  sheets: sheets_v4.Sheets,
  tabName: string,
  headers: readonly string[],
  rows: string[][]
): Promise<void> {
  const numericSheetId = await getSheetIdByName(sheets, tabName);
  if (numericSheetId === null) return;

  await sheets.spreadsheets.values.clear({
    spreadsheetId: sheetId(),
    range: `${tabName}!A:Z`,
  });

  const values: string[][] = [Array.from(headers), ...rows];
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId(),
    range: `${tabName}!A1`,
    valueInputOption: 'RAW',
    requestBody: { values },
  });
}

async function sheetHasHeaders(
  sheets: sheets_v4.Sheets,
  tabName: string,
  headers: readonly string[]
): Promise<boolean> {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId(),
    range: `${tabName}!A1:Z1`,
  });
  const row = (response.data.values?.[0] ?? []).map((cell) => String(cell ?? ''));
  return headers.every((header, index) => row[index] === header);
}

async function ensureSheetWithHeaders(
  sheets: sheets_v4.Sheets,
  tabName: string,
  headers: readonly string[],
  defaultRows: string[][] = []
): Promise<void> {
  await ensureSheetExists(sheets, tabName);
  const hasHeaders = await sheetHasHeaders(sheets, tabName, headers);
  if (!hasHeaders) {
    await writeSheet(sheets, tabName, headers, defaultRows);
  }
}

export async function initializeSheets(): Promise<void> {
  const sheets = createSheetsClient();

  await ensureSheetWithHeaders(sheets, SHEET_NAMES.employees, HEADERS.employees);
  await ensureSheetWithHeaders(sheets, SHEET_NAMES.schedules, HEADERS.schedules);
  await ensureSheetWithHeaders(sheets, SHEET_NAMES.attendance, HEADERS.attendance);
  await ensureSheetWithHeaders(sheets, SHEET_NAMES.payroll, HEADERS.payroll);
  await ensureSheetWithHeaders(sheets, SHEET_NAMES.settings, HEADERS.settings, [
    ['school_schedules', '[]', new Date().toISOString()],
    ['app_settings', '{}', new Date().toISOString()],
  ]);
  await ensureSheetWithHeaders(sheets, SHEET_NAMES.inventory, HEADERS.inventory);
  await ensureSheetWithHeaders(sheets, SHEET_NAMES.purchaseOrders, HEADERS.purchaseOrders);
  await ensureSheetWithHeaders(sheets, SHEET_NAMES.sales, HEADERS.sales);
}

export async function readAllData(): Promise<AppDataPayload> {
  const sheets = createSheetsClient();

  const [
    employeeRows,
    scheduleRows,
    attendanceRows,
    payrollRows,
    settingsRows,
    inventoryRows,
    purchaseRows,
    salesRows,
  ] = await Promise.all([
    readRows(sheets, SHEET_NAMES.employees),
    readRows(sheets, SHEET_NAMES.schedules),
    readRows(sheets, SHEET_NAMES.attendance),
    readRows(sheets, SHEET_NAMES.payroll),
    readRows(sheets, SHEET_NAMES.settings),
    readRows(sheets, SHEET_NAMES.inventory),
    readRows(sheets, SHEET_NAMES.purchaseOrders),
    readRows(sheets, SHEET_NAMES.sales),
  ]);

  const employees = employeeRows
    .map((row) => employeeFromRow([...HEADERS.employees], row))
    .filter((row): row is NonNullable<typeof row> => row !== null);

  const scheduleShifts = scheduleRows
    .map((row) => scheduleFromRow([...HEADERS.schedules], row))
    .filter((row): row is NonNullable<typeof row> => row !== null);

  const actualWorkRecords = attendanceRows
    .map((row) => attendanceFromRow([...HEADERS.attendance], row))
    .filter((row): row is NonNullable<typeof row> => row !== null);

  const payrollAdjustmentRecords = payrollRows
    .map((row) => payrollFromRow([...HEADERS.payroll], row))
    .filter((row): row is NonNullable<typeof row> => row !== null);

  const inventoryItems = inventoryRows
    .map((row) => inventoryFromRow([...HEADERS.inventory], row))
    .filter((row): row is NonNullable<typeof row> => row !== null);

  const purchaseOrders = purchaseRows
    .map((row) => purchaseOrderFromRow([...HEADERS.purchaseOrders], row))
    .filter((row): row is NonNullable<typeof row> => row !== null);

  const salesRecords = salesRows
    .map((row) => salesFromRow([...HEADERS.sales], row))
    .filter((row): row is NonNullable<typeof row> => row !== null);

  const schoolSchedulesSetting = settingsRows.find((row) => row[0] === 'school_schedules');
  const legacySchoolSchedules = parseSchoolSchedules(schoolSchedulesSetting?.[1] ?? '[]');
  const { schoolSchedules, appSettings } = parseSettingsRows(
    settingsRows,
    {
      ...EMPTY_APP_SETTINGS,
      schedule: { ...EMPTY_APP_SETTINGS.schedule, schoolSchedules: legacySchoolSchedules },
    }
  );

  const base = {
    employees,
    scheduleShifts,
    actualWorkRecords,
    payrollAdjustmentRecords,
    schoolSchedules: schoolSchedules.length ? schoolSchedules : legacySchoolSchedules,
    appSettings,
    inventoryItems,
    purchaseOrders,
    salesRecords,
  };

  return {
    ...base,
    syncToken: computeSyncToken(base),
  };
}

export async function writeAllData(payload: Omit<AppDataPayload, 'syncToken'>): Promise<string> {
  const sheets = createSheetsClient();
  const now = new Date().toISOString();

  const employees = payload.employees.map((employee) => ({
    ...employee,
    updatedAt: employee.updatedAt || now,
  }));
  const scheduleShifts = payload.scheduleShifts.map((shift) => ({
    ...shift,
    updatedAt: shift.updatedAt || now,
  }));
  const actualWorkRecords = payload.actualWorkRecords.map((record) => ({
    ...record,
    updatedAt: record.updatedAt || now,
  }));
  const payrollAdjustmentRecords = payload.payrollAdjustmentRecords.map((record) => ({
    ...record,
    updatedAt: record.updatedAt || now,
  }));
  const inventoryItems = payload.inventoryItems.map((item) => ({
    ...item,
    updatedAt: item.updatedAt || now,
  }));
  const purchaseOrders = payload.purchaseOrders.map((order) => ({
    ...order,
    updatedAt: order.updatedAt || now,
  }));
  const salesRecords = payload.salesRecords.map((record) => ({
    ...record,
    updatedAt: record.updatedAt || now,
  }));

  await Promise.all([
    writeSheet(
      sheets,
      SHEET_NAMES.employees,
      HEADERS.employees,
      employees.map(employeeToRow)
    ),
    writeSheet(
      sheets,
      SHEET_NAMES.schedules,
      HEADERS.schedules,
      scheduleShifts.map(scheduleToRow)
    ),
    writeSheet(
      sheets,
      SHEET_NAMES.attendance,
      HEADERS.attendance,
      actualWorkRecords.map(attendanceToRow)
    ),
    writeSheet(
      sheets,
      SHEET_NAMES.payroll,
      HEADERS.payroll,
      payrollAdjustmentRecords.map(payrollToRow)
    ),
    writeSheet(
      sheets,
      SHEET_NAMES.settings,
      HEADERS.settings,
      buildSettingsRows({
        schoolSchedules: payload.schoolSchedules,
        appSettings: payload.appSettings,
      })
    ),
    writeSheet(
      sheets,
      SHEET_NAMES.inventory,
      HEADERS.inventory,
      inventoryItems.map(inventoryToRow)
    ),
    writeSheet(
      sheets,
      SHEET_NAMES.purchaseOrders,
      HEADERS.purchaseOrders,
      purchaseOrders.map(purchaseOrderToRow)
    ),
    writeSheet(sheets, SHEET_NAMES.sales, HEADERS.sales, salesRecords.map(salesToRow)),
  ]);

  return computeSyncToken({
    employees,
    scheduleShifts,
    actualWorkRecords,
    payrollAdjustmentRecords,
    schoolSchedules: payload.schoolSchedules,
    appSettings: payload.appSettings,
    inventoryItems,
    purchaseOrders,
    salesRecords,
  });
}

export function isSheetsConfigured(): boolean {
  return getSheetsConfigStatus().configured;
}

export { getSheetsConfigStatus };
