import { getProductModel } from "@/models/Product";
import { connectNativeDB } from "@/lib/native-mongodb";
import mongoose from "mongoose";

/* =========================================================
   GLOBAL DB SINGLETON
========================================================= */

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
   PRODUCT SERVICE
========================================================= */

export class ProductService {
  static isObjectId(id: string) {
    return mongoose.Types.ObjectId.isValid(id);
  }

  /* =========================================================
     RESOLVE PRODUCT
  ========================================================= */

  static async resolveProduct(
    item: any
  ): Promise<{ product: NativeProduct; qty: number }> {
    const qty = Number(item.qty || 0);

    if (qty <= 0) {
      throw new Error("Invalid quantity");
    }

    const conn = await getNativeConn();

    const Product = getProductModel(conn);

    /* =========================================================
       ONLY TRUST productId
    ========================================================= */

    const productId = item.productId;

    if (!productId) {
      throw new Error("Missing productId");
    }

    console.log(
      "RESOLVING PRODUCT:",
      productId
    );

    let product: NativeProduct | null = null;

    /* =========================================================
       PRIMARY LOOKUP → Mongo ObjectId
    ========================================================= */

    if (this.isObjectId(productId)) {
      product = await Product.findById(
        productId
      ).lean<NativeProduct>();
    }

    /* =========================================================
       FALLBACK → productKey
    ========================================================= */

    if (!product) {
      product = await Product.findOne({
        productKey: productId,
        $or: [
          { isDeleted: false },
          { isDeleted: { $exists: false } },
        ],
      }).lean<NativeProduct>();
    }

    /* =========================================================
       NOT FOUND
    ========================================================= */

    if (!product) {
      console.error("PRODUCT NOT FOUND:", {
        productId,
        item,
      });

      throw new Error(
        `Product not found: ${productId}`
      );
    }

    return {
      product,
      qty,
    };
  }

  /* =========================================================
     PRICE RESOLVER
  ========================================================= */

  static getPrice(product: NativeProduct): number {
    const price =
      product.primaryVariant?.price ??
      product.pricing?.sellingPrice;

    if (
      price == null ||
      Number.isNaN(price)
    ) {
      throw new Error(
        `Invalid price for product: ${product.productKey}`
      );
    }

    return Number(price);
  }
}
