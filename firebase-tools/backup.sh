#!/bin/bash

# Firebase Backup Script for macOS/Linux
# ===================================================
#    SAO LƯU DỮ LIỆU FIREBASE (AUTH & FIRESTORE)
# ===================================================

echo "==================================================="
echo "   SAO LƯU DỮ LIỆU FIREBASE (AUTH & FIRESTORE)"
echo "==================================================="
echo ""

if [ ! -f "serviceAccountKey.json" ]; then
    echo "[LOI] Khong tim thay file serviceAccountKey.json!"
    echo "Vui long vao Firebase Console -> Project Settings -> Service Accounts."
    echo "Tao va tai file private key (.json), doi ten thanh 'serviceAccountKey.json' va de cung thu muc voi file .sh nay."
    echo ""
    exit 1
fi

read -p "Nhap SOURCE Firebase Project ID (VD: my-app-123): " PROJECT_ID

echo ""
echo "[1/2] Dang sao luu danh sach nguoi dung (Authentication)..."
npx firebase-tools auth:export backup_users.json --format=json --project "$PROJECT_ID"

echo ""
echo "[2/2] Dang sao luu co so du lieu (Firestore)..."
npx firestore-export-import -a serviceAccountKey.json -b backup_firestore.json

echo ""
echo "==================================================="
echo "HOAN TAT SAO LƯU! "
echo "Cac file duoc tao ra:"
echo "- backup_users.json (Du lieu tai khoan)"
echo "- backup_firestore.json (Du lieu don hang, san pham...)"
echo "==================================================="
