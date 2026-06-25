export class SEOService {
  static generateTitle(product: any) {
    return `${product.productName} | ${product.brandName} | Buy Online at Best Price`;
  }

  static generateDescription(product: any) {
    return `Buy ${product.productName} from ${product.brandName}. High quality, hygienically packed, available in multiple variants.`;
  }

  static generateSlug(product: any) {
    const base = `${product.productName}-${product.variantName}-${product.brandName}`;
    return base
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  static generateKeywords(product: any) {
    return [
      product.productName,
      product.brandName,
      product.categoryName,
      ...(product.ingredients || []),
      ...(product.tags || []),
    ];
  }
}
