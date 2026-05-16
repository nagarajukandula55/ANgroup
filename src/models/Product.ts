import mongoose from "mongoose";

const ProductSchema = new mongoose.Schema(
  {
    name: String,
    slug: String,

    productKey: String,

    tax: Number,

    isDeleted: {
      type: Boolean,
      default: false,
    },

    isActive: Boolean,
    isListed: Boolean,

    primaryVariant: {
      price: Number,
      mrp: Number,
    },

    pricing: {
      sellingPrice: Number,
      mrp: Number,
    },
  },
  {
    timestamps: true,
    strict: false, // IMPORTANT
  }
);

/* =========================================================
   NATIVE DB MODEL
========================================================= */

export const getProductModel = (
  conn: mongoose.Connection
) => {
  return (
    conn.models.Product ||
    conn.model("Product", ProductSchema)
  );
};
