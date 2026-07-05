/**
 * GST 2-digit state codes, keyed by state name. Extracted from what used
 * to be an inline const duplicated inside
 * app/api/invoice/view/[invoiceNumber]/route.ts — pulled out here so the
 * new Cloudinary-generation path (api/invoice/generate/route.ts) can use
 * the SAME lookup instead of copy-pasting a second 28-entry map that would
 * inevitably drift from this one.
 */
export const STATE_CODES: Record<string, string> = {
  "Andhra Pradesh": "37",
  "Arunachal Pradesh": "12",
  Assam: "18",
  Bihar: "10",
  Chhattisgarh: "22",
  Goa: "30",
  Gujarat: "24",
  Haryana: "06",
  "Himachal Pradesh": "02",
  Jharkhand: "20",
  Karnataka: "29",
  Kerala: "32",
  "Madhya Pradesh": "23",
  Maharashtra: "27",
  Manipur: "14",
  Meghalaya: "17",
  Mizoram: "15",
  Nagaland: "13",
  Odisha: "21",
  Punjab: "03",
  Rajasthan: "08",
  Sikkim: "11",
  "Tamil Nadu": "33",
  Telangana: "36",
  Tripura: "16",
  "Uttar Pradesh": "09",
  Uttarakhand: "05",
  "West Bengal": "19",
  Delhi: "07",
};

export function getStateCode(stateName?: string): string {
  return STATE_CODES[stateName || ""] || "";
}
