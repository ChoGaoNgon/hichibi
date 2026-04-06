#!/bin/bash

# ===================================================
#    FIREBASE MANUAL BACKUP (SINGLE FILE)
#    Hỗ trợ macOS / Linux
# ===================================================

echo "===================================="
echo " FIREBASE MANUAL BACKUP"
echo "===================================="

# --------- CHECK SERVICE ACCOUNT ----------
SERVICE_ACCOUNT_PATH="$(pwd)/serviceAccountKey.json"
if [ ! -f "$SERVICE_ACCOUNT_PATH" ]; then
  echo "[LOI] Khong tim thay file serviceAccountKey.json tai $(pwd)"
  exit 1
fi

# --------- BACKUP AUTH ----------
PROJECT_ID=$(grep -o '"project_id": "[^"]*' "$SERVICE_ACCOUNT_PATH" | cut -d'"' -f4)
echo "[1/2] Backup Firebase Authentication..."
npx -y firebase-tools auth:export "auth_users.json" --format=json --project "$PROJECT_ID"

# --------- BACKUP FIRESTORE ----------
echo "[2/2] Backup Firestore..."

# Chạy Node.js inline để backup
node <<'EOF_NODE'
const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

const serviceAccount = require(path.resolve("./serviceAccountKey.json"));
const COLLECTIONS = ['categories', 'products', 'vouchers', 'settings', 'users', 'orders'];

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const db = admin.firestore();

function serializeData(data) {
    if (!data) return data;
    if (data instanceof admin.firestore.Timestamp) {
        return { _type: 'timestamp', seconds: data.seconds, nanoseconds: data.nanoseconds };
    }
    if (Array.isArray(data)) return data.map(serializeData);
    if (typeof data === 'object') {
        const result = {};
        for (const key in data) result[key] = serializeData(data[key]);
        return result;
    }
    return data;
}

async function backup() {
  const backupData = {};
  for (const colName of COLLECTIONS) {
    console.log(`Đang lấy dữ liệu bảng: ${colName}...`);
    const snapshot = await db.collection(colName).get();
    backupData[colName] = {};
    snapshot.forEach(doc => {
      backupData[colName][doc.id] = serializeData(doc.data());
    });
    console.log(`=> Đã lấy ${snapshot.size} tài liệu`);
  }
  fs.writeFileSync("firestore_backup.json", JSON.stringify(backupData, null, 2));
  console.log("Firestore backup complete: firestore_backup.json");
}

backup().catch(err => {
  console.error("Lỗi khi backup Firestore:", err);
  process.exit(1);
});
EOF_NODE

echo "------------------------------------"
echo "BACKUP HOÀN TẤT!"
echo "Các file tạo ra: auth_users.json, firestore_backup.json"
