import { getProductModel } from "@/models/Product";
import { connectNativeDB } from "@/lib/native-mongodb";
import type mongoose from "mongoose";

/* =========================================================
   GLOBAL DB SINGLETON (STRICT + TYPE SAFE)
========================================================= */

declare global {
  // eslint-disable-next-line no-var
  var nativeConn: mongoose.Connection | undefined;
}

async function getNativeConn(): Promise<mongoose.Connection> {
  if (globalThis.nativeConn) return globalThis.nativeConn;

  const conn = await connectNativeDB();
  globalThis.nativeConn = conn;

  return conn;
}

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
   SERVICE
========================================================= */

export class ProductService {
  static isObjectId(id: string) {
    return /^[0-9a-fA-F]{24}$/.test(id);
  }

  /**
   * Normalize incoming identifiers into a single candidate list
   */
  private static buildCandidates(item: any): string[] {
    const candidates: string[] = [];

    if (item.productId) candidates.push(item.productId);
    if (item._id) candidates.push(item._id);
    if (item.productKey) candidates.push(item.productKey);

    // remove duplicates
    return [...new Set(candidates)];
  }

  /**
   * Resolve product using multi-strategy fallback chain
   */
  static async resolveProduct(
    item: any
  ): Promise<{ product: NativeProduct; qty: number }> {
    const qty = Number(item.qty);

    if (!qty || qty <= 0) {
      throw new Error("Invalid quantity");
    }

    const conn = await getNativeConn();
    const Product = getProductModel(conn);

    const candidates = this.buildCandidates(item);

    console.log("PRODUCT RESOLUTION INPUT:", {
      item,
      candidates,
    });

    let product: NativeProduct | null = null;

    /* =========================================================
       STRATEGY 1: OBJECTID MATCH (FAST PATH)
    ========================================================= */
    for (const id of candidates) {
      if (this.isObjectId(id)) {
        product = await Product.findOne({
          _id: id,
          isDeleted: false,
        }).lean<NativeProduct>();

        if (product) break;
      }
    }

    /* =========================================================
       STRATEGY 2: PRODUCT KEY MATCH (PRIMARY BUSINESS KEY)
    ========================================================= */
    if (!product) {
      for (const key of candidates) {
        product = await Product.findOne({
          productKey: key,
          isDeleted: false,
        }).lean<NativeProduct>();

        if (product) break;
      }
    }

    /* =========================================================
       STRATEGY 3: CROSS MATCH (_id == productKey CASE FIX)
    ========================================================= */
    if (!product) {
      const fallback = item.productKey || item._id || item.productId;

      if (fallback) {
        product = await Product.findOne({
          $or: [
            { productKey: fallback },
            { _id: this.isObjectId(fallback) ? fallback : null },
          ],
          isDeleted: false,
        }).lean<NativeProduct>();
      }
    }

    /* =========================================================
       HARD FAILURE
    ========================================================= */
    if (!product) {
      console.error("PRODUCT NOT FOUND FINAL:", item);
      throw new Error(
        `Product not found (checked all identifiers): ${JSON.stringify(item)}`
      );
    }

    return { product, qty };
  }

  /**
   * Price resolver (strict)
   */
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
