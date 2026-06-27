# 레드포스 종암점 — Google Sheet 설정

레드포스 종암점은 **다른 매장과 별도 Google Sheet**를 사용해야 합니다.

## 1. 새 스프레드시트 만들기

1. [Google Sheets](https://sheets.google.com) → **새 스프레드시트**
2. 이름: `레드포스 종암점 Manager`
3. **공유** → `pc-cafe-manager@pro-cafe-manager.iam.gserviceaccount.com` **편집자**
4. URL에서 시트 ID 복사

## 2. Vercel 환경 변수

```powershell
cd C:\Users\pc\redforce-jongam-manager
scripts\set-vercel-env.bat YOUR_SHEET_ID
npx vercel --prod --yes
```

## 3. 확인

- https://redforce-jongam-manager.vercel.app
- `/api/health` → `sheetsConfigured: true`
