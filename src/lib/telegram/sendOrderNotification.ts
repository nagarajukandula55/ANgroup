export async function sendOrderNotification(order: any) {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_GROUP_ID;

    if (!token || !chatId) return;

    const message = `
🛒 NEW ORDER RECEIVED

Order ID: ${order.orderId}

Customer: ${order.address?.name}

Phone: ${order.address?.phone}

Amount: ₹${order.amount}

Status: ${order.status}
`;

    await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: "HTML",
        }),
      }
    );
  } catch (err) {
    console.error(
      "Telegram notification failed",
      err
    );
  }
}
