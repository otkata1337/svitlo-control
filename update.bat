@echo off
cd /d "%~dp0"
echo ========================================
echo   Onovlennya SvitloKontrol
echo ========================================
echo.

git add .
git commit -m "Update app features"
git push

echo.
echo ========================================
echo   Gotovo!
echo ========================================
pause
