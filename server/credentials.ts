import fs from 'node:fs';

interface ServiceAccountCredentials {
  client_email?: string;
  private_key?: string;
}

function normalizePrivateKey(raw: string): string {
  return raw.replace(/\\n/g, '\n');
}

function trimJsonEnv(raw: string): string {
  let value = raw.trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  return value;
}

function parseServiceAccountJson(raw: string): ServiceAccountCredentials | null {
  const normalized = trimJsonEnv(raw);
  if (!normalized) return null;

  try {
    const creds = JSON.parse(normalized) as ServiceAccountCredentials;
    if (creds.client_email && creds.private_key) {
      return {
        client_email: creds.client_email,
        private_key: normalizePrivateKey(creds.private_key),
      };
    }
  } catch {
    return null;
  }
  return null;
}

export function loadServiceAccountCredentials(): { email: string; key: string } {
  const inlineJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  if (inlineJson) {
    const creds = parseServiceAccountJson(inlineJson);
    if (creds?.client_email && creds.private_key) {
      return { email: creds.client_email, key: creds.private_key };
    }
  }

  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (credPath && fs.existsSync(credPath)) {
    const creds = parseServiceAccountJson(fs.readFileSync(credPath, 'utf8'));
    if (creds?.client_email && creds.private_key) {
      return { email: creds.client_email, key: creds.private_key };
    }
  }

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? '';
  const key = normalizePrivateKey(process.env.GOOGLE_PRIVATE_KEY ?? '');
  return { email, key };
}

export function getSheetsConfigStatus(): {
  configured: boolean;
  missing: string[];
  credentialMethod: 'json' | 'file' | 'split-env' | null;
} {
  const missing: string[] = [];

  if (!process.env.GOOGLE_SHEETS_ID) {
    missing.push('GOOGLE_SHEETS_ID');
  }

  let credentialMethod: 'json' | 'file' | 'split-env' | null = null;

  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim()) {
    credentialMethod = parseServiceAccountJson(process.env.GOOGLE_SERVICE_ACCOUNT_JSON)
      ? 'json'
      : null;
    if (!credentialMethod) {
      missing.push('GOOGLE_SERVICE_ACCOUNT_JSON (invalid JSON)');
    }
  } else if (
    process.env.GOOGLE_APPLICATION_CREDENTIALS &&
    fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)
  ) {
    credentialMethod = 'file';
  } else if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
    credentialMethod = 'split-env';
  } else {
    missing.push('GOOGLE_SERVICE_ACCOUNT_JSON');
  }

  if (
    process.env.GOOGLE_APPLICATION_CREDENTIALS &&
    !fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)
  ) {
    missing.push(
      'Remove GOOGLE_APPLICATION_CREDENTIALS on Railway; use GOOGLE_SERVICE_ACCOUNT_JSON instead'
    );
  }

  return {
    configured: missing.length === 0,
    missing,
    credentialMethod,
  };
}
