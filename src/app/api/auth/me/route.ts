import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Business from "@/models/Business";
import BusinessMember from "@/models/BusinessMember";

export async function GET(req: Request) {
  try {
    const userId      = req.headers.get("x-user-id");
    const isSuperAdmin = req.headers.get("x-is-super-admin") === "true";
    const activeBusinessId = req.headers.get("x-active-business-id");

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Not authenticated" },
        { status: 401 }
      );
    }

    await connectDB();

    const user = await User.findById(userId)
      .select("-password")
      .lean()
      .exec() as any;

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    let businesses: any[] = [];

    if (isSuperAdmin) {
      // Super admin: return all active businesses
      businesses = await (Business as any).find({ isActive: true })
        .select("_id name brandName businessCode type")
        .lean();
    } else {
      // Regular users: load via BusinessMember
      const memberships = await BusinessMember.find({
        userId: user._id,
        status: "ACTIVE",
      })
        .select("businessId isDefaultBusiness memberType")
        .lean() as any[];

      const businessIds = memberships.map((m) => m.businessId);
      if (businessIds.length > 0) {
        const bizDocs = await (Business as any).find({
          _id: { $in: businessIds },
          isActive: true,
        })
          .select("_id name brandName businessCode type")
          .lean() as any[];

        // Merge membership metadata into each business
        businesses = bizDocs.map((biz: any) => {
          const mem = memberships.find(
            (m) => m.businessId.toString() === biz._id.toString()
          );
          return {
            ...biz,
            memberType: mem?.memberType,
            isDefault:  mem?.isDefaultBusiness ?? false,
          };
        });
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        id:                    user._id.toString(),
        email:                 user.email,
        username:              user.username || null,
        name:                  user.name,
        phone:                 user.phone || null,
        avatar:                user.avatar || null,
        role:                  user.role,
        isSuperAdmin,
        activeBusinessId:      activeBusinessId || null,
        defaultBusinessId:     user.defaultBusinessId?.toString() || null,
        defaultOrganizationId: user.defaultOrganizationId?.toString() || null,
        lastLogin:             user.lastLogin || null,
        createdAt:             user.createdAt,
      },
      businesses,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
