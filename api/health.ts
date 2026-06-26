import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSheetsConfigStatus } from '../server/credentials.js';
import { setCors } from './_shared/init.js';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  setCors(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const config = getSheetsConfigStatus();

  res.status(200).json({
    ok: true,
    sheetsConfigured: config.configured,
    sheetId: process.env.GOOGLE_SHEETS_ID?.trim() || null,
    credentialMethod: config.credentialMethod,
    missing: config.configured ? [] : config.missing,
  });
}
