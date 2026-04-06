const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Danh sách các bảng (collections) quan trọng của ứng dụng
const COLLECTIONS = ['categories', 'products', 'vouchers', 'settings', 'users', 'orders'];

// Hàm hỗ trợ để xử lý các kiểu dữ liệu đặc biệt của Firestore (như Timestamp)
function serializeData(data) {
    if (!data) return data;
    if (data instanceof admin.firestore.Timestamp) {
        return { _type: 'timestamp', seconds: data.seconds, nanoseconds: data.nanoseconds };
    }
    if (Array.isArray(data)) {
        return data.map(serializeData);
    }
    if (typeof data === 'object') {
        const result = {};
        for (const key in data) {
            result[key] = serializeData(data[key]);
        }
        return result;
    }
    return data;
}

function deserializeData(data) {
    if (!data) return data;
    if (typeof data === 'object' && data._type === 'timestamp') {
        return new admin.firestore.Timestamp(data.seconds, data.nanoseconds);
    }
    if (Array.isArray(data)) {
        return data.map(deserializeData);
    }
    if (typeof data === 'object') {
        const result = {};
        for (const key in data) {
            result[key] = deserializeData(data[key]);
        }
        return result;
    }
    return data;
}

async function backup(serviceAccountPath, outputFile) {
    try {
        const serviceAccount = require(path.resolve(serviceAccountPath));
        if (!admin.apps.length) {
            admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
        }
        const db = admin.firestore();
        const backupData = {};

        console.log('--- BẮT ĐẦU SAO LƯU ---');
        for (const colName of COLLECTIONS) {
            console.log(`Đang lấy dữ liệu bảng: ${colName}...`);
            const snapshot = await db.collection(colName).get();
            backupData[colName] = {};
            
            snapshot.forEach(doc => {
                backupData[colName][doc.id] = serializeData(doc.data());
            });
            console.log(`=> Đã lấy ${snapshot.size} tài liệu từ ${colName}`);
        }

        fs.writeFileSync(outputFile, JSON.stringify(backupData, null, 2));
        console.log('--- SAO LƯU HOÀN TẤT ---');
        console.log(`File lưu tại: ${outputFile}`);
    } catch (error) {
        console.error('Lỗi khi sao lưu:', error);
        process.exit(1);
    }
}

async function restore(serviceAccountPath, inputFile) {
    try {
        const serviceAccount = require(path.resolve(serviceAccountPath));
        if (!admin.apps.length) {
            admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
        }
        const db = admin.firestore();
        
        if (!fs.existsSync(inputFile)) {
            console.error(`[LOI] Khong tim thay file: ${inputFile}`);
            return;
        }

        const data = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
        console.log('--- BẮT ĐẦU PHỤC HỒI ---');

        for (const colName in data) {
            console.log(`Đang ghi dữ liệu vào bảng: ${colName}...`);
            const batch = db.batch();
            let count = 0;

            for (const docId in data[colName]) {
                const docRef = db.collection(colName).doc(docId);
                batch.set(docRef, deserializeData(data[colName][docId]));
                count++;
                
                // Firebase batch limit is 500
                if (count % 400 === 0) {
                    await batch.commit();
                    console.log(`... Đã ghi ${count} tài liệu`);
                }
            }
            
            await batch.commit();
            console.log(`=> Hoàn tất bảng ${colName} (${count} tài liệu)`);
        }
        console.log('--- PHỤC HỒI HOÀN TẤT ---');
    } catch (error) {
        console.error('Lỗi khi phục hồi:', error);
        process.exit(1);
    }
}

const action = process.argv[2];
const keyPath = process.argv[3];
const filePath = process.argv[4];

if (action === 'backup') {
    backup(keyPath, filePath).catch(console.error);
} else if (action === 'restore') {
    restore(keyPath, filePath).catch(console.error);
}
