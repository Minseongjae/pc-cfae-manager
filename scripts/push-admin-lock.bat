@echo off
cd /d C:\Users\pc\1pc-cafe-manager
git add src/lib/adminLockSession.ts src/hooks/useAdminLock.ts src/components/auth/AdminLockScreen.tsx src/pages/EmployeesPage.tsx src/pages/PayrollPage.tsx src/components/layout/Sidebar.tsx src/lib/payrollLockSession.ts src/components/auth/PayrollLockScreen.tsx
git commit -F .git/COMMIT_MSG.txt
git push origin main
npx vercel --prod --yes
