import mongoose, {
  Connection,
  Schema,
} from "mongoose";

/* =========================================================
   NATIVE PRODUCT SCHEMA
========================================================= */

const NativeProductSchema = new Schema(
  {
    name: String,

    slug: String,

    productKey: String,

    category: String,

    brand: String,

    subcategory: String,

    gstCategory: String,

    gstDescription: String,

    hsn: String,

    tax: Number,

    description: String,

    shortDescription: String,

    ingredients: [String],

    fssaiNumber: String,

    manufacturerName: String,

    manufacturerAddress: String,

    countryOfOrigin: String,

    storageInstructions: String,

    allergenInfo: String,

    usageInstructions: String,

    safetyInfo: String,

    images: [String],

    primaryImage: String,

    variants: Array,

    primaryVariant: Object,

    pricing: Object,

    nutrition: Object,

    tags: String,

    ai: Object,

    status: String,

    isActive: Boolean,

    isListed: Boolean,

    isDeleted: Boolean,

    createdBy: String,

    editRequired: Boolean,

    history: Array,
  },
  {
    timestamps: true,
    collection: "products",
  }
);

/* =========================================================
   MODEL GETTER
========================================================= */

export const getNativeProductModel = (
  conn: Connection
) => {
  return (
    conn.models.NativeProduct ||
    conn.model(
      "NativeProduct",
      NativeProductSchema
    )
  );
};
