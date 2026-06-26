@echo off
cd /d "C:\Users\Check\Desktop\APP"
git add news/
for /f "tokens=1-3 delims=/-" %%a in ("%DATE%") do set TODAY=%%a%%b%%c
git commit -m "news: 빅테크뉴스 %TODAY%"
git push origin master
git push origin main
