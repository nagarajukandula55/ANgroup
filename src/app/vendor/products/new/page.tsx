"use client";

import { useEffect, useState } from "react";
import WizardContainer from "@/components/vendor-product-wizard/WizardContainer";

export default function NewVendorProductPage() {
  const [draftId, setDraftId] = useState<string | null>(null);
  const [businessId, setBusinessId] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const meRes = await fetch("/api/auth/me");
      const me = await meRes.json().catch(() => ({}));
      const activeBusinessId: string | undefined = me?.activeBusinessId || undefined;
      setBusinessId(activeBusinessId);

      const res = await fetch("/api/vendor-products/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId: activeBusinessId }),
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
