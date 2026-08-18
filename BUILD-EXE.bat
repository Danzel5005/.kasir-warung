

@echo off
cd /d "%~dp0"

npm run build
npm run electron:build

echo ================================================
echo Membuat file .exe...
echo       Bisa 5-15 menit, harap tunggu...
echo ================================================
echo.
pause

:: ── SELESAI ──────────────────────────────────────────────────────────────────
echo.
echo ================================================
echo   BUILD BERHASIL!
echo.
echo   File installer ada di folder: release\
echo.   
echo   Klik dua kali file itu untuk install ke PC.
echo ================================================
echo.
pause
