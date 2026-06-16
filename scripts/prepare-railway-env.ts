/**
 * Print a minified service-account JSON string for Railway GOOGLE_SERVICE_ACCOUNT_JSON.
 *
 * Usage:
 *   npx tsx scripts/prepare-railway-env.ts path/to/service-account.json
 *
 * Copy the output into Railway → Variables → GOOGLE_SERVICE_ACCOUNT_JSON
 */
import fs from 'node:fs';
import path from 'node:path';

const inputPath = process.argv[2];

if (!inputPath) {
  console.error('Usage: npx tsx scripts/prepare-railway-env.ts <service-account.json>');
  process.exit(1);
}

const resolved = path.resolve(inputPath);
if (!fs.existsSync(resolved)) {
  console.error(`File not found: ${resolved}`);
  process.exit(1);
}

const raw = fs.readFileSync(resolved, 'utf8');
let parsed: unknown;

try {
  parsed = JSON.parse(raw);
} catch {
  console.error('Invalid JSON file.');
  process.exit(1);
}

const creds = parsed as { client_email?: string; private_key?: string };
if (!creds.client_email || !creds.private_key) {
  console.error('JSON must include client_email and private_key.');
  process.exit(1);
}

console.log(JSON.stringify(parsed));
