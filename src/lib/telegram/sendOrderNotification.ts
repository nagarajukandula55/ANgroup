export async function sendOrderNotification(
  order: any
) {
  try {
    const message = `
🛒 NEW ORDER RECEIVED

Order ID:
${order.orderId}

Customer:
${order.address?.name}

Phone:
${order.address?.phone}

Amount:
₹${order.amount}

Payment:
${order.payment?.status}

Items:
${order.cart?.map(
  (i:any)=>
    `• ${i.name} x ${i.qty}`
).join("\n")}
`;

    await fetch(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          chat_id:
            process.env.TELEGRAM_GROUP_ID,
          text: message,
          parse_mode: "HTML",
        }),
      }
    );
  } catch (err) {
    console.error(
      "Telegram Error",
      err
    );
  }
}
