# Vercel + Google Sheets 배포 가이드

PC방 관리 사이트는 **Vercel Serverless API** + **Google Sheets**로 데이터를 영구 저장합니다.  
로그인 없이 URL만 공유하면 집·매장·휴대폰에서 같은 데이터를 볼 수 있습니다.

## 1. Google Sheet 준비

1. Google Sheets에서 스프레드시트를 엽니다.
2. **공유** → 서비스 계정 이메일에 **편집자** 권한 부여  
   예: `pc-cafe-manager@pro-cafe-manager.iam.gserviceaccount.com`
3. URL에서 시트 ID 복사  
   `https://docs.google.com/spreadsheets/d/{GOOGLE_SHEETS_ID}/edit`

## 2. Vercel 환경 변수

Vercel → 프로젝트 → **Settings** → **Environment Variables**

| 변수 | 값 |
|------|-----|
| `GOOGLE_SHEETS_ID` | 스프레드시트 ID |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | 서비스 계정 JSON **전체** (한 줄) |

> JSON 파일 경로(`GOOGLE_APPLICATION_CREDENTIALS`)는 Vercel에서 동작하지 않습니다.  
> 반드시 `GOOGLE_SERVICE_ACCOUNT_JSON`에 JSON 내용 전체를 붙여넣으세요.

적용 환경: **Production**, **Preview**, **Development** 모두 체크 후 저장.

## 3. 배포

GitHub `main` branch에 push하면 Vercel이 자동 배포합니다.

```bash
git push origin main
```

배포 후 확인:

- `https://your-app.vercel.app/api/health`  
  → `{ "ok": true, "sheetsConfigured": true }`
- 앱에서 데이터 수정 → 새로고침 후 유지 확인

## 4. 로컬 개발

```bash
copy .env.example .env
# .env에 GOOGLE_SHEETS_ID, GOOGLE_SERVICE_ACCOUNT_JSON 또는
# GOOGLE_APPLICATION_CREDENTIALS=./path/to/service-account.json

npm install
npm run dev
```

- 프론트: http://localhost:5173  
- API: http://localhost:3001/api/health

## 5. 동작 방식

- 수정 시 **0.5초 디바운스** 후 Google Sheets에 자동 저장
- **8초마다** 다른 기기 변경사항 폴링
- localStorage는 사용하지 않음 (예전 데이터만 최초 1회 시트로 이전)
- 로그인/회원가입 없음 — URL 공유로 조회

## 문제 해결

| 증상 | 해결 |
|------|------|
| `sheetsConfigured: false` | Vercel 환경 변수 확인, JSON 형식 검증 |
| 403 / Permission denied | 시트에 서비스 계정 이메일 편집 권한 추가 |
| 저장 후 새로고침 시 사라짐 | `/api/health` 확인, 브라우저 네트워크 탭에서 PUT `/api/data` 오류 확인 |
