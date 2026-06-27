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

const READ_CACHE_TTL_MS = 45_000;
const TAB_NAMES = Object.values(SHEET_NAMES);

let sheetTitleToId: Map<string, number> | null = null;
let dataReadCache: { payload: AppDataPayload; expiresAt: number } | null = null;

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

async function loadSpreadsheetMeta(sheets: sheets_v4.Sheets): Promise<Map<string, number>> {
  if (sheetTitleToId) return sheetTitleToId;
  const response = await sheets.spreadsheets.get({
    spreadsheetId: sheetId(),
    fields: 'sheets.properties(title,sheetId)',
  });
  sheetTitleToId = new Map();
  for (const sheet of response.data.sheets ?? []) {
    const title = sheet.properties?.title;
    const id = sheet.properties?.sheetId;
    if (title && id != null) sheetTitleToId.set(title, id);
  }
  return sheetTitleToId;
}

async function getSheetIdByName(
  sheets: sheets_v4.Sheets,
  title: string
): Promise<number | null> {
  const meta = await loadSpreadsheetMeta(sheets);
  return meta.get(title) ?? null;
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

function valuesToDataRows(values: string[][] | null | undefined): string[][] {
  const rows = values ?? [];
  if (rows.length <= 1) return [];
  return rows.slice(1).map((row) => row.map((cell) => String(cell ?? '')));
}

async function batchReadTabs(
  sheets: sheets_v4.Sheets
): Promise<Record<(typeof TAB_NAMES)[number], string[][]>> {
  const ranges = TAB_NAMES.map((name) => `${name}!A:Z`);
  const response = await sheets.spreadsheets.values.batchGet({
    spreadsheetId: sheetId(),
    ranges,
  });
  const result = {} as Record<(typeof TAB_NAMES)[number], string[][]>;
  const valueRanges = response.data.valueRanges ?? [];
  TAB_NAMES.forEach((name, index) => {
    result[name] = valuesToDataRows(valueRanges[index]?.values as string[][] | undefined);
  });
  return result;
}

function invalidateReadCache(): void {
  dataReadCache = null;
}

export async function readSyncToken(): Promise<string> {
  const sheets = createSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId(),
    range: `${SHEET_NAMES.settings}!A:B`,
  });
  const rows = response.data.values ?? [];
  const tokenRow = rows.find((row) => row[0] === 'sync_token');
  if (tokenRow?.[1]) return String(tokenRow[1]);

  const payload = await readAllData({ bypassCache: true });
  return payload.syncToken;
}


async function writeSheet(
  sheets: sheets_v4.Sheets,
  tabName: string,
  headers: readonly string[],
  rows: string[][]
): Promise<void> {
  const numericSheetId = await getSheetIdByName(sheets, tabName);
  if (numericSheetId === null) return;

  const values: string[][] = [Array.from(headers), ...rows];
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId(),
    range: `${tabName}!A1`,
    valueInputOption: 'RAW',
    requestBody: { values },
  });

  const trailingStart = values.length + 1;
  await sheets.spreadsheets.values.clear({
    spreadsheetId: sheetId(),
    range: `${tabName}!A${trailingStart}:Z`,
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
    ['notices', '[]', new Date().toISOString()],
  ]);
  await ensureSheetWithHeaders(sheets, SHEET_NAMES.inventory, HEADERS.inventory);
  await ensureSheetWithHeaders(sheets, SHEET_NAMES.purchaseOrders, HEADERS.purchaseOrders);
  await ensureSheetWithHeaders(sheets, SHEET_NAMES.sales, HEADERS.sales);
}

export async function readAllData(options?: {
  bypassCache?: boolean;
}): Promise<AppDataPayload> {
  if (!options?.bypassCache && dataReadCache && Date.now() < dataReadCache.expiresAt) {
    return dataReadCache.payload;
  }

  const sheets = createSheetsClient();
  const tabData = await batchReadTabs(sheets);
  const employeeRows = tabData[SHEET_NAMES.employees];
  const scheduleRows = tabData[SHEET_NAMES.schedules];
  const attendanceRows = tabData[SHEET_NAMES.attendance];
  const payrollRows = tabData[SHEET_NAMES.payroll];
  const settingsRows = tabData[SHEET_NAMES.settings];
  const inventoryRows = tabData[SHEET_NAMES.inventory];
  const purchaseRows = tabData[SHEET_NAMES.purchaseOrders];
  const salesRows = tabData[SHEET_NAMES.sales];

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
  const { schoolSchedules, appSettings, notices } = parseSettingsRows(
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
    notices: Array.isArray(notices) ? notices : [],
  };

  const payload = {
    ...base,
    syncToken: computeSyncToken(base),
  };

  dataReadCache = {
    payload,
    expiresAt: Date.now() + READ_CACHE_TTL_MS,
  };

  return payload;
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

  const syncToken = computeSyncToken({
    employees,
    scheduleShifts,
    actualWorkRecords,
    payrollAdjustmentRecords,
    schoolSchedules: payload.schoolSchedules,
    appSettings: payload.appSettings,
    inventoryItems,
    purchaseOrders,
    salesRecords,
    notices: payload.notices ?? [],
  });

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
        notices: payload.notices ?? [],
        syncToken,
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

  invalidateReadCache();

  return syncToken;
}

export function isSheetsConfigured(): boolean {
  return getSheetsConfigStatus().configured;
}

export { getSheetsConfigStatus };
