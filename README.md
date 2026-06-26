# Blaze 창신점 Manager

PC방·카페 통합 관리 웹앱 (직원, 스케줄, 실근무, 급여, 재고, 매출 등).

데이터는 **Google Sheets**에 저장되며 Vercel Serverless API를 통해 동기화됩니다.

## 로컬 개발

```powershell
cd C:\Users\pc\blaze-changsin-manager
copy .env.example .env
npm install
npm run dev
```

## 배포

GitHub `main` push → Vercel 자동 배포. 환경 변수는 `VERCEL.md` 참고.
