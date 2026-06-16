import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import {
  getSheetsConfigStatus,
  initializeSheets,
  readAllData,
  writeAllData,
} from './sheets.js';
import type { AppDataPayload } from './types.js';

const PORT = Number(process.env.PORT ?? 3001);
const API_KEY = process.env.API_KEY ?? '';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

function requireApiKey(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): void {
  if (!API_KEY) {
    next();
    return;
  }
  const provided = req.header('x-api-key');
  if (provided !== API_KEY) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}

app.get('/api/health', (_req, res) => {
  const config = getSheetsConfigStatus();
  res.json({
    ok: true,
    sheetsConfigured: config.configured,
    sheetId: process.env.GOOGLE_SHEETS_ID ?? null,
    credentialMethod: config.credentialMethod,
    missing: config.configured ? [] : config.missing,
  });
});

app.get('/api/data', requireApiKey, async (_req, res) => {
  try {
    const data = await readAllData();
    res.json(data);
  } catch (error) {
    console.error('GET /api/data failed:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to read Google Sheets',
    });
  }
});

app.put('/api/data', requireApiKey, async (req, res) => {
  try {
    const body = req.body as Omit<AppDataPayload, 'syncToken'>;
    const syncToken = await writeAllData(body);
    res.json({ ok: true, syncToken });
  } catch (error) {
    console.error('PUT /api/data failed:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to write Google Sheets',
    });
  }
});

async function start(): Promise<void> {
  const config = getSheetsConfigStatus();
  if (!config.configured) {
    console.warn('Google Sheets is not configured. Missing:');
    for (const item of config.missing) {
      console.warn(`  - ${item}`);
    }
    console.warn(
      'On Railway, set GOOGLE_SHEETS_ID and GOOGLE_SERVICE_ACCOUNT_JSON (do not use GOOGLE_APPLICATION_CREDENTIALS).'
    );
  } else {
    await initializeSheets();
    console.log(`Google Sheets initialized (${config.credentialMethod})`);
  }

  app.listen(PORT, () => {
    console.log(`API server listening on http://localhost:${PORT}`);
  });
}

start().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
