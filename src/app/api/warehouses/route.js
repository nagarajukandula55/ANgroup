import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Warehouse from "@/models/Warehouse";

export async function GET() {
  try {
    await connectDB();

    const warehouses =
      await Warehouse.find()
        .sort({ warehouseName: 1 });

    return NextResponse.json({
      success: true,
      data: warehouses,
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        message: err.message,
      },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    await connectDB();

    const body = await req.json();

    const warehouse =
      await Warehouse.create(body);

    return NextResponse.json({
      success: true,
      data: warehouse,
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        message: err.message,
      },
      { status: 500 }
    );
  }
}
