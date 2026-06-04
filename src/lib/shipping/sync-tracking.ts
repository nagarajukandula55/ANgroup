import Order from "@/models/Order";
import { shiprocketRequest } from "./shiprocket";

export async function syncTracking(
  awbNumber: string
) {
  const order = await Order.findOne({
    "shipping.awbNumber": awbNumber,
  });

  if (!order) {
    throw new Error("Order not found");
  }

  const response =
    await shiprocketRequest(
      `/courier/track/awb/${awbNumber}`
    );

  const trackingData =
  response?.tracking_data;

if (!trackingData) {
  return {
    success: true,

    awb: awbNumber,

    orderId:
      order.orderId,

    trackingStatus:
      "NOT_AVAILABLE",

    tracking:
      response,
  };
}

  const shipmentStatus =
    trackingData?.shipment_status ||
    trackingData?.current_status ||
    "UNKNOWN";

  order.shipping.trackingStatus =
    shipmentStatus;

  const statusText =
    String(shipmentStatus).toUpperCase();

  if (
    statusText.includes(
      "OUT FOR DELIVERY"
    )
  ) {
    order.status =
      "OUT_FOR_DELIVERY";

    if (!order.statusTimeline) {
      order.statusTimeline = {};
    }
    order.statusTimeline.outForDeliveryAt =
      new Date();
  }

  if (
    statusText.includes(
      "DELIVERED"
    )
  ) {
    order.status =
      "DELIVERED";

    order.statusTimeline.deliveredAt =
      new Date();
  }

  if (
    statusText.includes(
      "IN TRANSIT"
    ) ||
    statusText.includes(
      "SHIPPED"
    )
  ) {
    order.status =
      "DISPATCHED";
  }

  order.events.push({
    type: "STATUS_CHANGED",
    data: {
      trackingStatus:
        shipmentStatus,
    },
    at: new Date(),
  });

  await order.save();

  return {
    success: true,
  
    awb: awbNumber,
  
    orderId:
      order.orderId,
  
    trackingStatus:
      shipmentStatus,
  
    tracking: response,
  };
}
