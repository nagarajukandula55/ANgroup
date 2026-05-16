import { getProductModel } from "@/models/Product";
import { connectNativeDB } from "@/lib/native-mongodb";
import mongoose from "mongoose";

declare global {
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

export class ProductService {
  static isObjectId(id: string) {
    return mongoose.Types.ObjectId.isValid(id);
  }

  static async resolveProduct(
    item: any
  ): Promise<{
    product: NativeProduct;
    qty: number;
  }> {
    const qty = Number(item.qty || 1);

    if (qty <= 0) {
      throw new Error("Invalid quantity");
    }

    const conn = await getNativeConn();

    const Product = getProductModel(conn);

    const productId = item.productId;
    const productKey = item.productKey;

    console.log("LOOKUP:", {
      productId,
      productKey,
    });

    let product: NativeProduct | null = null;

    /* ===============================
       FIND BY OBJECT ID
     =============================== */

    if (
      productId &&
      this.isObjectId(productId)
    ) {
      product =
        await Product.findById(productId).lean<NativeProduct | null>();

      console.log(
        "FOUND BY OBJECT ID:",
        !!product
      );
    }

    /* ===============================
       FALLBACK PRODUCT KEY
    =============================== */

    if (!product && productKey) {
      product =
        await Product.findOne({
          productKey,
        }).lean<NativeProduct | null>();

      console.log(
        "FOUND BY PRODUCT KEY:",
        !!product
      );
    }

    /* ===============================
       FINAL FAILURE
    =============================== */

    if (!product) {
      console.error("PRODUCT NOT FOUND", {
        productId,
        productKey,
      });

      throw new Error(
        `Product not found: ${
          productId || productKey
        }`
      );
    }

    return {
      product,
      qty,
    };
  }

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
