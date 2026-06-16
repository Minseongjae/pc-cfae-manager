# Railway Environment Variables

Railway **Suggested Variables** are hints only — nothing is applied until you add variables yourself.

After adding variables, redeploy (or wait for auto-redeploy) and check:

```
GET https://YOUR-RAILWAY-DOMAIN/api/health
```

Success looks like:

```json
{
  "ok": true,
  "sheetsConfigured": true,
  "sheetId": "1sWB-yFHwaL3NF5Ury00zTqtJdBxRNGGfNLczbtcQRkA",
  "credentialMethod": "json",
  "missing": []
}
```

---

## Step 1 — Open Railway Variables

1. Go to [railway.app](https://railway.app)
2. Open your project → **API service** (the Docker/Node service, not Vercel)
3. Click **Variables**
4. Click **+ New Variable** for each row below

Do **not** rely on "Suggested Variables". Add each one manually.

---

## Step 2 — Required variables (API service)

### `GOOGLE_SHEETS_ID` (required)

Your spreadsheet ID from the URL:

```
https://docs.google.com/spreadsheets/d/THIS_PART/edit
```

**Your value:**

```
1sWB-yFHwaL3NF5Ury00zTqtJdBxRNGGfNLczbtcQRkA
```

---

### Google credentials — choose **ONE** method

#### Method A — `GOOGLE_SERVICE_ACCOUNT_JSON` (recommended on Railway)

Paste the **entire** service account JSON key file as one line.

1. Open your downloaded JSON key file (e.g. `pro-cafe-manager-....json`)
2. Copy the full contents
3. Minify to a single line (remove line breaks between JSON fields), or paste as-is if Railway accepts multiline
4. Add variable:

| Name | Value |
|------|--------|
| `GOOGLE_SERVICE_ACCOUNT_JSON` | `{"type":"service_account","project_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"...@....iam.gserviceaccount.com",...}` |

The JSON must include at least `client_email` and `private_key`.

**Also required:** share the Google Sheet with the `client_email` from that JSON as **Editor**.

---

#### Method B — split env vars (alternative)

From the same JSON file, copy two fields:

| Name | Value |
|------|--------|
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | `client_email` from JSON, e.g. `pc-cafe-manager@pro-cafe-manager.iam.gserviceaccount.com` |
| `GOOGLE_PRIVATE_KEY` | Full `private_key` value including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`. Use literal `\n` for line breaks if pasting on one line. |

---

### `API_KEY` (strongly recommended)

A secret string the frontend sends in the `x-api-key` header.

Generate one locally:

```powershell
# PowerShell
-join ((48..57 + 65..90 + 97..122) | Get-Random -Count 32 | ForEach-Object { [char]$_ })
```

| Name | Value |
|------|--------|
| `API_KEY` | your generated secret, e.g. `K7x m...` (no spaces) |

Use the **same value** on Vercel as `VITE_API_KEY`.

---

### `PORT` (optional — Railway usually sets this automatically)

Railway injects `PORT` for you. You do **not** need to add it unless docs tell you to.

---

## Step 3 — Do NOT set these on Railway API

| Variable | Why |
|----------|-----|
| `GOOGLE_APPLICATION_CREDENTIALS` | Points to a local file path. The file does not exist in the Railway container. **Delete this variable if present.** |
| `VITE_API_URL` | Frontend-only (set on **Vercel**, not Railway) |
| `VITE_API_KEY` | Frontend-only (set on **Vercel**, not Railway) |

If `GOOGLE_APPLICATION_CREDENTIALS` is set to something like `./credentials/...` or `C:/Users/...`, remove it.

---

## Step 4 — Vercel variables (frontend, separate project)

On **Vercel** → Project → Settings → Environment Variables:

| Name | Value |
|------|--------|
| `VITE_API_URL` | Your Railway public URL, e.g. `https://1pc-cafe-manager-production.up.railway.app` (no trailing slash) |
| `VITE_API_KEY` | Same value as Railway `API_KEY` |

Redeploy Vercel after adding these (they are baked in at build time).

---

## Step 5 — Verify

1. **Health check**

   ```
   https://YOUR-RAILWAY-DOMAIN/api/health
   ```

   - `sheetsConfigured: true`
   - `sheetId` is your spreadsheet ID
   - `missing: []`

2. **Data endpoint** (if `API_KEY` is set):

   ```http
   GET https://YOUR-RAILWAY-DOMAIN/api/data
   x-api-key: YOUR_API_KEY
   ```

   Should return JSON with `employees`, `scheduleShifts`, etc.

3. **Open Vercel app** → login → sidebar sync badge should show **연결됨**.

---

## Troubleshooting

| `/api/health` response | Fix |
|------------------------|-----|
| `"sheetId": null` | Add `GOOGLE_SHEETS_ID` |
| `sheetsConfigured: false`, missing credentials | Add `GOOGLE_SERVICE_ACCOUNT_JSON` **or** email + private key |
| Missing file warning for `GOOGLE_APPLICATION_CREDENTIALS` | Remove that variable on Railway |
| `401` on `/api/data` | Set matching `API_KEY` (Railway) and `VITE_API_KEY` (Vercel) |
| Sheets API error / permission denied | Share spreadsheet with service account email as **Editor** |

---

## Quick checklist

- [ ] `GOOGLE_SHEETS_ID` added on Railway
- [ ] `GOOGLE_SERVICE_ACCOUNT_JSON` added on Railway (or email + private key)
- [ ] `GOOGLE_APPLICATION_CREDENTIALS` **removed** from Railway
- [ ] `API_KEY` added on Railway
- [ ] Sheet shared with service account email
- [ ] `VITE_API_URL` + `VITE_API_KEY` added on Vercel
- [ ] `/api/health` returns `sheetsConfigured: true`
