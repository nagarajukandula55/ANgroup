/**
 * Shared channel-pricing engine. One margin-over-cost formula, applied to
 * however many sales channels a vendor sells through, each with its own
 * editable margin% (or a flat markup ₹, see priceFromRule below) and its
 * own view of "cost" — an offline/walk-in sale never incurs the online
 * shipping/logistics line, so its base cost is smaller than the online
 * channel's.
 *
 * To add a channel later (e.g. "Export", "Marketplace"), add one entry
 * here — every route/UI that iterates PRICING_TIERS picks it up
 * automatically, nothing else needs to change.
 */

export interface CostBreakdown {
  materialCost: number;
  wastageCost: number;
  vendorCost: number;
  shippingCost: number;
  manufacturingCost: number;
  packingCost: number;
  logisticsOverhead: number;
}

export type PricingTierKey = "distributor" | "retailer" | "offline";

export interface PricingTierDef {
  key: PricingTierKey;
  label: string;
  description: string;
  defaultMarginPercent: number;
  /** Offline/local sales don't incur online shipping or per-order logistics
   * overhead, so those two cost lines are excluded from its base cost. */
  excludeLogistics: boolean;
}

export const PRICING_TIERS: PricingTierDef[] = [
  {
    key: "distributor",
    label: "Distributor",
    description: "Bulk price to a distributor, who resells to retailers — lowest margin since they add their own on top.",
    defaultMarginPercent: 12,
    excludeLogistics: false,
  },
  {
    key: "retailer",
    label: "Retailer",
    description: "Price to a shop/retailer selling directly to the end consumer.",
    defaultMarginPercent: 20,
    excludeLogistics: false,
  },
  {
    key: "offline",
    label: "Offline / Walk-in",
    description: "Local/offline sale with no shipping or per-order logistics cost — e.g. a customer collecting in person.",
    defaultMarginPercent: 30,
    excludeLogistics: true,
  },
];

export interface PricingTierMargins {
  distributor?: number;
  retailer?: number;
  offline?: number;
}

/** The base cost a given tier's margin is calculated over — excludes
 * shipping/logistics for a tier marked excludeLogistics. */
export function tierBaseCost(cost: CostBreakdown, excludeLogistics: boolean): number {
  const core =
    Number(cost.materialCost || 0) +
    Number(cost.wastageCost || 0) +
    Number(cost.vendorCost || 0) +
    Number(cost.manufacturingCost || 0) +
    Number(cost.packingCost || 0);
  if (excludeLogistics) return core;
  return core + Number(cost.shippingCost || 0) + Number(cost.logisticsOverhead || 0);
}

/** Standard margin-over-selling-price formula: price such that
 * (price - cost) / price === marginPercent. Matches the existing Online
 * margin-preset formula in StepCommercial.tsx, so all channels compute
 * consistently. */
export function priceFromMargin(baseCost: number, marginPercent: number): number {
  if (!baseCost || marginPercent === undefined || marginPercent === null || marginPercent >= 100) return 0;
  return baseCost / (1 - marginPercent / 100);
}

export interface ComputedTier extends PricingTierDef {
  marginPercent: number;
  baseCost: number;
  price: number;
}

/** Computes every tier's price from a product's cost breakdown + whatever
 * margin%s it has saved (falling back to each tier's default). */
export function computeAllTiers(cost: CostBreakdown, savedMargins: PricingTierMargins | undefined | null): ComputedTier[] {
  return PRICING_TIERS.map((tier) => {
    const marginPercent = savedMargins?.[tier.key] ?? tier.defaultMarginPercent;
    const baseCost = tierBaseCost(cost, tier.excludeLogistics);
    return { ...tier, marginPercent, baseCost, price: Math.round(priceFromMargin(baseCost, marginPercent)) };
  });
}
