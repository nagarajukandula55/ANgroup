import Order from "@/models/Order";
import { shiprocketRequest } from "./shiprocket";

export async function createShiprocketShipment(
  orderId: string,
  courierId: string
) {
  const order = await Order.findOne({
    orderId,
  });

  if (!order) {
    throw new Error("Order not found");
  }

  /* =====================================
     CREATE SHIPROCKET ORDER
  ===================================== */

  const payload = {
    order_id: order.orderId,

    order_date: new Date()
      .toISOString()
      .split("T")[0],

    pickup_location: "Primary",

    billing_customer_name:
      order.address?.name || "",

    billing_last_name: "",

    billing_address:
      order.address?.address || "",

    billing_city:
      order.address?.city || "",

    billing_pincode:
      order.address?.pincode || "",

    billing_state:
      order.address?.state || "",

    billing_country: "India",

    billing_email:
      order.address?.email ||
      "support@angroup.in",

    billing_phone:
      order.address?.phone || "",

    shipping_is_billing: true,

    order_items:
      order.items.map((item: any) => ({
        name: item.name,

        sku:
          item.snapshot?.sku ||
          item.sku ||
          item.productKey,

        units: item.qty,

        selling_price:
          item.price,

        discount: 0,

        tax: item.cgst +
          item.sgst +
          item.igst,
      })),

    payment_method:
      order.payment?.status ===
      "SUCCESS"
        ? "Prepaid"
        : "COD",

    sub_total:
      order.billing?.grandTotal ||
      order.amount,

    length:
      order.shipping?.dimensions
        ?.length || 10,

    breadth:
      order.shipping?.dimensions
        ?.breadth || 10,

    height:
      order.shipping?.dimensions
        ?.height || 10,

    weight:
      order.shipping
        ?.packageWeight || 0.5,
  };

  const createOrder =
    await shiprocketRequest(
      "/orders/create/adhoc",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );

  const shipmentId =
    createOrder.shipment_id;

  if (!shipmentId) {
    throw new Error(
      "Shipment creation failed"
    );
  }

  /* =====================================
     ASSIGN COURIER
  ===================================== */

  const awbResponse =
    await shiprocketRequest(
      "/courier/assign/awb",
      {
        method: "POST",
        body: JSON.stringify({
          shipment_id: shipmentId,
          courier_id: Number(
            courierId
          ),
        }),
      }
    );

  const awb =
    awbResponse.response?.data
      ?.awb_code;

  if (!awb) {
    throw new Error(
      "AWB generation failed"
    );
  }

  /* =====================================
     GENERATE LABEL
  ===================================== */

  const labelResponse =
    await shiprocketRequest(
      "/courier/generate/label",
      {
        method: "POST",
        body: JSON.stringify({
          shipment_id: [shipmentId],
        }),
      }
    );

  const labelUrl =
    labelResponse.label_url ||
    "";

  return {
    shipmentId,
    awb,
    labelUrl,
  };
}
