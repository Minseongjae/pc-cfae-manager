# Blaze 창신점 — Google Sheet 설정

Blaze 창신점은 **1% PC&CAFE와 별도 Google Sheet**를 사용해야 합니다. (같은 시트를 쓰면 데이터가 섞입니다.)

## 1. 새 스프레드시트 만들기 (수동)

서비스 계정은 새 시트를 **자동 생성할 권한이 없습니다.** Google에서 직접 만드세요.

1. [Google Sheets](https://sheets.google.com) → **새 스프레드시트**
2. 이름: `Blaze 창신점 Manager`
3. **공유** → 아래 이메일에 **편집자** 권한  
   `pc-cafe-manager@pro-cafe-manager.iam.gserviceaccount.com`
4. URL에서 시트 ID 복사  
   `https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit`

> **팁:** 기존 1% PC 시트를 **파일 → 사본 만들기**로 복사한 뒤, 데이터 탭 내용만 비우고 사용해도 됩니다.

## 2. Vercel 환경 변수

```powershell
cd C:\Users\pc\blaze-changsin-manager
scripts\set-vercel-env.bat YOUR_SHEET_ID
npx vercel --prod --yes
```

## 3. 확인

- 앱: https://blaze-changsin-manager.vercel.app
- API: https://blaze-changsin-manager.vercel.app/api/health  
  → `sheetsConfigured: true` 이면 성공

앱 첫 실행 시 필요한 탭(Employees, Schedule 등)은 API가 자동 생성합니다.
