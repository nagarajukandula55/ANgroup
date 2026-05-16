import { getProductModel } from "@/models/Product";
import { connectNativeDB } from "@/lib/native-mongodb";
import type mongoose from "mongoose";

/* =========================================================
   GLOBAL DB SINGLETON (SAFE FOR NEXT.JS HOT RELOAD)
========================================================= */

const getNativeConn = async (): Promise<mongoose.Connection> => {
  if (globalThis.nativeConn) return globalThis.nativeConn;

  const conn = await connectNativeDB();
  globalThis.nativeConn = conn;

  return conn;
};

/* =========================================================
   TYPES
========================================================= */

export type NativeProduct = {
  _id: any;
  productKey: string;
  name: string;
  tax?: number;
  primaryVariant?: { price?: number; mrp?: number };
  pricing?: { sellingPrice?: number; mrp?: number };
  isDeleted?: boolean;
};

/* =========================================================
   PRODUCT SERVICE
========================================================= */

export class ProductService {
  static isObjectId(id: string) {
    return /^[0-9a-fA-F]{24}$/.test(id);
  }

  /* ---------------------------------------------------------
     RESOLVE PRODUCT (SAFE + PRIORITY BASED LOOKUP)
  --------------------------------------------------------- */

  static async resolveProduct(
    item: any
  ): Promise<{ product: NativeProduct; qty: number }> {
    const qty = Number(item.qty);

    if (!qty || qty <= 0) {
      throw new Error("Invalid quantity");
    }

    const id = item.productId || item._id;

    const conn = await getNativeConn();
    const Product = getProductModel(conn);

    let product: NativeProduct | null = null;

    /* =========================================================
       1. OBJECT ID LOOKUP (FAST PATH)
    ========================================================= */

    if (id && this.isObjectId(id)) {
      product = await Product.findOne({
        _id: id,
        isDeleted: false,
      }).lean<NativeProduct>();
    }

    /* =========================================================
       2. PRODUCT KEY LOOKUP (PRIMARY BUSINESS KEY)
    ========================================================= */

    if (!product && item.productKey) {
      product = await Product.findOne({
        productKey: item.productKey,
        isDeleted: false,
      }).lean<NativeProduct>();
    }

    /* =========================================================
       3. FALLBACK SAFETY (NO GUESSING)
    ========================================================= */

    if (!product && typeof id === "string") {
      product = await Product.findOne({
        productKey: id,
        isDeleted: false,
      }).lean<NativeProduct>();
    }

    /* =========================================================
       HARD FAILURE (CLEAN ERROR)
    ========================================================= */

    if (!product) {
      throw new Error(
        `Product not found: ${item.productKey || id}`
      );
    }

    return { product, qty };
  }

  /* ---------------------------------------------------------
     PRICE RESOLUTION (STRICT SAFE)
  --------------------------------------------------------- */

  static getPrice(product: NativeProduct): number {
    const price =
      product.primaryVariant?.price ??
      product.pricing?.sellingPrice;

    if (price == null || isNaN(price)) {
      throw new Error(
        `Invalid price for product: ${product.productKey}`
      );
    }

    return price;
  }
}
