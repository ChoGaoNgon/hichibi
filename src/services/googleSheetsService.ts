import { db, doc, getDoc } from '../firebase';

export async function syncOrderToGoogleSheets(order: any) {
  try {
    // Lấy link hook từ settings (để bạn dễ dàng thay đổi mà không cần sửa code)
    const docSnap = await getDoc(doc(db, 'settings', 'store_info'));
    const config = docSnap.exists() ? docSnap.data() : {};
    
    const hookUrl = config.googleSheetsHookUrl;
    const secretKey = "HICHIBI_SECRET_2026"; // Khớp với mã GAS ở trên

    if (!hookUrl) {
      console.warn('Google Sheets sync skipped: Missing hook URL');
      return;
    }

    const payload = {
      secret: secretKey,
      orderId: order.id,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      totalAmount: order.totalAmount,
      deliveryMethod: order.deliveryMethod,
      status: order.status,
      address: order.address,
      location: order.location ? `https://www.google.com/maps?q=${order.location.lat},${order.location.lng}` : '',
      items: order.items.map((item: any) => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price
      }))
    };

    // Sử dụng mode: 'no-cors' vì GAS thường gặp vấn đề CORS khi redirect
    await fetch(hookUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    console.log('Order synced to Google Sheets successfully');
  } catch (error) {
    console.error('Error syncing to Google Sheets:', error);
  }
}
