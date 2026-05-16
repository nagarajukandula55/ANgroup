import { getProductModel } from "@/models/Product";
import { connectNativeDB } from "@/lib/native-mongodb";
import mongoose from "mongoose";

declare global {
  // eslint-disable-next-line no-var
  var nativeConn: mongoose.Connection | undefined;
}

async function getNativeConn(): Promise<mongoose.Connection> {
  if (globalThis.nativeConn) {
    return globalThis.nativeConn;
  }

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

  primaryVariant?: {
    price?: number;
    mrp?: number;
  };

  pricing?: {
    sellingPrice?: number;
    mrp?: number;
  };

  isDeleted?: boolean;
};

/* =========================================================
   SERVICE
========================================================= */

export class ProductService {
  static isObjectId(id: string) {
    return mongoose.Types.ObjectId.isValid(id);
  }

  static async resolveProduct(
    item: any
  ): Promise<{ product: NativeProduct; qty: number }> {
    const qty = Number(item.qty || 1);

    if (!qty || qty <= 0) {
      throw new Error("Invalid quantity");
    }

    const conn = await getNativeConn();

    const Product = getProductModel(conn);

    const productId =
      item.productId ||
      item._id ||
      null;

    const productKey =
      item.productKey || null;

    console.log("RESOLVE PRODUCT:", {
      productId,
      productKey,
    });

    let product: NativeProduct | null = null;

    /* =========================================
       TRY MONGO _id FIRST
    ========================================= */

    if (
      productId &&
      this.isObjectId(productId)
    ) {
      product =
        (await Product.findById(
          new mongoose.Types.ObjectId(productId)
        ).lean()) as NativeProduct | null;
    }

    /* =========================================
       FALLBACK TO productKey
    ========================================= */

    if (!product && productKey) {
      product =
        (await Product.findOne({
          productKey,
        }).lean()) as NativeProduct | null;
    }

    /* =========================================
       HARD FAIL
    ========================================= */

    if (!product) {
      console.error("PRODUCT NOT FOUND", {
        item,
        productId,
        productKey,
      });

      throw new Error(
        `Product not found: ${
          productId || productKey
        }`
      );
    }

    console.log("PRODUCT FOUND:", {
      id: product._id,
      name: product.name,
      key: product.productKey,
    });

    return {
      product,
      qty,
    };
  }

  /* =========================================================
     PRICE RESOLVER
  ========================================================= */

  static getPrice(
    product: NativeProduct
  ): number {
    const price =
      product.primaryVariant?.price ??
      product.pricing?.sellingPrice ??
      0;

    if (!price || isNaN(price)) {
      throw new Error(
        `Invalid price for product: ${product.productKey}`
      );
    }

    return Number(price);
  }
}
