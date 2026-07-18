/**
 * Fixed electronics "Device Type" taxonomy, used consistently across Brand
 * (category), FaultCode/SymptomCode (deviceCategory — the new top wrapping
 * level above the existing free-text `category`, which represents the
 * component, e.g. "Screen"/"Battery"), and VendorProfile.productCategories
 * (which categories a vendor services). Same const-array-plus-type pattern
 * as businessScope.ts.
 */
export const DEVICE_CATEGORIES = [
  "MOBILE",
  "LAPTOP",
  "DESKTOP",
  "TABLET",
  "TELEVISION",
  "REFRIGERATOR",
  "WASHING_MACHINE",
  "AIR_CONDITIONER",
  "MICROWAVE",
  "SMARTWATCH",
  "AUDIO",
  "PRINTER",
] as const;

export type DeviceCategory = (typeof DEVICE_CATEGORIES)[number];

export const DEVICE_CATEGORY_LABELS: Record<DeviceCategory, string> = {
  MOBILE: "Mobile",
  LAPTOP: "Laptop",
  DESKTOP: "Desktop/PC",
  TABLET: "Tablet",
  TELEVISION: "Television",
  REFRIGERATOR: "Refrigerator",
  WASHING_MACHINE: "Washing Machine",
  AIR_CONDITIONER: "Air Conditioner",
  MICROWAVE: "Microwave",
  SMARTWATCH: "Smartwatch",
  AUDIO: "Audio",
  PRINTER: "Printer",
};
