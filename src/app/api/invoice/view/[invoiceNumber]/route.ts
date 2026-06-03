import { NextResponse } from "next/server";
import Invoice from "@/models/Invoice";
import Order from "@/models/Order";
import { connectDB } from "@/lib/mongodb";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  context: any
) {
  try {
    await connectDB();

    const invoiceNumber =
      context.params.invoiceNumber;

    const invoice =
      await Invoice.findOne({
        invoiceNumber,
      });

const STATE_CODES: Record<string, string> = {
      "Andhra Pradesh": "37",
      "Arunachal Pradesh": "12",
      "Assam": "18",
      "Bihar": "10",
      "Chhattisgarh": "22",
      "Goa": "30",
      "Gujarat": "24",
      "Haryana": "06",
      "Himachal Pradesh": "02",
      "Jharkhand": "20",
      "Karnataka": "29",
      "Kerala": "32",
      "Madhya Pradesh": "23",
      "Maharashtra": "27",
      "Manipur": "14",
      "Meghalaya": "17",
      "Mizoram": "15",
      "Nagaland": "13",
      "Odisha": "21",
      "Punjab": "03",
      "Rajasthan": "08",
      "Sikkim": "11",
      "Tamil Nadu": "33",
      "Telangana": "36",
      "Tripura": "16",
      "Uttar Pradesh": "09",
      "Uttarakhand": "05",
      "West Bengal": "19",
      "Delhi": "07",
    };
    
const stateCode =
  STATE_CODES[
    invoice.customer?.state || ""
  ] || "";
    
    if (!invoice) {
      return NextResponse.json(
        {
          success: false,
          message: "Invoice not found",
        },
        {
          status: 404,
        }
      );
    }

    const order =
      await Order.findOne({
        _id: invoice.orderId,
      });

    return NextResponse.json({
      success: true,

      invoiceNumber:
        invoice.invoiceNumber,

      invoiceDate:
        invoice.createdAt,

      orderDate:
        order?.createdAt || "",

      orderId:
        order?.orderId || "",

      type:
        invoice.invoiceType,

      company: {
        name: "Native",
        tagline:
          "Eat Healthy, Stay Healthy",

        address1:
          process.env.COMPANY_ADDRESS1 || "",

        address2:
          process.env.COMPANY_ADDRESS2 || "",

        city:
          process.env.COMPANY_CITY || "",

        state:
          process.env.COMPANY_STATE || "",

        gstin:
          process.env.COMPANY_GSTIN || "",

        phone:
          process.env.COMPANY_PHONE || "",
      },

      customer: {
        name:
          invoice.customer?.name,

        phone:
          invoice.customer?.phone,

        email:
          invoice.customer?.email,

        address:
          invoice.customer?.address,

        city:
          invoice.customer?.city,

        state:
          invoice.customer?.state,

        pincode:
          invoice.customer?.pincode,

        gstin:
          invoice.customer?.gstNumber,

        stateCode: stateCode,
      },

      shipping: {
        name:
          invoice.customer?.name,

        phone:
          invoice.customer?.phone,

        address:
          invoice.customer?.address,

        city:
          invoice.customer?.city,

        state:
          invoice.customer?.state,

        pincode:
          invoice.customer?.pincode,
      },

      payment: {
        method:
          order?.payment?.method ||
          "ONLINE",

        status:
          invoice.paymentStatus,

        transactionId:
          order?.payment
            ?.transactionId || "",
      },

      items:
        invoice.items.map((item:any)=>({
        
          name: item.name,
        
          hsn: item.hsn,
        
          qty: item.qty,
        
          rate: item.price,
        
          discount:
            item.discount || 0,
        
          taxable:
            item.taxableValue || 0,
        
          gstPercent:
            item.gstPercent || 0,
        
          cgst:
            item.cgst || 0,
        
          sgst:
            item.sgst || 0,
        
          igst:
            item.igst || 0,
        
          total:
            item.total || 0,
        })),

      summary: {
        subtotal:
          invoice.subtotal || 0,
      
        discount:
          invoice.discount || 0,
      
        taxable:
          invoice.taxableAmount || 0,
      
        cgst:
          invoice.cgst || 0,
      
        sgst:
          invoice.sgst || 0,
      
        igst:
          invoice.igst || 0,
      
        grandTotal:
          invoice.grandTotal || 0,
      },

      placeOfSupply:
        invoice.customer?.state,

      stateCode,

      supplyType:
        invoice.invoiceType ===
        "B2B"
          ? "Business"
          : "Consumer",

      reverseCharge:
        "No",
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        message:
          err.message,
      },
      {
        status: 500,
      }
    );
  }
}
