@echo off
setlocal enabledelayedexpansion
cd /d C:\Users\pc\redforce-jongam-manager

set SHEET_ID=%1
if "%SHEET_ID%"=="" (
  echo Usage: set-vercel-env.bat SHEET_ID
  exit /b 1
)

set SA_FILE=C:\Users\pc\Downloads\pro-cafe-manager-0d03cf04ab83.json
set TMP_SA=%TEMP%\redforce-jongam-sa-oneline.json

for %%E in (production preview development) do (
  call npx vercel env rm GOOGLE_SHEETS_ID %%E --yes 2>nul
  call npx vercel env add GOOGLE_SHEETS_ID %%E --value "%SHEET_ID%" --yes
)

node -e "const fs=require('fs'); fs.writeFileSync(process.argv[1], JSON.stringify(JSON.parse(fs.readFileSync(process.argv[2],'utf8'))));" "%TMP_SA%" "%SA_FILE%"

for %%E in (production preview development) do (
  call npx vercel env rm GOOGLE_SERVICE_ACCOUNT_JSON %%E --yes 2>nul
  type "%TMP_SA%" | call npx vercel env add GOOGLE_SERVICE_ACCOUNT_JSON %%E --yes
)

del "%TMP_SA%" 2>nul
echo Done setting Vercel env vars for Redforce Jongam.
