#!/bin/bash

# ===================================================
#    FIREBASE RESTORE PRO (AUTH & FIRESTORE)
#    Hỗ trợ macOS / Linux
# ===================================================

echo "===================================="
echo " FIREBASE RESTORE (FIRESTORE + AUTH)"
echo "===================================="

# --------- CHECK SERVICE ACCOUNT ----------
SERVICE_ACCOUNT_PATH="$(pwd)/serviceAccountKey.json"
if [ ! -f "$SERVICE_ACCOUNT_PATH" ]; then
  echo "[LOI] Khong tim thay file serviceAccountKey.json cua du an DICH!"
  echo "Vui long vao Firebase Console cua du an MOI -> Project Settings -> Service Accounts."
  echo "Tao va tai file private key (.json), doi ten thanh 'serviceAccountKey.json' va de cung thu muc voi file .sh nay."
  echo ""
  exit 1
fi

# Tu dong lay Project ID tu file serviceAccountKey.json
PROJECT_ID=$(grep -o '"project_id": "[^"]*' "$SERVICE_ACCOUNT_PATH" | cut -d'"' -f4)

if [ -z "$PROJECT_ID" ]; then
    read -p "Khong tu dong tim thay Project ID. Vui long nhap thu cong: " PROJECT_ID
fi

echo "Project ID: $PROJECT_ID"
echo "------------------------------------"

# --------- PHỤC HỒI AUTH ----------
if [ ! -f "backup_users.json" ] && [ ! -f "auth_users.json" ]; then
    echo "[CANH BAO] Khong tim thay file backup Authentication (backup_users.json hoac auth_users.json). Bo qua."
else
    FILE_AUTH=$(ls backup_users.json auth_users.json 2>/dev/null | head -n 1)
    echo "[1/2] Dang phuc hoi danh sach nguoi dung (Authentication)..."
    npx -y firebase-tools auth:import "$FILE_AUTH" --project "$PROJECT_ID"
fi

# --------- PHỤC HỒI FIRESTORE ----------
echo ""
if [ ! -f "backup_firestore.json" ] && [ ! -f "firestore_data.json" ]; then
    echo "[CANH BAO] Khong tim thay file backup Firestore (backup_firestore.json hoac firestore_data.json). Bo qua."
else
    FILE_FS=$(ls backup_firestore.json firestore_data.json 2>/dev/null | head -n 1)
    echo "[2/2] Dang phuc hoi co so du lieu (Firestore)..."
    npx -y firestore-export-import -a "$SERVICE_ACCOUNT_PATH" -i "$FILE_FS"
fi

echo ""
echo "===================================="
echo "HOAN TAT PHUC HOI DU LIEU!"
echo "===================================="
