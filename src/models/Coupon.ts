import mongoose from "mongoose";

const CouponSchema = new mongoose.Schema({
  code: { type: String, unique: true, index: true },
  type: { type: String, enum: ["FLAT", "PERCENT"] },
  value: Number,

  minOrderValue: { type: Number, default: 0 },
  maxDiscount: { type: Number, default: 0 },

  expiresAt: Date,
  usageLimit: Number,
  usedCount: { type: Number, default: 0 },

  active: { type: Boolean, default: true },
});

export default mongoose.models.Coupon ||
  mongoose.model("Coupon", CouponSchema);
