/**
 * Write a local-only env file for Railway CLI import.
 *
 * Usage:
 *   npx tsx scripts/write-railway-dotenv.ts path/to/service-account.json
 *   npx @railway/cli login
 *   npx @railway/cli link
 *   npx @railway/cli variables --set GOOGLE_SHEETS_ID=... (or use Raw Editor in dashboard)
 *
 * Output: .env.railway.local (gitignored)
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const inputPath = process.argv[2];
const sheetsId = process.env.GOOGLE_SHEETS_ID ?? '1sWB-yFHwaL3NF5Ury00zTqtJdBxRNGGfNLczbtcQRkA';

if (!inputPath) {
  console.error('Usage: npx tsx scripts/write-railway-dotenv.ts <service-account.json>');
  process.exit(1);
}

const resolved = path.resolve(inputPath);
if (!fs.existsSync(resolved)) {
  console.error(`File not found: ${resolved}`);
  process.exit(1);
}

const raw = fs.readFileSync(resolved, 'utf8');
const parsed = JSON.parse(raw) as { client_email?: string; private_key?: string };
if (!parsed.client_email || !parsed.private_key) {
  console.error('JSON must include client_email and private_key.');
  process.exit(1);
}

const apiKey = crypto.randomBytes(24).toString('hex');
const minifiedJson = JSON.stringify(JSON.parse(raw));
const outPath = path.resolve('.env.railway.local');

const lines = [
  `GOOGLE_SHEETS_ID=${sheetsId}`,
  `GOOGLE_SERVICE_ACCOUNT_JSON=${minifiedJson}`,
  `API_KEY=${apiKey}`,
  '',
];

fs.writeFileSync(outPath, lines.join('\n'), 'utf8');

console.log(`Wrote ${outPath}`);
console.log('');
console.log('Next steps:');
console.log('  1. npx @railway/cli login');
console.log('  2. npx @railway/cli link');
console.log('  3. Railway dashboard → Variables → Raw Editor → paste contents of .env.railway.local');
console.log('     (or set each variable manually from that file)');
console.log('');
console.log(`Save for Vercel VITE_API_KEY: ${apiKey}`);
