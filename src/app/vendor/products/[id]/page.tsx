"use client";

import { useParams } from "next/navigation";
import WizardContainer from "@/components/vendor-product-wizard/WizardContainer";

/**
 * Was completely missing -- the products list's "Edit" link
 * (/vendor/products/[id]) pointed at a route that never existed, so every
 * click 404'd. A vendor had no way to resume or edit a draft after leaving
 * the wizard, only to start a brand-new one from scratch.
 */
export default function EditVendorProductPage() {
  const params = useParams();
  const draftId = params?.id as string;

  if (!draftId) {
    return <div className="p-6 text-gray-500">Invalid product id.</div>;
  }

  return <WizardContainer draftId={draftId} />;
}
