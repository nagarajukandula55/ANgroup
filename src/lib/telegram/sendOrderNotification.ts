export async function sendOrderNotification(order: any) {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_GROUP_ID;

    if (!token || !chatId) {
      console.log("Telegram config missing");
      return;
    }

    // =========================
    // ITEMS FORMAT
    // =========================
    const itemsText =
      order.items?.length
        ? order.items
            .map(
              (item: any, i: number) =>
                `${i + 1}. ${item.name} x ${item.qty} (₹${item.price})`
            )
            .join("\n")
        : "No items";

    // =========================
    // ADDRESS FORMAT
    // =========================
    const address = order.address
      ? `
🏠 Address:
${order.address.addressLine1 || ""}
${order.address.city || ""}, ${order.address.state || ""}
Pincode: ${order.address.pincode || ""}
`
      : "";

    // =========================
    // SHIPPING INFO
    // =========================
    const shipping = order.shipping
      ? `
🚚 Shipping:
Courier: ${order.shipping.courierPartner || "-"}
AWB: ${order.shipping.awbNumber || "-"}
Status: ${order.shipping.trackingStatus || "PENDING"}
Weight: ${order.shipping.packageWeight || "-"} kg
`
      : "";

    // =========================
    // FINAL MESSAGE
    // =========================
    const message = `
<b>🛒 NEW ORDER RECEIVED</b>

<b>Order ID:</b> ${order.orderId}
<b>Status:</b> ${order.status}

<b>👤 Customer</b>
Name: ${order.address?.name || "-"}
Phone: ${order.address?.phone || "-"}

💰 Amount: ₹${order.amount}

<b>🛍 Items</b>
${itemsText}

${address}

${shipping}

⚠️ <b>Action Required:</b>
- Verify payment
- Start packing
- Prepare shipment
`;

    // =========================
    // SEND TO TELEGRAM
    // =========================
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
    console.error("Telegram notification failed", err);
  }
}
