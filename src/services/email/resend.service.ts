import { Resend } from "resend";
import { buildInvoiceEmailTemplate } from "./invoiceEmail.template";

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function sendInvoiceEmail({
  to,
  customerName,
  invoiceNumber,
  pdfUrl,
  grandTotal,
  orderId,
}: any) {
  try {

    console.log("RESEND EMAIL START", {
      to,
      invoiceNumber,
      orderId,
    });

    const html = buildInvoiceEmailTemplate({
      customerName,
      invoiceNumber,
      pdfUrl,
      grandTotal,
      orderId,
    });

    const result = await resend.emails.send({
      from: process.env.RESEND_FROM!,
      to,
      subject: `Invoice ${invoiceNumber} | AN Group`,
      html,
    });

    console.log(
      "RESEND SUCCESS",
      JSON.stringify(result, null, 2)
    );

    return {
      success: true,
      result,
    };

  } catch (err: any) {

    console.error(
      "RESEND ERROR",
      err
    );

    return {
      success: false,
      error:
        err?.message ||
        "Unknown email error",
    };
  }
}
