import Invoice from "@/models/Invoice";
import Order from "@/models/Order";
import { getFinancialYear } from "@/lib/invoice/getFinancialYear";

/**
 * CREATE INVOICE FOR ORDER
 * SAFE + IDEMPOTENT
 */
export async function createInvoiceForOrder(
  orderNumber: string
) {

  console.log("ORDER ID RECEIVED:", orderId);
  console.log(
    "SCHEMA TYPE:",
    Invoice.schema.path("orderId").instance
  );
  
  try {
    if (!orderNumber) {
      throw new Error("orderId is required");
    }

    /* ================= FETCH ORDER ================= */

    const order = await Order.findOne({
      orderId: orderNumber,
    });

    if (!order) {
      throw new Error("Order not found");
    }

    /* ================= CHECK EXISTING ================= */

    const existingInvoice =
      await Invoice.findOne({
        orderId: order._id,
      });

    if (existingInvoice) {
      return existingInvoice;
    }

    const isB2B =
      order.customerType === "B2B";

    /* ================= BUILD ITEMS ================= */

    const items = Array.isArray(order.items)
      ? order.items
      : [];

    let subtotal = 0;
    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    const invoiceItems = items.map(
      (item: any) => {
        const qty =
          Number(item.qty || 1);

        const price =
          Number(item.price || 0);

        const gstPercent =
          Number(
            item.gstPercent || 0
          );

        const taxableValue =
          qty * price;

        subtotal += taxableValue;

        let itemCgst = 0;
        let itemSgst = 0;
        let itemIgst = 0;

        if (isB2B) {
          const gstAmount =
            (taxableValue *
              gstPercent) /
            100;

          const sameState =
            order.address?.state &&
            order.business?.state &&
            order.address.state ===
              order.business.state;

          if (sameState) {
            itemCgst =
              gstAmount / 2;

            itemSgst =
              gstAmount / 2;
          } else {
            itemIgst =
              gstAmount;
          }

          cgst += itemCgst;
          sgst += itemSgst;
          igst += itemIgst;
        }

        return {
          productId:
            item.productId || "",

          name:
            item.name || "",

          hsn:
            item.snapshot?.hsn ||
            item.hsn ||
            "",

          qty,
          price,
          taxableValue,
          gstPercent,

          cgst: itemCgst,
          sgst: itemSgst,
          igst: itemIgst,

          total:
            taxableValue +
            itemCgst +
            itemSgst +
            itemIgst,
        };
      }
    );

    const grandTotal =
      subtotal +
      cgst +
      sgst +
      igst;

    /* ================= CREATE INVOICE ================= */

    const invoice =
      await Invoice.create({
        businessId:
          order.businessId ||
          "DEFAULT",

        // IMPORTANT FIX
        orderId: order._id,

        invoiceNumber:
          generateInvoiceNumber(),

        financialYear:
          getFinancialYear(),

        invoiceType: isB2B
          ? "B2B"
          : "B2C",

        customer: {
          name:
            order.address?.name ||
            "",

          phone:
            order.address?.phone ||
            "",

          email:
            order.address?.email ||
            "",

          gstNumber:
            order.address
              ?.gstNumber || "",

          address:
            order.address
              ?.address || "",

          city:
            order.address?.city ||
            "",

          state:
            order.address
              ?.state || "",

          pincode:
            order.address
              ?.pincode || "",
        },

        items: invoiceItems,

        subtotal,

        taxableAmount:
          subtotal,

        cgst,
        sgst,
        igst,

        grandTotal,

        paymentStatus:
          order.payment?.status ||
          "PENDING",

        status: "GENERATED",

        generatedAt:
          new Date(),

        locked: true,
      });

    return invoice;
  } catch (err: any) {
    console.error(
      "createInvoiceForOrder error:",
      err?.message
    );

    throw err;
  }
}

/**
 * SIMPLE INVOICE NUMBER
 */
function generateInvoiceNumber() {
  const year =
    new Date().getFullYear();

  const random =
    Math.floor(
      100000 +
        Math.random() * 900000
    );

  return `INV-${year}-${random}`;
}
