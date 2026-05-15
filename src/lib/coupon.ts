type ValidateCouponResult = {
  valid: boolean;
  discount: number;
  coupon?: any;
};

export async function validateCoupon(
  code: string,
  subtotal: number
): Promise<ValidateCouponResult> {
  try {
    if (!code) {
      return {
        valid: false,
        discount: 0,
      };
    }

    // your coupon lookup logic

    return {
      valid: true,
      discount: 100,
      coupon: {},
    };
  } catch (err) {
    return {
      valid: false,
      discount: 0,
    };
  }
}
