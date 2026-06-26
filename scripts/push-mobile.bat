@echo off
cd /d C:\Users\pc\1pc-cafe-manager
git add src/components/layout/AppLayout.tsx src/components/layout/MobileTopBar.tsx src/components/layout/Sidebar.tsx src/components/layout/PageHeader.tsx src/components/layout/RightPanel.tsx src/components/schedule/ScheduleHeader.tsx src/components/schedule/ScheduleCalendar.tsx src/components/payroll/PayrollTable.tsx src/pages/EmployeesPage.tsx src/pages/SettingsPage.tsx src/pages/PayrollPage.tsx src/hooks/useIsMobile.ts src/index.css tailwind.config.js index.html
git commit -F .git/COMMIT_MSG.txt
git push origin main
npx vercel --prod --yes
