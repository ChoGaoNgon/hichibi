#!/bin/bash

# Firebase Restore Script for macOS/Linux
# ===================================================
#    PHỤC HỒI DỮ LIỆU FIREBASE (AUTH & FIRESTORE)
# ===================================================

echo "==================================================="
echo "   PHỤC HỒI DỮ LIỆU FIREBASE (AUTH & FIRESTORE)"
echo "==================================================="
echo ""

if [ ! -f "serviceAccountKey.json" ]; then
    echo "[LOI] Khong tim thay file serviceAccountKey.json cua du an DICH!"
    echo "Vui long vao Firebase Console cua du an MOI -> Project Settings -> Service Accounts."
    echo "Tao va tai file private key (.json), doi ten thanh 'serviceAccountKey.json' va de cung thu muc voi file .sh nay."
    echo ""
    exit 1
fi

read -p "Nhap DESTINATION Firebase Project ID (Du an MOI): " PROJECT_ID

echo ""
if [ ! -f "backup_users.json" ]; then
    echo "[CANH BAO] Khong tim thay backup_users.json. Bo qua phuc hoi Authentication."
else
    echo "[1/2] Dang phuc hoi danh sach nguoi dung (Authentication)..."
    npx firebase-tools auth:import backup_users.json --project "$PROJECT_ID"
fi

echo ""
if [ ! -f "backup_firestore.json" ]; then
    echo "[CANH BAO] Khong tim thay backup_firestore.json. Bo qua phuc hoi Firestore."
else
    echo "[2/2] Dang phuc hoi co so du lieu (Firestore)..."
    npx firestore-export-import -a serviceAccountKey.json -i backup_firestore.json
fi

echo ""
echo "==================================================="
echo "HOAN TAT PHUC HOI DU LIEU!"
echo "==================================================="
