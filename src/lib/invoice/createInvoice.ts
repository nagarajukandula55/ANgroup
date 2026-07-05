import Invoice from "@/models/Invoice";
import Order from "@/models/Order";
import { getFinancialYear } from "@/core/numbering/financialYear";
import { generateDocumentNumber } from "@/core/numbering/numberingService";

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

    const invoiceItems = items.map((item: any) => {
    const qty = Number(item.qty || 1);
  
    const price = Number(
      item.price ||
      item.sellingPrice ||
      0
    );
  
    const taxableValue = Number(
      item.taxableValue ||
      item.taxable ||
      0
    );
  
    const gstPercent = Number(
      item.gstRate ||
      item.gstPercent ||
      0
    );
  
    const itemCgst = Number(
      item.cgst ||
      item.cgstAmount ||
      0
    );
  
    const itemSgst = Number(
      item.sgst ||
      item.sgstAmount ||
      0
    );
  
    const itemIgst = Number(
      item.igst ||
      item.igstAmount ||
      0
    );
  
    subtotal += taxableValue;
  
    cgst += itemCgst;
    sgst += itemSgst;
    igst += itemIgst;
        
      return {
        productId: item.productId || "",
      
        name: item.name || "",
      
        hsn:
          item.hsn ||
          item.snapshot?.hsn ||
          item.product?.hsn ||
          "1101",
      
        qty,
      
        price,
      
        discount: Number(
          item.discount || 0
        ),
      
        taxableValue,
      
        gstPercent,
      
        cgst: itemCgst,
      
        sgst: itemSgst,
      
        igst: itemIgst,
      
        total:
          Number(
            item.lineTotal ||
            item.total ||
            taxableValue +
            itemCgst +
            itemSgst +
            itemIgst
          ),
      };
  });

    const subtotalValue =
      Number(order.subtotal || subtotal);
    
    const discountValue =
      Number(order.discount || 0);
    
    const taxableAmount =
      Number(order.taxableAmount || subtotal);
    
    const cgstValue =
      Number(order.cgst || cgst);
    
    const sgstValue =
      Number(order.sgst || sgst);
    
    const igstValue =
      Number(order.igst || igst);
    
    const grandTotal =
      Number(
        order.amount ||
        taxableAmount +
        cgstValue +
        sgstValue +
        igstValue
      );

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
          (await generateDocumentNumber(String(order.businessId || ""), "INVOICE")).value,

        financialYear:
          getFinancialYear(),

        invoiceType: isB2B
          ? "B2B"
          : "B2C",

        orderNumber: order.orderId,

        orderDate:
          order.createdAt || new Date(),
        
        gstMode:
          order.gstMode || "INCLUSIVE",
        
        gstType:
          order.gstType || "B2C",

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

        subtotal: subtotalValue,

        discount: discountValue,
        
        taxableAmount,
        
        cgst: cgstValue,
        
        sgst: sgstValue,
        
        igst: igstValue,
        
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
 * REMOVED: a local generateInvoiceNumber() used to live here, deriving the
 * next number from `Invoice.countDocuments({ financialYear: fy })` — a
 * genuine race condition (two concurrent invoice generations for the same
 * business/financial-year could read the same count and produce the same
 * number), and it also hardcoded the "NA-" prefix regardless of what an
 * admin configured in Settings > Document Numbers. Replaced with the
 * canonical core/numbering/numberingService.ts's generateDocumentNumber(),
 * which increments atomically via MongoDB's findOneAndUpdate + $inc and
 * respects the business's actual DocumentNumberConfig. See
 * core/numbering/types.ts for the full consolidation writeup — this was
 * one of the six duplicate generators being replaced.
 */
