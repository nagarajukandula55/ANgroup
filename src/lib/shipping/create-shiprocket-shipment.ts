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
    throw new Error(
      "Order not found"
    );
  }

  console.log(
    "ORDER:",
    order.orderId
  );

  const orderItems = Array.isArray(
    order.items
  )
    ? order.items
    : [];

  if (!orderItems.length) {
    throw new Error(
      "No order items found"
    );
  }

  const payload = {
    order_id:
      order.orderId,

    order_date:
      new Date()
        .toISOString()
        .split("T")[0],

    pickup_location:
      "Primary",

    billing_customer_name:
      order.address?.name ||
      "Customer",

    billing_last_name: "",

    billing_address:
      order.address?.address ||
      "",

    billing_city:
      order.address?.city ||
      "",

    billing_pincode:
      order.address?.pincode ||
      "",

    billing_state:
      order.address?.state ||
      "",

    billing_country:
      "India",

    billing_email:
      order.address?.email ||
      "support@angroup.in",

    billing_phone:
      order.address?.phone ||
      "",

    shipping_is_billing: true,

    order_items:
      orderItems.map(
        (item: any) => ({
          name:
            item.name ||
            "Product",

          sku:
            item.snapshot
              ?.sku ||
            item.sku ||
            item.productKey ||
            "SKU",

          units:
            Number(
              item.qty || 1
            ),

          selling_price:
            Number(
              item.price || 0
            ),

          discount: 0,

          tax:
            Number(
              item.cgst || 0
            ) +
            Number(
              item.sgst || 0
            ) +
            Number(
              item.igst || 0
            ),
        })
      ),

    payment_method:
      order.payment?.status ===
      "SUCCESS"
        ? "Prepaid"
        : "COD",

    sub_total:
      order.amount,

    length:
      order.shipping
        ?.dimensions
        ?.length || 10,

    breadth:
      order.shipping
        ?.dimensions
        ?.breadth || 10,

    height:
      order.shipping
        ?.dimensions
        ?.height || 10,

    weight:
      order.shipping
        ?.packageWeight ||
      0.5,
  };

  console.log(
    "SHIPROCKET PAYLOAD:",
    JSON.stringify(
      payload,
      null,
      2
    )
  );

  const createOrder =
    await shiprocketRequest(
      "/orders/create/adhoc",
      {
        method: "POST",
        body: JSON.stringify(
          payload
        ),
      }
    );

  console.log(
    "SHIPROCKET CREATE ORDER:",
    createOrder
  );

  const shipmentId =
    createOrder?.shipment_id;

  if (!shipmentId) {
    throw new Error(
      "Shiprocket shipment creation failed"
    );
  }

  const awbResponse =
    await shiprocketRequest(
      "/courier/assign/awb",
      {
        method: "POST",
        body: JSON.stringify({
          shipment_id:
            shipmentId,

          courier_id:
            Number(
              courierId
            ),
        }),
      }
    );

  console.log(
    "AWB RESPONSE:",
    awbResponse
  );

  const awb =
    awbResponse?.response
      ?.data?.awb_code;

  if (!awb) {
    throw new Error(
      "AWB generation failed"
    );
  }

  const labelResponse =
    await shiprocketRequest(
      "/courier/generate/label",
      {
        method: "POST",
        body: JSON.stringify({
          shipment_id: [
            shipmentId,
          ],
        }),
      }
    );

  console.log(
    "LABEL RESPONSE:",
    labelResponse
  );

  return {
    shipmentId,

    awb,

    labelUrl:
      labelResponse
        ?.label_url ||
      "",
  };
}
