# Blaze 창신점 — Google Sheet 설정

Blaze 창신점은 **1% PC&CAFE와 별도의 Google Sheet**를 사용합니다.

## 자동 복사 (권장)

```powershell
cd C:\Users\pc\blaze-changsin-manager
node scripts/create-google-sheet.mjs "Blaze 창신점 Manager"
```

출력된 `sheetId`로 Vercel 환경 변수를 설정합니다.

## 수동 설정

1. [Google Sheets](https://sheets.google.com)에서 **새 스프레드시트** 생성
2. 이름: `Blaze 창신점 Manager`
3. **공유** → `pc-cafe-manager@pro-cafe-manager.iam.gserviceaccount.com` 에 **편집자** 권한

## Vercel 환경 변수

```powershell
cd C:\Users\pc\blaze-changsin-manager
scripts\set-vercel-env.bat YOUR_SHEET_ID
npx vercel --prod --yes
```
