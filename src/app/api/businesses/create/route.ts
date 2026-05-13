import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Business from "@/models/Business";

function generateBusinessCode() {
  return "BIZ-" + Date.now().toString().slice(-6);
}

export async function POST(req: Request) {
  await connectDB();

  try {
    const body = await req.json();

    const business = await Business.create({
      name: body.name,
      legalName: body.legalName,
      brandName: body.brandName,
      industry: body.industry,
      type: body.type,
      email: body.email,
      phone: body.phone,

      businessCode: generateBusinessCode(),

      modules: [
        { key: "dashboard", label: "Dashboard", route: "/", icon: "Home", enabled: true },
        { key: "ai", label: "AI Workspace", route: "/ai", icon: "Brain", enabled: true },
        { key: "analytics", label: "Analytics", route: "/analytics", icon: "BarChart", enabled: true },
        { key: "logistics", label: "Logistics", route: "/logistics", icon: "Truck", enabled: true },
        { key: "settings", label: "Settings", route: "/settings", icon: "Settings", enabled: true },
      ],

      documents: {
        invoices: {
          enabled: true,
          numbering: {
            prefix: "NA",
            format: "PREFIX-DATE-SEQ-RANDOM",
            sequenceScope: "BUSINESS",
            dateFormat: "YYMMDD",
            padding: 6,
            resetPolicy: "DAILY",
          },
        },

        creditNotes: { enabled: true },
        debitNotes: { enabled: true },
        receipts: { enabled: true },
      },

      compliance: {
        taxRegime: "REGULAR",
        filingCycle: "MONTHLY",
      },

      financial: {
        currency: "INR",
        accountingMethod: "ACCRUAL",
      },

      roles: [
        {
          name: "ADMIN",
          level: 1,
          permissions: ["*"],
        },
        {
          name: "MANAGER",
          level: 2,
          permissions: ["read", "write"],
        },
      ],
    });

    return NextResponse.json({
      success: true,
      business,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}
