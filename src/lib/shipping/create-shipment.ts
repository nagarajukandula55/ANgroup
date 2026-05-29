import Order from "@/models/Order";

interface ShipmentPayload {
  orderId: string;

  dispatchType: string;

  courierPartner?: string;

  courierId?: string;

  awbNumber?: string;

  trackingUrl?: string;

  by?: string;
}

export async function createShipment({
  orderId,
  dispatchType,
  courierPartner,
  courierId,
  awbNumber,
  trackingUrl,
  by = "ADMIN",
}: ShipmentPayload) {
  const order = await Order.findOne({
    orderId,
  });

  if (!order) {
    throw new Error("Order not found");
  }

  order.shipping = {
    ...order.shipping,

    dispatchType,

    courierPartner,

    courierId,

    awbNumber,

    trackingUrl,

    trackingStatus: "CREATED",

    shippedAt: new Date(),
  };

  order.shipmentCreated = true;

  order.events.push({
    type: "SHIPMENT_CREATED",

    message:
      "Shipment created successfully",

    by,

    data: {
      dispatchType,
      courierPartner,
      awbNumber,
    },

    createdAt: new Date(),
  });

  order.timeline.push({
    status: "DISPATCHED",

    note:
      "Shipment created and dispatched",

    by,

    role: "ADMIN",

    at: new Date(),
  });

  order.status = "DISPATCHED";

  await order.save();

  return {
    success: true,
    order,
  };
}
