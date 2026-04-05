@echo off
chcp 65001 >nul
echo ===================================================
echo    PHUC HOI DỮ LIỆU FIREBASE (AUTH ^& FIRESTORE)
echo ===================================================
echo.

if not exist "serviceAccountKey.json" (
    echo [LOI] Khong tim thay file serviceAccountKey.json cua du an DICH!
    echo Vui long vao Firebase Console cua du an MOI -^> Project Settings -^> Service Accounts.
    echo Tao va tai file private key (.json), doi ten thanh 'serviceAccountKey.json' va de cung thu muc voi file .bat nay.
    echo.
    pause
    exit /b
)

set /p PROJECT_ID="Nhap DESTINATION Firebase Project ID (Du an MOI): "

echo.
if not exist "backup_users.json" (
    echo [CANH BAO] Khong tim thay backup_users.json. Bo qua phuc hoi Authentication.
) else (
    echo [1/2] Dang phuc hoi danh sach nguoi dung (Authentication)...
    call npx firebase-tools auth:import backup_users.json --project %PROJECT_ID%
)

echo.
if not exist "backup_firestore.json" (
    echo [CANH BAO] Khong tim thay backup_firestore.json. Bo qua phuc hoi Firestore.
) else (
    echo [2/2] Dang phuc hoi co so du lieu (Firestore)...
    call npx firestore-export-import -a serviceAccountKey.json -i backup_firestore.json
)

echo.
echo ===================================================
echo HOAN TAT PHUC HOI DU LIEU!
echo ===================================================
pause
