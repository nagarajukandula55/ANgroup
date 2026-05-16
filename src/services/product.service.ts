import { getProductModel } from "@/models/Product";
import { connectNativeDB } from "@/lib/native-mongodb";
import mongoose from "mongoose";

/* =========================================================
   GLOBAL DB SINGLETON (STRICT + SAFE)
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
  /**
   * Check valid Mongo ObjectId
   */
  static isObjectId(id: string) {
    return mongoose.Types.ObjectId.isValid(id);
  }

  /**
   * Resolve product safely (FIXED)
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
       BUILD SAFE OR QUERY
    ========================================================== */

   const or: any[] = [
     { productKey: id },
   ];
   
   if (this.isObjectId(id)) {
     or.push({ _id: new mongoose.Types.ObjectId(id) });
   }
   
   const product = await Product.findOne({
     $or: or,
     $and: [
       {
         $or: [
           { isDeleted: false },
           { isDeleted: { $exists: false } },
         ],
       },
     ],
   }).lean();

    /* =========================================================
       HARD FAILURE
    ========================================================== */

    if (!product) {
      console.error("PRODUCT NOT FOUND:", {
        id,
        or,
        item,
      });

      throw new Error(`Product not found: ${id}`);
    }

    return { product, qty };
  }

  /**
   * PRICE RESOLVER (SAFE)
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
