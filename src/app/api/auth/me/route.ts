import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Business from "@/models/Business";

export async function GET(req: Request) {
  try {
    const userId = req.headers.get("x-user-id");
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

    // Fetch businesses user has access to
    const businessIds = (user.businessAccess || []).map((b: any) => b.businessId);
    let businesses: any[] = [];
    if (businessIds.length > 0) {
      businesses = await Business.find({
        _id: { $in: businessIds },
        isActive: true,
      })
        .select("_id name brandName businessCode type")
        .lean();
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user._id.toString(),
        email: user.email,
        username: user.username || null,
        name: user.name,
        phone: user.phone || null,
        avatar: user.avatar || null,
        role: user.role,
        isSuperAdmin: user.role === "SUPER_ADMIN",
        defaultBusinessId: user.defaultBusinessId?.toString() || null,
        defaultOrganizationId: user.defaultOrganizationId?.toString() || null,
        lastLogin: user.lastLogin || null,
        createdAt: user.createdAt,
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
