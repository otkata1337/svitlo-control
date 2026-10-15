@echo off
cd /d "%~dp0"
echo ========================================
echo   Onovlennya SvitloKontrol
echo ========================================
echo.

echo 📊 Запуск парсера графіків...
node updater.js --mock

echo.
echo ========================================
echo   Gotovo!
echo ========================================
echo.
echo Графіки оновлено та збережено у schedules_cache.json
echo API сервер: http://localhost:3000/api/schedules
echo PWA: відкрити http://localhost:3000
echo.

pause