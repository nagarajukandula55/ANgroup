import { getProductModel } from "@/models/Native Product";
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

    const productKey = item.productKey;

    if (!productKey) {
      throw new Error("Missing product key");
    }

    console.log("=================================");
    console.log("CHECKOUT PRODUCT LOOKUP");
    console.log("PRODUCT KEY:", productKey);

    const product = await Product.findOne({
      productKey,
    }).lean<NativeProduct | null>();

    console.log("FOUND:", !!product);

    if (!product) {
      console.error(
        "PRODUCT NOT FOUND:",
        productKey
      );

      throw new Error(
        `Product not found: ${productKey}`
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
