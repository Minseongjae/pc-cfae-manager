import type { VercelRequest, VercelResponse } from '@vercel/node';
import { readAllData, writeAllData } from '../server/sheets.js';
import type { AppDataPayload } from '../server/types.js';
import { ensureSheetsReady, setCors } from './_shared/init.js';

export const config = {
  maxDuration: 60,
};

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  setCors(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    await ensureSheetsReady();

    if (req.method === 'GET') {
      const data = await readAllData();
      res.status(200).json(data);
      return;
    }

    if (req.method === 'PUT') {
      const body = req.body as Omit<AppDataPayload, 'syncToken'>;
      const syncToken = await writeAllData(body);
      res.status(200).json({ ok: true, syncToken });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('api/data failed:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to access Google Sheets',
    });
  }
}
