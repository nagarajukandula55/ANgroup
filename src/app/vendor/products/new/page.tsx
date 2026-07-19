"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import WizardContainer from "@/components/vendor-product-wizard/WizardContainer";

export default function NewVendorProductPage() {
  const searchParams = useSearchParams();
  const [draftId, setDraftId] = useState<string | null>(null);
  const [businessId, setBusinessId] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      // Super admins have no personal activeBusinessId (they aren't a member
      // of any single business) -- honor an explicit ?businessId= passed in
      // from the calling page (e.g. admin/products, which already knows
      // which business it's viewing) before falling back to the user's own
      // active business. Was also reading `me.activeBusinessId`, but the
      // /api/auth/me response actually nests it under `me.user.activeBusinessId`
      // -- that mismatch meant this always fell through to the missing-
      // business error, even for a normal vendor with a real active business.
      const queryBusinessId = searchParams.get("businessId") || undefined;

      const meRes = await fetch("/api/auth/me");
      const me = await meRes.json().catch(() => ({}));
      const activeBusinessId: string | undefined =
        queryBusinessId || me?.user?.activeBusinessId || undefined;
      setBusinessId(activeBusinessId);

      const cloneFromDraftId = searchParams.get("cloneFromDraftId") || undefined;
      const res = await fetch("/api/vendor-products/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId: activeBusinessId, cloneFromDraftId }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data.success === false) {
        setError(
          data.message ||
            "Failed to start a new product draft — please try again."
        );
        return;
      }

      setDraftId(data.id);
    }

    init();
  }, []);

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      </div>
    );
  }

  if (!draftId) {
    return (
      <div className="p-6 text-gray-500">
        Creating product draft...
      </div>
    );
  }

  return <WizardContainer draftId={draftId} businessId={businessId} />;
}
