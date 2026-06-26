import fs from 'node:fs';
import { google } from 'googleapis';

const title = process.argv[2] ?? 'Blaze 창신점 Manager';
const sourceSheetId =
  process.argv[3] ?? process.env.GOOGLE_SHEETS_ID ?? '1sWB-yFHwaL3NF5Ury00zTqtJdBxRNGGfNLczbtcQRkA';
const saPath =
  process.env.GOOGLE_APPLICATION_CREDENTIALS ??
  'C:/Users/pc/Downloads/pro-cafe-manager-0d03cf04ab83.json';

const raw = JSON.parse(fs.readFileSync(saPath, 'utf8'));
const auth = new google.auth.GoogleAuth({
  credentials: raw,
  scopes: ['https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/spreadsheets'],
});
const drive = google.drive({ version: 'v3', auth });
const sheets = google.sheets({ version: 'v4', auth });

const copied = await drive.files.copy({
  fileId: sourceSheetId,
  requestBody: { name: title },
});

const sheetId = copied.data.id;
if (!sheetId) {
  throw new Error('Failed to copy spreadsheet');
}

for (const tab of ['Employees', 'Schedule', 'Attendance', 'Payroll', 'Settings']) {
  try {
    await sheets.spreadsheets.values.clear({
      spreadsheetId: sheetId,
      range: `${tab}!A:Z`,
    });
  } catch {
    // tab may not exist yet — API will create on first save
  }
}

console.log(
  JSON.stringify(
    {
      title,
      sheetId,
      url: `https://docs.google.com/spreadsheets/d/${sheetId}/edit`,
    },
    null,
    2
  )
);
