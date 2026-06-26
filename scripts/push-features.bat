@echo off
cd /d C:\Users\pc\1pc-cafe-manager
git add server src index.html
git commit -F .git/COMMIT_MSG.txt
git push origin main
npx vercel --prod --yes
