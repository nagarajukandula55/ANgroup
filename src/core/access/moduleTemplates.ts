// Business-type menu templates -- "Apply Template" buttons in the business
// edit page's Modules section (admin/business/[id]/page.tsx). Each template
// is just a starting point for Business.modules[] (bulk pre-check/uncheck);
// the admin can still hand-toggle any individual module afterward and Save
// as usual. No new schema field or API route needed -- this only decides
// which of the existing per-module checkboxes start enabled/disabled.
//
// Categorization is per the module/page audit: which sidebar key only
// makes sense for an e-commerce storefront, which only for a repair/service
// business, and which belongs solely to AN Group platform administration
// (never inside a tenant business's own menu). Everything else defaults to
// enabled under both ECOMMERCE and SERVICE (it's common to any business).

export const ECOMMERCE_ONLY_KEYS = [
  "coupons",
  "products",
  "masters-prod-cat",
  "vendor-settlements",
  "native",
  "logistics",
  "admin-invoice-templates",
];

export const SERVICE_ONLY_KEYS = [
  "masters-models",
  "masters-fault-codes",
  "masters-symptom-codes",
  "masters-solutions",
  "masters-crm-options",
  "crm",
  "crm_calls",
  "crm_jobsheets",
];

// AN Group platform administration -- these never belong in a tenant
// business's own menu, only in the AN Group business's menu.
export const PLATFORM_ONLY_KEYS = [
  "businesses",
  "vendors",
  "admin-users",
  "admin-access",
  "admin-roles",
  "admin-an-group-staff",
  "admin-intg",
  "admin-sso",
  "admin-status",
  "admin-modules",
  "admin-pincode-data",
];

export type ModuleTemplateKey = "ECOMMERCE" | "SERVICE" | "PLATFORM" | "ALL";

export const MODULE_TEMPLATE_OPTIONS: { value: ModuleTemplateKey; label: string }[] = [
  { value: "ECOMMERCE", label: "E-Commerce business" },
  { value: "SERVICE", label: "Service business" },
  { value: "PLATFORM", label: "AN Group (platform only)" },
  { value: "ALL", label: "Everything on (no restriction)" },
];

/**
 * Given every module's sidebar key, return which of them should start
 * enabled for the given template. Ambiguous/ANY-business keys (not in any
 * of the three lists above) are always enabled except under PLATFORM.
 */
export function isEnabledUnderTemplate(key: string, template: ModuleTemplateKey): boolean {
  if (template === "ALL") return true;
  const isEcommerce = ECOMMERCE_ONLY_KEYS.includes(key);
  const isService = SERVICE_ONLY_KEYS.includes(key);
  const isPlatform = PLATFORM_ONLY_KEYS.includes(key);

  if (template === "PLATFORM") return isPlatform;
  if (isPlatform) return false; // platform admin pages never show inside a tenant business
  if (template === "ECOMMERCE") return !isService;
  if (template === "SERVICE") return !isEcommerce;
  return true;
}
