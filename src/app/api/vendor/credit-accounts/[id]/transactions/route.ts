import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { connectDB } from "@/lib/mongodb";
import CreditAccount from "@/models/CreditAccount";
import CreditTransaction from "@/models/CreditTransaction";
import { resolveVendorContext } from "@/lib/auth/vendorContext";

/**
 * POST /api/vendor/credit-accounts/:id/transactions — record a credit
 * sale (INVOICE, raises outstanding) or a payment received (PAYMENT,
 * lowers it) against this account. The only writer of
 * CreditAccount.outstandingBalance -- keeps it and each entry's
 * balanceAfter snapshot in sync in one place.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const headersList = await headers();
    const userId = headersList.get("x-user-id");
    if (!userId) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    await connectDB();
    const ctx = await resolveVendorContext(userId);
    if (!ctx) return NextResponse.json({ success: false, message: "Vendor profile not found" }, { status: 404 });
    const vendor = ctx.vendor as any;

    const account = await CreditAccount.findOne({ _id: id, vendorId: vendor._id });
    if (!account) return NextResponse.json({ success: false, message: "Account not found" }, { status: 404 });

    const body = await req.json();
    const type = ["INVOICE", "PAYMENT", "ADJUSTMENT"].includes(body.type) ? body.type : null;
    const amount = Number(body.amount);
    if (!type) return NextResponse.json({ success: false, message: "type must be INVOICE, PAYMENT, or ADJUSTMENT" }, { status: 400 });
    if (!amount || amount <= 0) return NextResponse.json({ success: false, message: "amount must be greater than 0" }, { status: 400 });

    if (type === "INVOICE" && account.creditLimit > 0 && account.outstandingBalance + amount > account.creditLimit) {
      return NextResponse.json(
        {
          success: false,
          message: `This would put ${account.name} at ₹${(account.outstandingBalance + amount).toFixed(2)}, over their ₹${account.creditLimit} credit limit.`,
        },
        { status: 400 }
      );
    }

    const delta = type === "INVOICE" ? amount : -amount;
    account.outstandingBalance = Math.round((account.outstandingBalance + delta) * 100) / 100;
    await account.save();

    const dueDate = type === "INVOICE" && account.creditDays ? new Date(Date.now() + account.creditDays * 24 * 60 * 60 * 1000) : null;

    const transaction = await CreditTransaction.create({
      businessId: vendor.businessId,
      vendorId: vendor._id,
      accountId: account._id,
      type,
      amount,
      balanceAfter: account.outstandingBalance,
      referenceOrderId: body.referenceOrderId || undefined,
      dueDate,
      notes: body.notes || undefined,
      createdBy: userId,
    });

    return NextResponse.json({ success: true, transaction, account });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
