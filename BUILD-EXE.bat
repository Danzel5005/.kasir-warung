

@echo off
cd /d "%~dp0"
echo.
echo ================================================
echo   KASIR WARUNG - BUILD .EXE
echo ================================================
echo   Folder: %cd%
echo.
pause

npm run build

echo ================================================
echo Membuat file .exe...
echo       Bisa 5-15 menit, harap tunggu...
echo ================================================
echo.

npm run electron:build

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
