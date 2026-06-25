"use client";

import { useEffect, useState } from "react";
import WizardContainer from "@/components/vendor-product-wizard/WizardContainer";

export default function NewVendorProductPage() {
  const [draftId, setDraftId] = useState<string | null>(null);

  useEffect(() => {
    async function createDraft() {
      const res = await fetch("/api/vendor-products/draft", {
        method: "POST",
      });

      const data = await res.json();
      setDraftId(data.id);
    }

    createDraft();
  }, []);

  if (!draftId) {
    return (
      <div className="p-6 text-gray-500">
        Creating product draft...
      </div>
    );
  }

  return <WizardContainer draftId={draftId} />;
}
