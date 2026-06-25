import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";

import Business from "@/models/Business";
import UserBusinessAccess from "@/models/UserBusinessAccess";

import { filterModules } from "@/services/moduleEngine.service";

export async function POST(req: Request) {
  try {
    await connectDB();

    const { userId, businessId } = await req.json();

    if (!userId || !businessId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "User ID and Business ID are required",
        },
        {
          status: 400,
        }
      );
    }

    const business = (await Business.findById(
      businessId
    )
      .lean()
      .exec()) as any;

    if (!business) {
      return NextResponse.json(
        {
          success: false,
          message: "Business not found",
        },
        {
          status: 404,
        }
      );
    }

    const access =
      (await UserBusinessAccess.findOne({
        userId,
        businessId,
        isActive: true,
      })
        .lean()
        .exec()) as any;

    if (!access) {
      return NextResponse.json(
        {
          success: false,
          message: "Access denied",
        },
        {
          status: 403,
        }
      );
    }

    const modules = filterModules({
      modules: business?.modules ?? [],
      accessKeys:
        access?.accessKeys ?? [],
    });

    return NextResponse.json({
      success: true,

      business: {
        id: business._id,
        name: business.name,
        legalName:
          business.legalName,
        brandName:
          business.brandName,
        businessCode:
          business.businessCode,
      },

      designation:
        access?.designation || "",

      modules,
    });
  } catch (err: any) {
    console.error(
      "SIDEBAR API ERROR:",
      err
    );

    return NextResponse.json(
      {
        success: false,
        message:
          err?.message ||
          "Internal Server Error",
      },
      {
        status: 500,
      }
    );
  }
}
