import { NextResponse } from "next/server";
import { requireAccess } from "./requireAccess";

export function withAccess(requiredKey: string, handler: Function) {
  return async (req: Request, context: any) => {
    try {
      const userId = req.headers.get("x-user-id");
      const businessId = req.headers.get("x-business-id");

      if (!userId || !businessId) {
        return NextResponse.json(
          { success: false, message: "Unauthorized" },
          { status: 401 }
        );
      }

      const allowed = await requireAccess(
        userId,
        businessId,
        requiredKey
      );

      if (!allowed) {
        return NextResponse.json(
          { success: false, message: "Access Denied" },
          { status: 403 }
        );
      }

      return handler(req, context);
    } catch (err: any) {
      return NextResponse.json(
        { success: false, message: err.message },
        { status: 500 }
      );
    }
  };
}
