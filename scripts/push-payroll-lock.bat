@echo off
cd /d C:\Users\pc\1pc-cafe-manager
git add src/lib/payrollLockSession.ts src/components/auth/PayrollLockScreen.tsx src/pages/PayrollPage.tsx src/components/layout/Sidebar.tsx
git commit -F .git/COMMIT_MSG.txt
git push origin main
npx vercel --prod --yes
