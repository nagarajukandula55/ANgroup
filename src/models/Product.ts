import mongoose from "mongoose";

const ProductSchema = new mongoose.Schema(
  {
    name: String,
    price: Number,
    mrp: Number,
    stock: Number,
    status: String,
    gstPercent: Number,
    productId: String,
    productKey: String,
  },
  { timestamps: true }
);

// ❗ IMPORTANT: DO NOT bind to default mongoose connection

export const getProductModel = (conn: mongoose.Connection) => {
  return conn.models.Product || conn.model("Product", ProductSchema);
};
