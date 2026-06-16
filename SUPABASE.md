# Supabase 배포 가이드

집, 매장, 휴대폰에서 **동일한 데이터**를 사용하려면 Vercel(프론트) + Supabase(데이터베이스)만 필요합니다.  
Railway와 Google Sheets는 **더 이상 사용하지 않습니다.**

## 아키텍처

```
브라우저 (Vercel)  →  Supabase PostgreSQL
     ↑                        ↑
  자동 저장 (700ms)      직원·근무표·실근무·급여·설정
  10초마다 동기화
```

---

## 1. Supabase 프로젝트 생성

1. [supabase.com](https://supabase.com) 가입 / 로그인
2. **New project** → 이름·비밀번호·리전 선택 (가까운 리전 권장)
3. 프로젝트 생성 완료 대기 (~1분)

---

## 2. 테이블 생성 (SQL)

1. Supabase Dashboard → **SQL Editor** → **New query**
2. 프로젝트의 `supabase/schema.sql` 파일 내용 **전체 복사** → 붙여넣기
3. **Run** 클릭

생성되는 테이블:

| 테이블 | 내용 |
|--------|------|
| `employees` | 직원 |
| `schedule_shifts` | 근무표 |
| `actual_work_records` | 실근무 기록 |
| `payroll_adjustment_records` | 급여 조정 |
| `app_state` | 앱 설정 + 동기화 토큰 |

---

## 3. API 키 확인

Supabase Dashboard → **Project Settings** → **API**

| 항목 | 용도 |
|------|------|
| **Project URL** | `VITE_SUPABASE_URL` |
| **anon public** key | `VITE_SUPABASE_ANON_KEY` |

---

## 4. Vercel 환경변수

Vercel → 프로젝트 → **Settings** → **Environment Variables**

| Name | Value |
|------|--------|
| `VITE_SUPABASE_URL` | Project URL (예: `https://xxxx.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | anon public key |

**Production**, **Preview**, **Development** 모두에 추가하는 것을 권장합니다.

저장 후 **Deployments** → 최신 배포 → **Redeploy** (환경변수는 빌드 시 반영됩니다).

### 제거해도 되는 변수 (구 Google Sheets / Railway)

- `VITE_API_URL`
- `VITE_API_KEY`

---

## 5. GitHub 푸시 → Vercel 자동 배포

```powershell
cd C:\Users\pc\1pc-cafe-manager
git add .
git commit -m "Migrate storage from Google Sheets to Supabase"
git push origin main
```

GitHub와 Vercel이 연결되어 있으면 push 후 자동 빌드·배포됩니다.

수동 배포: Vercel Dashboard → **Deployments** → **Redeploy**

---

## 6. 동작 확인

1. Vercel URL 접속 → 로그인 화면 → 앱 비밀번호 입력
2. 사이드바 하단 **Supabase** 배지 → **연결됨**
3. 직원 추가 → Supabase **Table Editor** → `employees`에 행 추가 확인
4. 다른 기기(휴대폰)에서 같은 URL 접속 → 동일 데이터 확인
5. 새로고침 후에도 데이터 유지 확인

---

## 데이터 저장 방식

- 모든 변경은 **700ms 디바운스** 후 Supabase에 자동 저장
- **10초마다** 원격 데이터를 가져와 다른 기기 변경 반영
- 사이드바 **동기화 버튼**으로 즉시 동기화 가능

---

## 로컬 개발

`.env` 파일:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

```powershell
npm install
npm run dev:web
```

(`npm run dev`는 Express 서버 포함 — Supabase 전환 후에는 `dev:web`만으로 충분)

---

## 보안 참고

- 앱 잠금 비밀번호는 브라우저 `localStorage` (기기별)
- Supabase anon key는 프론트에 포함됩니다. RLS 정책은 현재 단일 매장용으로 열려 있습니다.
- URL을 아는 사람이 anon key로 API 접근 가능 → 앱 잠금 + Supabase Auth 강화를 추후 권장
