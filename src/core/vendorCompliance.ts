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

/**
 * Documents every vendor must upload regardless of industry — baseline
 * Indian business-registration/tax documents, not domain-specific
 * compliance. Shown before the industry-specific list on every onboarding
 * and vendor-signup form.
 */
export const UNIVERSAL_VENDOR_DOCS: ComplianceDocRequirement[] = [
  {
    key: "gst_certificate",
    label: "GST Certificate",
    helpText: "GST registration certificate for this vendor's business.",
    collectNumber: true,
    numberLabel: "GSTIN",
  },
  {
    key: "pan_card",
    label: "PAN Card",
    helpText: "PAN of the vendor business or proprietor.",
    collectNumber: true,
    numberLabel: "PAN Number",
  },
  {
    key: "msme_certificate",
    label: "MSME (Udyam) Registration",
    helpText: "MSME/Udyam registration certificate, if the vendor is registered as an MSME.",
    collectNumber: true,
    numberLabel: "Udyam Registration Number",
  },
  {
    key: "fssai_license",
    label: "FSSAI License",
    helpText: "Required under the Food Safety and Standards Act for any vendor's business.",
    collectNumber: true,
    numberLabel: "FSSAI License Number",
  },
];

/**
 * Documents a vendor may upload but isn't required to -- not validated on
 * submit, no red asterisk. Trade License was previously in the universal
 * required list; downgraded to optional per explicit request (not every
 * vendor's business/locality issues one).
 */
export const OPTIONAL_VENDOR_DOCS: ComplianceDocRequirement[] = [
  {
    key: "trade_license",
    label: "Trade License",
    helpText: "Local municipal trade license, if this vendor's business has one.",
    collectNumber: true,
    numberLabel: "Trade License Number",
  },
];

// FSSAI moved into UNIVERSAL_VENDOR_DOCS above (required for every vendor,
// not just food/FMCG) -- no longer listed per-industry here to avoid
// asking for it twice.
export const INDUSTRY_COMPLIANCE_DOCS: Partial<Record<Industry, ComplianceDocRequirement[]>> = {
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

/** Returns only the industry-specific compliance doc requirements, or an empty list if none apply. */
export function getComplianceDocsForIndustry(industry?: string | null): ComplianceDocRequirement[] {
  if (!industry) return [];
  return INDUSTRY_COMPLIANCE_DOCS[industry as Industry] || [];
}

/** Returns the universal docs every vendor must upload, plus any industry-specific ones on top. */
export function getRequiredVendorDocs(industry?: string | null): ComplianceDocRequirement[] {
  return [...UNIVERSAL_VENDOR_DOCS, ...getComplianceDocsForIndustry(industry)];
}
