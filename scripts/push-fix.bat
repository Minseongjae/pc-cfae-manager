@echo off
cd /d C:\Users\pc\1pc-cafe-manager
git add api/_shared/init.ts vercel.json .vercelignore src/lib/supabaseApi.ts src/lib/supabaseClient.ts src/contexts/AuthContext.tsx src/components/auth/LoginScreen.tsx src/lib/authSession.ts scripts/test-vercel-api.mjs
git commit -F .git/COMMIT_MSG.txt
git push origin main
