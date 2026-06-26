# Blaze 창신점 — Google Sheet 설정

Blaze 창신점은 **1% PC&CAFE와 별도의 Google Sheet**를 사용합니다.

## 1. 새 스프레드시트 만들기

1. [Google Sheets](https://sheets.google.com)에서 **새 스프레드시트** 생성
2. 이름: `Blaze 창신점 Manager`
3. URL에서 시트 ID 복사  
   `https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit`

## 2. 서비스 계정 공유

스프레드시트 **공유** → 아래 이메일에 **편집자** 권한:

`pc-cafe-manager@pro-cafe-manager.iam.gserviceaccount.com`

## 3. Vercel 환경 변수

```powershell
cd C:\Users\pc\blaze-changsin-manager
scripts\set-vercel-env.bat YOUR_SHEET_ID
```

앱 첫 실행 시 필요한 탭(Employees, Schedule 등)은 API가 자동 생성합니다.
