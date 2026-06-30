/**
 * grn.service — service layer for Goods Receipt Note (GRN) operations.
 *
 * This service bridges the legacy GRN API route (src/app/api/grn/[id]/route.ts)
 * to the GRN model. The GRN model itself is deprecated in favour of GoodsReceipt,
 * but this service maintains backwards compatibility for the existing API.
 */

import { connectDB } from "@/lib/mongodb";
import GRN from "@/models/GRN";

/**
 * Retrieve a single GRN document by its MongoDB _id.
 * Returns null if no document matches.
 */
export async function getGRNById(id: string) {
  await connectDB();
  return GRN.findById(id).lean();
}

/**
 * Retrieve all GRNs for a given business.
 */
export async function getGRNsByBusiness(businessId: string) {
  await connectDB();
  return GRN.find({ businessId }).sort({ createdAt: -1 }).lean();
}

/**
 * Create a new GRN document.
 */
export async function createGRN(data: Partial<{
  grnNumber: string;
  purchaseOrderId: string;
  businessId: string;
  vendorId: string;
  receivedBy: string;
  receivedAt: Date;
  items: Array<{
    itemId?: string;
    description: string;
    orderedQty: number;
    receivedQty: number;
    unit: string;
    unitCost: number;
    totalCost: number;
    condition?: string;
  }>;
  totalValue: number;
  status: "DRAFT" | "CONFIRMED" | "REJECTED";
  remarks?: string;
}>) {
  await connectDB();
  return GRN.create(data);
}

/**
 * Update a GRN by id.
 */
export async function updateGRN(id: string, updates: Record<string, unknown>) {
  await connectDB();
  return GRN.findByIdAndUpdate(id, { $set: updates }, { new: true }).lean();
}
