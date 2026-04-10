import { db, doc, getDoc } from '../firebase';

export async function sendTelegramNotification(order: any) {
  try {
    // Fetch store info for telegram config
    const docSnap = await getDoc(doc(db, 'settings', 'store_info'));
    if (!docSnap.exists()) return;

    const config = docSnap.data();
    const token = config.telegramBotToken;
    const chatId = config.telegramChatId;

    if (!token || !chatId) {
      console.warn('Telegram notification skipped: Missing token or chatId');
      return;
    }

    const itemsText = order.items.map((item: any) => `- ${item.name} x ${item.quantity}`).join('\n');
    
    const deliveryMethodMap: Record<string, string> = {
      'delivery': 'Giao tận nơi',
      'pickup': 'Đến lấy mang đi',
      'dine-in': 'Uống tại quán'
    };
    const deliveryMethodText = deliveryMethodMap[order.deliveryMethod] || order.deliveryMethod;

    const text = `🚨 ĐƠN HÀNG MỚI

👤 Khách: ${order.customerName}
📞 ${order.customerPhone}
📍 Địa chỉ: ${order.address}
${order.location ? `🗺 Map: https://www.google.com/maps?q=${order.location.lat},${order.location.lng}\n` : ''}🚚 Phương thức giao: ${deliveryMethodText}

🍜 Món:
${itemsText}

💰 Tổng: ${order.totalAmount.toLocaleString('vi-VN')}đ`;

    const url = `https://api.telegram.org/bot${token}/sendMessage`;

    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: text
      })
    });
  } catch (error) {
    console.error('Error sending Telegram notification:', error);
  }
}
