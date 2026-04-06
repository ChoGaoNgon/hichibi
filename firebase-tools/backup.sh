#!/bin/bash

# ===================================================
#    FIREBASE BACKUP PRO (AUTH & FIRESTORE)
#    Hỗ trợ macOS / Linux
# ===================================================

echo "===================================="
echo " FIREBASE BACKUP (FIRESTORE + AUTH)"
echo "===================================="

# --------- CHECK SERVICE ACCOUNT ----------
SERVICE_ACCOUNT_PATH="$(pwd)/serviceAccountKey.json"
if [ ! -f "$SERVICE_ACCOUNT_PATH" ]; then
  echo "[LOI] Khong tim thay file serviceAccountKey.json tai thu muc hien tai!"
  echo "Vui long tai file key tu Firebase Console va doi ten thanh serviceAccountKey.json"
  exit 1
fi

# Tu dong lay Project ID tu file serviceAccountKey.json
PROJECT_ID=$(grep -o '"project_id": "[^"]*' "$SERVICE_ACCOUNT_PATH" | cut -d'"' -f4)

if [ -z "$PROJECT_ID" ]; then
    read -p "Khong tu dong tim thay Project ID. Vui long nhap thu cong: " PROJECT_ID
fi

DATE=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_DIR="$(pwd)/firebase_backup_$DATE"
mkdir -p "$BACKUP_DIR"

echo "Project ID: $PROJECT_ID"
echo "Backup Directory: $BACKUP_DIR"
echo "------------------------------------"

# --------- BACKUP AUTH ----------
echo "[1/2] Dang sao luu Firebase Authentication..."
npx -y firebase-tools auth:export "$BACKUP_DIR/auth_users.json" --format=json --project "$PROJECT_ID"

# --------- BACKUP FIRESTORE ----------
echo ""
echo "[2/2] Dang sao luu Firestore (Full Data & Sub-collections)..."
# Su dung node script de backup de quy hoac npx firestore-export-import (on dinh hon)
npx -y firestore-export-import -a "$SERVICE_ACCOUNT_PATH" -b "$BACKUP_DIR/firestore_data.json"

if [ $? -eq 0 ]; then
    echo "=> Sao luu Firestore thanh cong!"
else
    echo "=> [LOI] Sao luu Firestore that bai. Kiem tra quyen cua Service Account."
    exit 1
fi

# --------- NÉN BACKUP ----------
echo ""
echo "Dang nen du lieu..."
tar -czf "firebase_backup_$DATE.tar.gz" -C "$(dirname "$BACKUP_DIR")" "$(basename "$BACKUP_DIR")"
rm -rf "$BACKUP_DIR"

echo ""
echo "===================================="
echo "BACKUP HOAN TAT: firebase_backup_$DATE.tar.gz"
echo "===================================="
