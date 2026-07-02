@echo off
title stan-portfolio demos (keep this window open)
cd /d "%~dp0"
echo ============================================================
echo   Starting the demo server. KEEP THIS WINDOW OPEN.
echo   Close this window (or press Ctrl+C) to stop it.
echo ------------------------------------------------------------
echo   Minimal (kafagoz):  http://localhost:5173/demo/
echo   Terminal:           http://localhost:5173/demo-concepts/terminal/
echo   Editorial:          http://localhost:5173/demo-concepts/editorial/
echo   Bento:              http://localhost:5173/demo-concepts/bento/
echo   Swiss:              http://localhost:5173/demo-concepts/swiss/
echo   Timeline:           http://localhost:5173/demo-concepts/timeline/
echo   Featherweight:      http://localhost:5173/demo-concepts/featherweight/
echo ============================================================
echo.
call npm run dev
echo.
echo Server stopped. You can close this window.
pause
