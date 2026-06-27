# 레드포스 종암점 Manager

PC방·카페 통합 관리 웹앱 (직원, 스케줄, 실근무, 급여, 재고, 매출 등).

- **매장명:** 레드포스 종암점
- **데이터:** Google Sheets (Vercel API)
- **근무표:** 2명 슬롯 · Ctrl+클릭 복사 · Ctrl+V 붙여넣기

## 로컬 개발

```powershell
cd C:\Users\pc\redforce-jongam-manager
copy .env.example .env
npm install
npm run dev
```

## 배포

GitHub `redforce-jongam` 브랜치 push → Vercel 자동 배포.  
Google Sheet 설정은 `REDFORCE_SETUP.md` 참고.
