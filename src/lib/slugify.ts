/**
 * Small dependency-free slugify helper — mirrors the CSV parser's rationale
 * elsewhere in this project (no slugify package installed, npm registry is
 * blocked in this sandbox), so this is intentionally minimal rather than
 * pulling in a library.
 */
export function slugify(input: string): string {
  return input
    .toString()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Builds a working suggestion like "amul-butter-500g" from name + variant. */
export function suggestSlug(productName?: string, variantName?: string): string {
  const parts = [productName, variantName].filter(Boolean).join(" ");
  return slugify(parts);
}

/** Builds a short SEO title suggestion, capped to a sane length. */
export function suggestSeoTitle(productName?: string, variantName?: string, brandName?: string): string {
  const parts = [brandName, productName, variantName].filter(Boolean).join(" ");
  return parts.slice(0, 70);
}

/** Builds an SEO meta description suggestion from description text. */
export function suggestSeoDescription(description?: string, productName?: string): string {
  const base = (description || productName || "").replace(/\s+/g, " ").trim();
  return base.slice(0, 160);
}

/** Builds a starting-point product description from what's already known at
 * Basic Info time (name, category, brand) -- a generic template the vendor
 * is expected to edit/personalize, not a finished description. Ingredients
 * aren't known yet at this step (BOM comes later in the wizard), so this
 * intentionally stays generic rather than guessing at composition. */
export function suggestDescription(productName?: string, categoryName?: string, brandName?: string): string {
  if (!productName) return "";
  const brandPart = brandName ? `by ${brandName}` : "";
  const categoryPart = categoryName ? categoryName.toLowerCase() : "product";
  return `${productName} ${brandPart} — a quality ${categoryPart} made with care. [Add what makes this specific to your recipe: key ingredients, taste, texture, or how it's made.]`.replace(/\s+/g, " ").trim();
}

/** Builds SEO keyword suggestions from product name/category/brand. */
export function suggestSeoKeywords(
  productName?: string,
  categoryName?: string,
  brandName?: string
): string[] {
  const words = new Set<string>();
  [productName, categoryName, brandName]
    .filter(Boolean)
    .forEach((phrase) => {
      (phrase as string)
        .split(/\s+/)
        .map((w) => w.trim().toLowerCase())
        .filter((w) => w.length > 2)
        .forEach((w) => words.add(w));
    });
  return Array.from(words).slice(0, 10);
}
