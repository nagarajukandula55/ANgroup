import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import PincodeEntry from "@/models/PincodeEntry";
import PincodeDatasetMeta from "@/models/PincodeDatasetMeta";
import { convertPincodeCSV } from "@/lib/pincodeImport";

/**
 * GET /api/admin/pincode-data — dataset status for the admin upload page
 * (/admin/pincode-data): how many pincodes are loaded and when it was last
 * updated, so admins can see at a glance whether a refresh is overdue.
 */
export async function GET() {
  try {
    await connectDB();
    const [meta, liveCount] = await Promise.all([
      PincodeDatasetMeta.findOne().sort({ uploadedAt: -1 }).lean(),
      PincodeEntry.countDocuments(),
    ]);

    return NextResponse.json({
      success: true,
      totalPincodes: liveCount,
      lastUpload: meta
        ? {
            sourceFileName: (meta as any).sourceFileName,
            uploadedAt: (meta as any).uploadedAt,
            totalPincodes: (meta as any).totalPincodes,
          }
        : null,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || "Failed to load pincode dataset status" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/pincode-data — replace the entire pincode dataset from
 * an uploaded CSV (multipart/form-data, field "file"). Expects the same
 * columns as the official India Post "All India Pincode Directory" export
 * (pincode, district, statename, officename, ...) — see
 * src/lib/pincodeImport.ts for the exact parsing/normalization logic,
 * shared with the one-time seed script (scripts/seedPincodes.ts).
 *
 * Stored in MongoDB (not a bundled JSON file) because this app deploys on
 * Vercel, whose filesystem is read-only at runtime — a file-based "admin
 * upload" would silently do nothing in production. See PincodeEntry.ts's
 * comment for the full reasoning.
 */
export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ success: false, message: "No file uploaded" }, { status: 400 });
    }

    const isCsv =
      file.type === "text/csv" ||
      file.type === "application/vnd.ms-excel" ||
      file.name.toLowerCase().endsWith(".csv");
    if (!isCsv) {
      return NextResponse.json(
        { success: false, message: "Please upload a .csv file" },
        { status: 400 }
      );
    }

    // 30MB cap — the full official directory is ~23MB; this leaves
    // headroom for a somewhat larger future export without accepting
    // arbitrarily large uploads.
    const MAX_BYTES = 30 * 1024 * 1024;
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { success: false, message: "File is too large (max 30MB)" },
        { status: 400 }
      );
    }

    const csvText = await file.text();
    const { entries, totalRows, skippedRows } = convertPincodeCSV(csvText);

    if (entries.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "No valid pincode rows found — check the file has pincode/district/statename columns matching the official India Post directory format",
        },
        { status: 400 }
      );
    }

    await connectDB();

    // Replace wholesale rather than upsert-merge: a refreshed directory
    // export is the new source of truth in full, and stale entries that
    // no longer appear in the new file (e.g. a discontinued pincode)
    // should disappear, not linger from a previous upload.
    await PincodeEntry.deleteMany({});

    const CHUNK_SIZE = 2000;
    for (let i = 0; i < entries.length; i += CHUNK_SIZE) {
      const chunk = entries.slice(i, i + CHUNK_SIZE);
      await PincodeEntry.insertMany(chunk, { ordered: false });
    }

    await PincodeDatasetMeta.deleteMany({});
    await PincodeDatasetMeta.create({
      totalPincodes: entries.length,
      sourceFileName: file.name,
      uploadedBy: userId,
      uploadedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      totalPincodes: entries.length,
      totalRows,
      skippedRows,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || "Failed to process pincode file" },
      { status: 500 }
    );
  }
}
