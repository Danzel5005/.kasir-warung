@echo off
chcp 65001 >nul
echo.
echo  ╔══════════════════════════════════════════════════════╗
echo  ║     KASIR WARUNG — MODE DEV                ║
echo  ╚══════════════════════════════════════════════════════╝
echo.
echo  Jika pertama kali, install dulu dependencies:
echo     npm install --legacy-peer-deps
echo.
echo  Menjalankan aplikasi...
echo  (Tutup jendela ini untuk menghentikan aplikasi)
echo.

npm run build
npm run electron:dev
pause
