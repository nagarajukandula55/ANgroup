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

  const id =
    item.productId ||
    item._id ||
    item.productKey;

  if (!id) {
    throw new Error("Missing product identifier");
  }

  console.log("RESOLVING PRODUCT WITH ID:", id);

  let product: NativeProduct | null = null;

  /* =========================================================
     SINGLE SAFE QUERY (NO MULTI PASS, NO NULL BUGS)
  ========================================================= */

  const query: any = {
    isDeleted: false,
    $or: [
      { productKey: id },
    ],
  };

  // only add _id check if valid ObjectId
  if (this.isObjectId(id)) {
    query.$or.push({ _id: id });
  }

  product = await Product.findOne(query).lean<NativeProduct>();

  /* =========================================================
     HARD FAILURE
  ========================================================= */

  if (!product) {
    console.error("PRODUCT NOT FOUND:", {
      item,
      query,
    });

    throw new Error(
      `Product not found: ${id}`
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
