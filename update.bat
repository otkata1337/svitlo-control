@echo off
chcp 65001 >nul
cd /d "%~dp0"
python updater.py
"C:\Program Files\Git\bin\git.exe" add schedules_cache.json
"C:\Program Files\Git\bin\git.exe" commit -m "Auto-update schedule cache"
"C:\Program Files\Git\bin\git.exe" push origin main
pause
