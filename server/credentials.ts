import fs from 'node:fs';

interface ServiceAccountCredentials {
  client_email?: string;
  private_key?: string;
}

export type CredentialMethod = 'json-env' | 'json-inline' | 'file' | 'split-env' | null;

function normalizePrivateKey(raw: string): string {
  return raw.replace(/\\n/g, '\n');
}

function trimEnvValue(raw: string): string {
  let value = raw.trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  return value.trim();
}

function looksLikeJson(value: string): boolean {
  const trimmed = trimEnvValue(value);
  return trimmed.startsWith('{') && trimmed.endsWith('}');
}

function looksLikeFilePath(value: string): boolean {
  const trimmed = trimEnvValue(value);
  if (!trimmed || looksLikeJson(trimmed)) return false;
  return (
    trimmed.includes('/') ||
    trimmed.includes('\\') ||
    trimmed.endsWith('.json') ||
    trimmed.startsWith('./') ||
    trimmed.startsWith('.\\')
  );
}

function tryParseJsonObject(raw: string): ServiceAccountCredentials | null {
  const normalized = trimEnvValue(raw);
  if (!normalized) return null;

  const attempts = [normalized];

  if (normalized.includes('\\n') && !normalized.includes('\n')) {
    attempts.push(normalized.replace(/\\n/g, '\n'));
  }

  for (const candidate of attempts) {
    try {
      let parsed: unknown = JSON.parse(candidate);

      if (typeof parsed === 'string') {
        parsed = JSON.parse(parsed);
      }

      const creds = parsed as ServiceAccountCredentials;
      if (creds.client_email && creds.private_key) {
        return {
          client_email: creds.client_email,
          private_key: normalizePrivateKey(creds.private_key),
        };
      }
    } catch {
      continue;
    }
  }

  return null;
}

function tryParseBase64Json(raw: string): ServiceAccountCredentials | null {
  const normalized = trimEnvValue(raw);
  if (!normalized) return null;

  try {
    const decoded = Buffer.from(normalized, 'base64').toString('utf8');
    return tryParseJsonObject(decoded);
  } catch {
    return null;
  }
}

function parseServiceAccountJson(raw: string): ServiceAccountCredentials | null {
  return tryParseJsonObject(raw) ?? tryParseBase64Json(raw);
}

function readJsonEnvCandidates(): Array<{ source: string; raw: string }> {
  const candidates: Array<{ source: string; raw: string }> = [];

  const jsonEnv = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  if (jsonEnv) candidates.push({ source: 'GOOGLE_SERVICE_ACCOUNT_JSON', raw: jsonEnv });

  const b64Env = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_B64?.trim();
  if (b64Env) candidates.push({ source: 'GOOGLE_SERVICE_ACCOUNT_JSON_B64', raw: b64Env });

  const credsEnv = process.env.GOOGLE_CREDENTIALS_JSON?.trim();
  if (credsEnv) candidates.push({ source: 'GOOGLE_CREDENTIALS_JSON', raw: credsEnv });

  const gacEnv = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  if (gacEnv && looksLikeJson(gacEnv)) {
    candidates.push({ source: 'GOOGLE_APPLICATION_CREDENTIALS (inline JSON)', raw: gacEnv });
  }

  return candidates;
}

export function resolveServiceAccountCredentials(): {
  email: string;
  key: string;
  method: CredentialMethod;
  source: string | null;
} | null {
  for (const candidate of readJsonEnvCandidates()) {
    const creds = parseServiceAccountJson(candidate.raw);
    if (creds?.client_email && creds.private_key) {
      const method: CredentialMethod =
        candidate.source === 'GOOGLE_SERVICE_ACCOUNT_JSON_B64' ? 'json-env' : 'json-inline';
      return {
        email: creds.client_email,
        key: creds.private_key,
        method,
        source: candidate.source,
      };
    }
  }

  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  if (credPath && looksLikeFilePath(credPath) && fs.existsSync(credPath)) {
    const creds = parseServiceAccountJson(fs.readFileSync(credPath, 'utf8'));
    if (creds?.client_email && creds.private_key) {
      return {
        email: creds.client_email,
        key: creds.private_key,
        method: 'file',
        source: 'GOOGLE_APPLICATION_CREDENTIALS (file)',
      };
    }
  }

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim() ?? '';
  const key = normalizePrivateKey(process.env.GOOGLE_PRIVATE_KEY ?? '');
  if (email && key) {
    return { email, key, method: 'split-env', source: 'GOOGLE_SERVICE_ACCOUNT_EMAIL' };
  }

  return null;
}

export function loadServiceAccountCredentials(): { email: string; key: string } {
  const resolved = resolveServiceAccountCredentials();
  if (resolved) {
    return { email: resolved.email, key: resolved.key };
  }
  return { email: '', key: '' };
}

export function getSheetsConfigStatus(): {
  configured: boolean;
  missing: string[];
  credentialMethod: CredentialMethod;
  envPresent: Record<string, boolean>;
  credentialSource: string | null;
} {
  const missing: string[] = [];

  const envPresent = {
    GOOGLE_SHEETS_ID: Boolean(process.env.GOOGLE_SHEETS_ID?.trim()),
    GOOGLE_SERVICE_ACCOUNT_JSON: Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim()),
    GOOGLE_SERVICE_ACCOUNT_JSON_B64: Boolean(
      process.env.GOOGLE_SERVICE_ACCOUNT_JSON_B64?.trim()
    ),
    GOOGLE_APPLICATION_CREDENTIALS: Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim()),
    GOOGLE_SERVICE_ACCOUNT_EMAIL: Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim()),
    GOOGLE_PRIVATE_KEY: Boolean(process.env.GOOGLE_PRIVATE_KEY?.trim()),
  };

  if (!envPresent.GOOGLE_SHEETS_ID) {
    missing.push('GOOGLE_SHEETS_ID');
  }

  const resolved = resolveServiceAccountCredentials();

  if (!resolved) {
    if (envPresent.GOOGLE_SERVICE_ACCOUNT_JSON) {
      missing.push('GOOGLE_SERVICE_ACCOUNT_JSON (invalid or unreadable JSON)');
    } else if (envPresent.GOOGLE_SERVICE_ACCOUNT_JSON_B64) {
      missing.push('GOOGLE_SERVICE_ACCOUNT_JSON_B64 (invalid base64 JSON)');
    } else if (
      envPresent.GOOGLE_APPLICATION_CREDENTIALS &&
      looksLikeJson(process.env.GOOGLE_APPLICATION_CREDENTIALS ?? '')
    ) {
      missing.push('GOOGLE_APPLICATION_CREDENTIALS (inline JSON is invalid)');
    } else if (
      envPresent.GOOGLE_APPLICATION_CREDENTIALS &&
      looksLikeFilePath(process.env.GOOGLE_APPLICATION_CREDENTIALS ?? '')
    ) {
      missing.push(
        'GOOGLE_APPLICATION_CREDENTIALS points to a missing file — use GOOGLE_SERVICE_ACCOUNT_JSON on Railway'
      );
    } else if (envPresent.GOOGLE_SERVICE_ACCOUNT_EMAIL || envPresent.GOOGLE_PRIVATE_KEY) {
      missing.push('GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY (both required)');
    } else {
      missing.push('GOOGLE_SERVICE_ACCOUNT_JSON');
    }
  }

  return {
    configured: missing.length === 0,
    missing,
    credentialMethod: resolved?.method ?? null,
    envPresent,
    credentialSource: resolved?.source ?? null,
  };
}
