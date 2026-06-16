# 1% PC&CAFE Manager

Desktop cafe management application built with Electron, React, TypeScript, Tailwind CSS, and **localStorage** for data persistence.

## Getting Started

```bash
npm install
npm run dev
```

Opens at http://localhost:5173 — all data is stored in browser localStorage.

For Electron desktop shell:

```bash
npm run electron:dev
```

## Data Storage

All data (employees, schedules, school notices) is persisted in `localStorage` under the key `1pc-cafe-manager-data`. No SQLite or native database dependencies.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server (browser) |
| `npm run build` | Production web build |
| `npm run electron:dev` | Vite + Electron window |
| `npm run electron:build` | Package desktop app |
