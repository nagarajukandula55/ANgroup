import { NextRequest, NextResponse } from "next/server";
import { getBusinessContext } from "./businessContext";

export function withBusinessContext(handler: Function) {
  return async (req: NextRequest) => {
    try {
      const context = await getBusinessContext(req);

      return handler(req, context);
    } catch (err: any) {
      return NextResponse.json(
        {
          success: false,
          message: err.message,
        },
        { status: 403 }
      );
    }
  };
}
