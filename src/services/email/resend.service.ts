import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

/**
 * PRODUCTION INVOICE EMAIL SERVICE
 */
export async function sendInvoiceEmail({
  to,
  customerName,
  invoiceNumber,
  pdfUrl,
  grandTotal,
  orderId,
}: any) {
  try {
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

    return { success: true, result };
  } catch (err: any) {
    console.error("Resend Email Error:", err.message);
    return { success: false, error: err.message };
  }
}
