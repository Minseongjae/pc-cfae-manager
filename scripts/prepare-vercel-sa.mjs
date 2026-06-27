import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const source = process.env.GOOGLE_APPLICATION_CREDENTIALS
  ?? 'C:/Users/pc/Downloads/pro-cafe-manager-0d03cf04ab83.json';
const out = path.join(__dirname, '..', '.vercel-tmp-sa.json');
const json = JSON.stringify(JSON.parse(fs.readFileSync(source, 'utf8')));
fs.writeFileSync(out, json, 'utf8');
console.log('Wrote minified service account JSON to', out);
