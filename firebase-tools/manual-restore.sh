#!/bin/bash

# ===================================================
#    FIREBASE MANUAL RESTORE (SINGLE FILE)
#    Hỗ trợ macOS / Linux
# ===================================================

echo "===================================="
echo " FIREBASE MANUAL RESTORE"
echo "===================================="

# --------- CHECK SERVICE ACCOUNT ----------
SERVICE_ACCOUNT_PATH="$(pwd)/serviceAccountKey.json"
if [ ! -f "$SERVICE_ACCOUNT_PATH" ]; then
  echo "[LOI] Khong tim thay file serviceAccountKey.json tai $(pwd)"
  exit 1
fi

# --------- RESTORE AUTH ----------
PROJECT_ID=$(grep -o '"project_id": "[^"]*' "$SERVICE_ACCOUNT_PATH" | cut -d'"' -f4)
if [ ! -f "auth_users.json" ]; then
    echo "[CANH BAO] Khong tim thay auth_users.json. Bo qua."
else
    echo "[1/2] Dang phuc hoi danh sach nguoi dung (Authentication)..."
    npx -y firebase-tools auth:import "auth_users.json" --project "$PROJECT_ID"
fi

# --------- RESTORE FIRESTORE ----------
echo "[2/2] Dang phuc hoi co so du lieu (Firestore)..."

if [ ! -f "firestore_backup.json" ]; then
    echo "[LOI] Khong tim thay firestore_backup.json!"
    exit 1
fi

# Chạy Node.js inline để restore
node <<'EOF_NODE'
const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

const serviceAccount = require(path.resolve("./serviceAccountKey.json"));

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const db = admin.firestore();

function deserializeData(data) {
    if (!data) return data;
    if (typeof data === 'object' && data._type === 'timestamp') {
        return new admin.firestore.Timestamp(data.seconds, data.nanoseconds);
    }
    if (Array.isArray(data)) return data.map(deserializeData);
    if (typeof data === 'object') {
        const result = {};
        for (const key in data) result[key] = deserializeData(data[key]);
        return result;
    }
    return data;
}

async function restore() {
  const data = JSON.parse(fs.readFileSync("firestore_backup.json", "utf8"));
  console.log('--- BẮT ĐẦU PHỤC HỒI ---');

  for (const colName in data) {
    console.log(`Đang ghi dữ liệu vào bảng: ${colName}...`);
    const batch = db.batch();
    let count = 0;

    for (const docId in data[colName]) {
      const docRef = db.collection(colName).doc(docId);
      batch.set(docRef, deserializeData(data[colName][docId]));
      count++;
      
      if (count % 400 === 0) {
        await batch.commit();
        console.log(`... Đã ghi ${count} tài liệu`);
      }
    }
    await batch.commit();
    console.log(`=> Hoàn tất bảng ${colName} (${count} tài liệu)`);
  }
}

restore().catch(err => {
  console.error("Lỗi khi phục hồi Firestore:", err);
  process.exit(1);
});
EOF_NODE

echo "------------------------------------"
echo "PHỤC HỒI HOÀN TẤT!"
