import { getProductModel } from "@/models/Product";
import { connectNativeDB } from "@/lib/native-mongodb";

const nativeConn = globalThis.nativeConn || await connectNativeDB();
globalThis.nativeConn = nativeConn;

const Product = getProductModel(nativeConn);

export type NativeProduct = {
  _id: any;
  productKey: string;
  name: string;
  tax?: number;
  primaryVariant?: { price?: number; mrp?: number };
  pricing?: { sellingPrice?: number; mrp?: number };
  isDeleted?: boolean;
};

export class ProductService {
  static isObjectId(id: string) {
    return /^[0-9a-fA-F]{24}$/.test(id);
  }

  static async resolveProduct(item: any): Promise<{ product: NativeProduct; qty: number }> {
    const qty = Number(item.qty);

    if (!qty || qty <= 0) throw new Error("Invalid quantity");

    const id = item.productId || item._id;

    let product: NativeProduct | null = null;

    // 1. ObjectId lookup
    if (id && this.isObjectId(id)) {
      product = await Product.findOne({
        _id: id,
        isDeleted: false,
      }).lean<NativeProduct>();
    }

    // 2. productKey (PRIMARY)
    if (!product && item.productKey) {
      product = await Product.findOne({
        productKey: item.productKey,
        isDeleted: false,
      }).lean<NativeProduct>();
    }

    if (!product) {
      throw new Error(`Product not found: ${item.productKey || id}`);
    }

    return { product, qty };
  }

  static getPrice(product: NativeProduct) {
    const price =
      product.primaryVariant?.price ??
      product.pricing?.sellingPrice;

    if (price == null || isNaN(price)) {
      throw new Error(`Invalid price for ${product.productKey}`);
    }

    return price;
  }
}
