import 'dotenv/config';
import { initializeSheets, isSheetsConfigured, readAllData } from '../server/sheets.js';

async function main(): Promise<void> {
  console.log('Checking Google Sheets configuration...\n');

  if (!isSheetsConfigured()) {
    console.error('Missing configuration. Set in .env:');
    console.error('  GOOGLE_SHEETS_ID=1sWB-yFHwaL3NF5Ury00zTqtJdBxRNGGfNLczbtcQRkA');
    console.error('  GOOGLE_APPLICATION_CREDENTIALS=./credentials/google-service-account.json');
    console.error('    OR');
    console.error('  GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_PRIVATE_KEY');
    process.exit(1);
  }

  console.log(`Sheet ID: ${process.env.GOOGLE_SHEETS_ID}`);

  await initializeSheets();
  console.log('Sheets initialized (Employees, Schedule, Attendance, Payroll, Settings)');

  const data = await readAllData();
  console.log('\nData summary:');
  console.log(`  Employees:  ${data.employees.length}`);
  console.log(`  Schedule:     ${data.scheduleShifts.length}`);
  console.log(`  Attendance:   ${data.actualWorkRecords.length}`);
  console.log(`  Payroll:      ${data.payrollAdjustmentRecords.length}`);
  console.log(`  Sync token:   ${data.syncToken}`);
  console.log('\nGoogle Sheets connection OK.');
}

main().catch((error) => {
  console.error('\nVerification failed:');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
