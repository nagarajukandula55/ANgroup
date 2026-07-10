import { Types } from "mongoose";
import DocumentNumberConfig from "@/models/DocumentNumberConfig";
import NumberSequence from "./NumberSequence.model";
import { getFinancialYearCode } from "./financialYear";
import { DEFAULT_PREFIXES, type DocumentType, type GeneratedNumber } from "./types";

/**
 * THE canonical document-number generator for the entire platform.
 * Everything that used to call one of the six old duplicate generators
 * (see types.ts's top comment for the full list and why several of them
 * were actively unsafe) should call generateDocumentNumber() instead.
 *
 * Behavior:
 *  1. Reads this business's DocumentNumberConfig for the given type (the
 *     SAME config the Settings > Document Numbers admin UI reads/writes —
 *     this is what makes numbering genuinely admin-configurable everywhere,
 *     not just for invoices). Falls back to a sensible default prefix if
 *     the business hasn't configured this type yet, same defaults the
 *     admin UI already shows before a business saves its own.
 *  2. Computes the period key: the financial year string if
 *     config.includeFinancialYear, else the constant "ALL" (counter never
 *     resets). This is what the counter is scoped by.
 *  3. Atomically increments NumberSequence via findOneAndUpdate + $inc —
 *     this atomicity is the property that makes it safe under concurrent
 *     requests, unlike Date.now()-based or countDocuments()-based schemes.
 *  4. Applies config.startFrom as a floor (if configured higher than the
 *     counter's current value, e.g. a business wants to start at 1001) —
 *     handled by seeding the counter's initial value to startFrom - 1 on
 *     first use of a given period key, not by re-checking on every call
 *     (which would defeat the atomicity of the $inc).
 *  5. Formats the final string from prefix/separator/financialYear/month/
 *     sequenceLength/suffix — the exact same building blocks the admin UI's
 *     buildPreview() (in /api/admin/document-numbers/route.ts) already
 *     shows a live preview of, so what the admin sees in Settings matches
 *     exactly what gets generated. That preview-building logic is
 *     duplicated here deliberately as formatNumber() below (small, pure,
 *     and safe to keep in sync since both live in this one file's
 *     neighborhood) rather than cross-importing from the API route module.
 */

interface FormatInput {
  prefix: string;
  separator: string;
  includeFinancialYear: boolean;
  includeMonth: boolean;
  sequenceLength: number;
  suffix: string;
  sequence: number;
  financialYear: string;
}

function formatNumber(input: FormatInput): string {
  const parts: string[] = [];
  if (input.prefix) parts.push(input.prefix);
  if (input.includeFinancialYear) parts.push(input.financialYear);
  if (input.includeMonth) parts.push(String(new Date().getMonth() + 1).padStart(2, "0"));
  parts.push(String(input.sequence).padStart(input.sequenceLength, "0"));
  if (input.suffix) parts.push(input.suffix);
  return parts.join(input.separator || "-");
}

// Fixed sentinel ObjectId used ONLY for platform-wide (not per-business)
// counters — see generateGlobalDocumentNumber() below. Any valid-looking
// constant works since NumberSequence.businessId just needs to be *a*
// ObjectId to satisfy the schema; this one is never a real Business _id.
const GLOBAL_SCOPE_ID = "000000000000000000000000";

async function generateNumberInScope(
  scopeId: string,
  documentType: DocumentType,
  configBusinessId: string | null
): Promise<GeneratedNumber> {
  const config = configBusinessId
    ? (await DocumentNumberConfig.findOne({ businessId: configBusinessId, documentType }).lean() as any)
    : null;

  const prefix = config?.prefix || DEFAULT_PREFIXES[documentType] || documentType.slice(0, 3);
  const separator = config?.separator ?? "-";
  const includeFinancialYear = config?.includeFinancialYear ?? true;
  const includeMonth = config?.includeMonth ?? false;
  const sequenceLength = config?.sequenceLength ?? 4;
  const suffix = config?.suffix ?? "";
  const startFrom = config?.startFrom ?? 1;
  const isActive = config?.isActive ?? true;

  if (!isActive) {
    throw new Error(
      `Numbering for document type "${documentType}" is disabled for this business. Enable it in Settings > Document Numbers.`
    );
  }

  // Compact "2526" form, not the hyphenated "2025-26" -- per an explicit
  // requirement that document numbers use the short FY code, matching the
  // format getFinancialYearCode() was originally built for (see
  // financialYear.ts) but that nothing was actually calling.
  const financialYear = getFinancialYearCode();
  const periodKey = includeFinancialYear ? financialYear : "ALL";

  // Ensure the counter exists and is seeded to (startFrom - 1) BEFORE the
  // atomic increment, so the increment always produces the right next
  // value even on the very first call for this scope/type/period.
  // $setOnInsert only applies on the insert branch of the upsert, so this
  // is safe to run on every call without resetting an existing counter.
  await NumberSequence.updateOne(
    { businessId: new Types.ObjectId(scopeId), documentType, periodKey },
    { $setOnInsert: { value: startFrom - 1 } },
    { upsert: true }
  );

  const updated = await NumberSequence.findOneAndUpdate(
    { businessId: new Types.ObjectId(scopeId), documentType, periodKey },
    { $inc: { value: 1 } },
    { new: true }
  );

  const sequence = updated!.value;

  const value = formatNumber({
    prefix,
    separator,
    includeFinancialYear,
    includeMonth,
    sequenceLength,
    suffix,
    sequence,
    financialYear,
  });

  return { value, sequence };
}

export async function generateDocumentNumber(
  businessId: string,
  documentType: DocumentType
): Promise<GeneratedNumber> {
  if (!businessId) {
    throw new Error("businessId is required to generate a document number");
  }
  return generateNumberInScope(businessId, documentType, businessId);
}

/**
 * For the rare document types that are GLOBALLY unique across the whole
 * platform rather than per-business — currently just VENDOR, whose
 * VendorProfile.vendorId has a schema-level `unique: true` with no
 * businessId in the index (a pre-existing constraint discovered while
 * consolidating vendor-ID generation — see the removed-code comments in
 * app/api/vendors/route.ts, vendors/apply/route.ts, and
 * auth/register/vendor/route.ts). Uses one shared platform-wide counter
 * (GLOBAL_SCOPE_ID) instead of per-business scoping, which would violate
 * that uniqueness constraint the same way an earlier, already-fixed bug
 * did (see the comment history in those files). Numbering format still
 * comes from the calling business's own DocumentNumberConfig if provided
 * (businessIdForConfig) — only the COUNTER is global, not the format.
 */
/**
 * Scopes the atomic counter by an arbitrary ObjectId-shaped key instead of
 * a real Business — used for vendor-scoped product codes
 * ("ECOM-VND-0001-PRD-0001"), where the sequence must reset per-vendor, not
 * per-business. Format still comes from the business's own
 * DocumentNumberConfig (businessIdForConfig) for consistency with every
 * other document type; only the counter's scope key differs.
 */
export async function generateScopedDocumentNumber(
  scopeKey: string,
  documentType: DocumentType,
  businessIdForConfig: string | null
): Promise<GeneratedNumber> {
  return generateNumberInScope(scopeKey, documentType, businessIdForConfig);
}

export async function generateGlobalDocumentNumber(
  documentType: DocumentType,
  businessIdForConfig: string | null = null
): Promise<GeneratedNumber> {
  return generateNumberInScope(GLOBAL_SCOPE_ID, documentType, businessIdForConfig);
}
