#!/bin/bash

# ===================================================
#    FIREBASE TOOL (MANUAL DATA MANAGER)
#    Hỗ trợ macOS / Linux
# ===================================================

echo "===================================="
echo " FIREBASE DATA TOOL (MANUAL MODE)"
echo "===================================="

# --------- CHECK SERVICE ACCOUNT ----------
SERVICE_ACCOUNT_PATH="$(pwd)/serviceAccountKey.json"
if [ ! -f "$SERVICE_ACCOUNT_PATH" ]; then
  echo "[LOI] Khong tim thay file serviceAccountKey.json!"
  echo "Vui long tai file key tu Firebase Console va doi ten thanh serviceAccountKey.json"
  exit 1
fi

# Tu dong lay Project ID tu file serviceAccountKey.json
PROJECT_ID=$(grep -o '"project_id": "[^"]*' "$SERVICE_ACCOUNT_PATH" | cut -d'"' -f4)

echo "Project ID: $PROJECT_ID"
echo "------------------------------------"
echo "1. Backup (Sao luu du lieu tu Firestore)"
echo "2. Restore (Phuc hoi du lieu vao Firestore)"
echo "3. Backup Auth (Sao luu tai khoan)"
echo "4. Restore Auth (Phuc hoi tai khoan)"
echo "------------------------------------"
read -p "Chon thao tac (1-4): " CHOICE

case $CHOICE in
  1)
    echo "[1/2] Dang sao luu co so du lieu (Firestore)..."
    node data-manager.cjs backup "$SERVICE_ACCOUNT_PATH" "firestore_backup.json"
    ;;
  2)
    echo "[1/2] Dang phuc hoi co so du lieu (Firestore)..."
    node data-manager.cjs restore "$SERVICE_ACCOUNT_PATH" "firestore_backup.json"
    ;;
  3)
    echo "[1/2] Dang sao luu Firebase Authentication..."
    npx -y firebase-tools auth:export "auth_users.json" --format=json --project "$PROJECT_ID"
    ;;
  4)
    echo "[1/2] Dang phuc hoi danh sach nguoi dung (Authentication)..."
    npx -y firebase-tools auth:import "auth_users.json" --project "$PROJECT_ID"
    ;;
  *)
    echo "Lua chon khong hop le!"
    ;;
esac

echo ""
echo "===================================="
echo "THAO TAC HOAN TAT!"
echo "===================================="
