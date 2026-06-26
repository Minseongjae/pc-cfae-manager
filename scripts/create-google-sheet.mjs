import fs from 'node:fs';
import { google } from 'googleapis';

const title = process.argv[2] ?? 'Blaze 창신점 Manager';
const saPath =
  process.env.GOOGLE_APPLICATION_CREDENTIALS ??
  'C:/Users/pc/Downloads/pro-cafe-manager-0d03cf04ab83.json';

const raw = JSON.parse(fs.readFileSync(saPath, 'utf8'));
const auth = new google.auth.GoogleAuth({
  credentials: raw,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
const sheets = google.sheets({ version: 'v4', auth });

const created = await sheets.spreadsheets.create({
  requestBody: {
    properties: { title },
    sheets: [
      { properties: { title: 'Employees' } },
      { properties: { title: 'Schedule' } },
      { properties: { title: 'Attendance' } },
      { properties: { title: 'Payroll' } },
      { properties: { title: 'Settings' } },
    ],
  },
});

const sheetId = created.data.spreadsheetId;
if (!sheetId) {
  throw new Error('Failed to create spreadsheet');
}

console.log(
  JSON.stringify(
    {
      title,
      sheetId,
      url: created.data.spreadsheetUrl ?? `https://docs.google.com/spreadsheets/d/${sheetId}/edit`,
    },
    null,
    2
  )
);
