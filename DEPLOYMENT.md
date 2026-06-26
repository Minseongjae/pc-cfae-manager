# Deployment Guide

Google Sheets is the primary database. The React app talks to a Node API server, which reads and writes four sheet tabs:

- **Employees**
- **Schedule**
- **Attendance**
- **Payroll**

Payroll is still calculated in the web app:

```
Base Pay = Worked Hours × Hourly Wage
Final Pay = Base Pay + Bonus + Meal Allowance + Transportation Allowance - Deductions
```

## 1. Create a Google Sheet

1. Create a new Google Spreadsheet.
2. Copy the spreadsheet ID from the URL:
   `https://docs.google.com/spreadsheets/d/<SPREADSHEET_ID>/edit`
3. The server will auto-create these tabs on first run:
   - Employees
   - Schedule
   - Attendance
   - Payroll
   - Settings

## 2. Create a Google Service Account

1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Create or select a project.
3. Enable **Google Sheets API**.
4. Create a **Service Account** and download the JSON key.
5. Share the spreadsheet with the service account email as **Editor**.

## 3. Configure environment variables

Copy `.env.example` to `.env` and fill in:

```env
GOOGLE_SHEETS_ID=...
GOOGLE_SERVICE_ACCOUNT_EMAIL=...
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
PORT=3001
API_KEY=your_secret_key
VITE_API_KEY=your_secret_key
```

For production web builds, also set:

```env
VITE_API_URL=https://your-api-domain.com
```

## 4. Local development

```bash
npm install
npm run dev:all
```

- Web app: http://localhost:5173
- API server: http://localhost:3001

`npm run electron` starts the API server, Vite, and Electron together.

## 5. Production API deployment

Build and run the API server on any Node host (Railway, Render, Fly.io, VPS):

```bash
npm install
npm run build:server
npm run start:server
```

Required runtime env vars:

- `GOOGLE_SHEETS_ID`
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_PRIVATE_KEY`
- `PORT`
- `API_KEY` (recommended)

Health check endpoint:

```
GET /api/health
```

## 6. Production web deployment

Build the frontend with the deployed API URL:

```bash
VITE_API_URL=https://your-api-domain.com VITE_API_KEY=your_secret_key npm run build
```

Deploy the `dist/` folder to any static host (Vercel, Netlify, Cloudflare Pages, Nginx).

Enable CORS on the API server for your frontend domain if they are on different origins.

## 7. Multi-device sync

- App edits are pushed to Google Sheets automatically.
- The app polls Google Sheets every 10 seconds.
- Manual edits in Google Sheets appear in the app on the next poll.
- Use the sidebar sync badge to force a refresh.

## 8. Desktop (Electron)

Build with your production API URL baked in:

```bash
set VITE_API_URL=https://your-api-domain.com
set VITE_API_KEY=your_secret_key
npm run build-win
```

## 9. First-run migration

If local browser data exists from the old localStorage version, it is uploaded to Google Sheets automatically when the remote sheet is empty.

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Server health |
| GET | `/api/data` | Read all sheet data |
| PUT | `/api/data` | Write all sheet data |

All data endpoints accept optional header:

```
x-api-key: your_secret_key
```
