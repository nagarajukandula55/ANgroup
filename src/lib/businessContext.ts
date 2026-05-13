import { NextRequest } from "next/server";
import { resolveBusinessContext } from "@/services/businessContext.service";

/* ================= EXTRACT CONTEXT ================= */
export async function getBusinessContext(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  const businessId = req.headers.get("x-business-id");

  if (!userId || !businessId) {
    throw new Error("MISSING_CONTEXT_HEADERS");
  }

  const context = await resolveBusinessContext(
    userId,
    businessId
  );

  return context;
}
