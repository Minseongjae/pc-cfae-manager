import { getSheetsConfigStatus } from '../server/credentials.js';
import { initializeSheets } from '../server/sheets.js';

let initPromise: Promise<void> | null = null;

export async function ensureSheetsReady(): Promise<void> {
  const config = getSheetsConfigStatus();
  if (!config.configured) {
    throw new Error(
      `Google Sheets not configured: ${config.missing.join(', ') || 'missing env vars'}`
    );
  }

  if (!initPromise) {
    initPromise = initializeSheets().catch((error) => {
      initPromise = null;
      throw error;
    });
  }

  await initPromise;
}

export function setCors(res: { setHeader: (k: string, v: string) => void }): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
}
