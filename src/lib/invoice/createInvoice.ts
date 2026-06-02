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
  try {
    console.log("================================");
    console.log("CREATE INVOICE START");
    console.log(
      "ORDER NUMBER RECEIVED:",
      orderNumber
    );
    console.log(
      "SCHEMA TYPE:",
      Invoice.schema.path("orderId")?.instance
    );
    console.log("================================");

    if (!orderNumber) {
      throw new Error("orderId is required");
    }

    /* =========================================
       FETCH ORDER
    ========================================= */

    const order = await Order.findOne({
      orderId: orderNumber,
    });

    if (!order) {
      throw new Error("Order not found");
    }

    console.log("ORDER FOUND");
    console.log("ORDER NUMBER:", order.orderId);
    console.log("ORDER MONGO ID:", order._id);

    /* =========================================
       CHECK EXISTING INVOICE
    ========================================= */

    const existingInvoice =
      await Invoice.findOne({
        orderId: order._id,
      });

    if (existingInvoice) {
      console.log(
        "EXISTING INVOICE FOUND:",
        existingInvoice.invoiceNumber
      );

      return existingInvoice;
    }

    const isB2B =
      order.customerType === "B2B";

    /* =========================================
       BUILD ITEMS
    ========================================= */

    const items = Array.isArray(order.items)
      ? order.items
      : Array.isArray(order.cart)
      ? order.cart
      : [];

    let subtotal = 0;
    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    const invoiceItems = items.map(
      (item: any) => {
        const qty = Number(item.qty || 1);
        const price = Number(item.price || 0);
        const gstPercent = Number(
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
            (taxableValue * gstPercent) /
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

    console.log("ABOUT TO CREATE INVOICE");
    console.log({
      mongoOrderId: order._id,
      orderNumber: order.orderId,
      businessId: order.businessId,
      subtotal,
      grandTotal,
    });

    /* =========================================
       CREATE INVOICE
    ========================================= */

    const mapPaymentStatus = (status: string) => {
    switch (status) {
      case "SUCCESS":
      case "PAID":
        return "PAID";
      case "FAILED":
        return "FAILED";
      case "PARTIAL":
        return "PARTIAL";
      default:
        return "PENDING";
    }
  };
    
    const invoice =
      await Invoice.create({
        businessId:
          order.businessId ||
          "DEFAULT",

        // IMPORTANT FIX
        orderId: order._id,

        invoiceNumber:
          await generateInvoiceNumber(),

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
            order.address?.gstNumber ||
            "",

          address:
            order.address?.address ||
            "",

          city:
            order.address?.city ||
            "",

          state:
            order.address?.state ||
            "",

          pincode:
            order.address?.pincode ||
            "",
        },

        items: invoiceItems,

        subtotal,

        taxableAmount:
          subtotal,

        cgst,
        sgst,
        igst,

        grandTotal,

        paymentStatus: mapPaymentStatus(order.payment?.status),

        status: "GENERATED",

        generatedAt:
          new Date(),

        locked: true,

        audit: {
          source:
            "AUTO_ORDER_SUCCESS",
        },
      });

    console.log(
      "INVOICE CREATED SUCCESSFULLY"
    );

    console.log(
      "INVOICE NUMBER:",
      invoice.invoiceNumber
    );

    console.log(
      "INVOICE ID:",
      invoice._id
    );

    return invoice;
  } catch (err: any) {
    console.error(
      "================================"
    );

    console.error(
      "CREATE INVOICE ERROR"
    );

    console.error(err);

    console.error(
      "MESSAGE:",
      err?.message
    );

    console.error(
      "STACK:",
      err?.stack
    );

    console.error(
      "================================"
    );

    throw err;
  }
}

/**
 * SIMPLE INVOICE NUMBER
 */
async function generateInvoiceNumber() {
  const fy = getFinancialYear(); // "2026-27"

  // convert 2026-27 → 2627
  const fyCode = fy.replace("20", "").replace("-", "");

  const count = await Invoice.countDocuments({
    financialYear: fy,
  });

  const sequence = String(count + 1).padStart(5, "0");

  return `NA-${fyCode}-${sequence}`;
}
