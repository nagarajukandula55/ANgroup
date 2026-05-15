handler: async function(response) {

  await fetch(
    "/api/payment/verify",
    {
      method: "POST",
      body: JSON.stringify({
        razorpay_payment_id:
          response.razorpay_payment_id,

        razorpay_order_id:
          response.razorpay_order_id,

        razorpay_signature:
          response.razorpay_signature,

        orderId,
      }),
    }
  );
}
