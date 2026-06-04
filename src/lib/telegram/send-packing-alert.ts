import Order from "@/models/Order";

export async function sendPackingAlert(orderId: string) {
  const order = await Order.findOne({ orderId });

  if (!order) throw new Error("Order not found");

  const itemsText = order.items
    .map(
      (i: any, idx: number) =>
        `${idx + 1}. ${i.name} x ${i.qty}`
    )
    .join("\n");

  const message = `
📦 NEW PACKING ORDER

🆔 Order: ${order.orderId}
👤 Customer: ${order.address?.name}
📞 Phone: ${order.address?.phone}

📍 Address:
${order.address?.addressLine1 || ""}

🛒 Items:
${itemsText}

💰 Amount: ₹${order.amount}
💳 Payment: ${order.payment?.status}

🚚 Shipping: ${order.shipping?.dispatchType || "NA"}
📦 Weight: ${order.shipping?.packageWeight || "-"} kg

⚠️ PLEASE PACK CAREFULLY
`;

  await fetch(process.env.TELEGRAM_BOT_URL!, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: process.env.TELEGRAM_CHAT_ID,
      text: message,
    }),
  });

  return { success: true };
}
