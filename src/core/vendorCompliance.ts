import type { Industry } from "@/data/businessConstants";

/**
 * Maps a business's industry to the domain-specific compliance documents a
 * vendor onboarding under that business should be asked to upload, per
 * Indian regulatory requirements (e.g. an FSSAI license for any food/FMCG
 * business, a Drug License for pharma, etc.).
 *
 * Deliberately data-driven rather than hardcoded per-industry UI branches —
 * add a new industry's required docs here and every vendor onboarding form
 * that reads this list picks it up automatically.
 */
export interface ComplianceDocRequirement {
  /** Stable machine key — used as the key in VendorProfile.documents.compliance. */
  key: string;
  label: string;
  /** Short explanation shown next to the upload field. */
  helpText?: string;
  /** Whether this document should also collect a license/registration number, not just a file. */
  collectNumber?: boolean;
  numberLabel?: string;
}

export const INDUSTRY_COMPLIANCE_DOCS: Partial<Record<Industry, ComplianceDocRequirement[]>> = {
  FOOD_BEVERAGE: [
    {
      key: "fssai_license",
      label: "FSSAI License",
      helpText: "Required under the Food Safety and Standards Act for any vendor supplying food/beverage products.",
      collectNumber: true,
      numberLabel: "FSSAI License Number",
    },
  ],
  FMCG: [
    {
      key: "fssai_license",
      label: "FSSAI License",
      helpText: "Required if this vendor supplies any food/beverage FMCG products.",
      collectNumber: true,
      numberLabel: "FSSAI License Number",
    },
  ],
  HEALTHCARE_PHARMA: [
    {
      key: "drug_license",
      label: "Drug License",
      helpText: "Required under the Drugs and Cosmetics Act for pharmaceutical/healthcare product vendors.",
      collectNumber: true,
      numberLabel: "Drug License Number",
    },
  ],
  CHEMICALS: [
    {
      key: "pollution_control_clearance",
      label: "Pollution Control Board Clearance",
      helpText: "Required for vendors handling or supplying chemical products.",
      collectNumber: false,
    },
  ],
  CONSTRUCTION_REAL_ESTATE: [
    {
      key: "rera_registration",
      label: "RERA Registration",
      helpText: "Required for vendors involved in real estate development/sale.",
      collectNumber: true,
      numberLabel: "RERA Registration Number",
    },
  ],
};

/** Returns the compliance doc requirements for a business's industry, or an empty list if none apply. */
export function getComplianceDocsForIndustry(industry?: string | null): ComplianceDocRequirement[] {
  if (!industry) return [];
  return INDUSTRY_COMPLIANCE_DOCS[industry as Industry] || [];
}
