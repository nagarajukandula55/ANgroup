import Coupon from "@/models/Coupon";

export async function validateCoupon(code: string, cartTotal: number) {
  if (!code) return { discount: 0, coupon: null };

  const coupon = await Coupon.findOne({
    code: code.toUpperCase(),
    active: true,
  });

  if (!coupon) {
    throw new Error("Invalid coupon");
  }

  if (coupon.expiresAt && coupon.expiresAt < new Date()) {
    throw new Error("Coupon expired");
  }

  if (cartTotal < coupon.minOrderValue) {
    throw new Error("Cart value too low for coupon");
  }

  let discount = 0;

  if (coupon.type === "FLAT") {
    discount = coupon.value;
  }

  if (coupon.type === "PERCENT") {
    discount = (cartTotal * coupon.value) / 100;

    if (coupon.maxDiscount > 0) {
      discount = Math.min(discount, coupon.maxDiscount);
    }
  }

  await Coupon.updateOne(
    { _id: coupon._id },
    { $inc: { usedCount: 1 } }
  );

  return { discount, coupon };
}
