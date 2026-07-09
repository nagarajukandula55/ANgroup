import { Resend } from "resend";
import { buildInvoiceEmailTemplate } from "./invoiceEmail.template";
import Integration from "@/models/Integration";

/**
 * Previously always used the platform-global RESEND_API_KEY/RESEND_FROM
 * env vars, ignoring the per-business Integration(provider: EMAIL) config
 * the admin Integrations UI already lets each business configure. Now
 * looks up that business's own Resend credentials first (set via the
 * Email tab in /admin/integrations, emailProvider: 'RESEND'), and only
 * falls back to the global env vars if the business hasn't configured its
 * own key yet — so nothing breaks for businesses that haven't set this up.
 */
async function resolveResendCreds(businessId?: string): Promise<{ apiKey: string; from: string }> {
  if (businessId) {
    try {
      const integration = await Integration.findOne({
        businessId,
        provider: "EMAIL",
        isActive: true,
      }).lean();
      const cfg = (integration as any)?.config;
      if (cfg?.provider === "RESEND" && cfg?.resendApiKey) {
        return {
          apiKey: cfg.resendApiKey,
          from: cfg.resendFromEmail || cfg.fromEmail || process.env.RESEND_FROM || "",
        };
      }
    } catch (err) {
      console.error("EMAIL: failed to load business Resend config, falling back to global", err);
    }
  }
  return {
    apiKey: process.env.RESEND_API_KEY || "",
    from: process.env.RESEND_FROM || "",
  };
}

/**
 * Newsletter welcome email — reuses the same per-business Resend
 * credential resolution as invoice emails (falls back to global env vars
 * if the business hasn't configured its own key). Non-fatal by design:
 * the subscribe route should still succeed even if the email fails to
 * send, since the subscriber record itself is the source of truth.
 */
export async function sendNewsletterWelcomeEmail({
  to,
  businessId,
}: {
  to: string;
  businessId?: string;
}) {
  try {
    const { apiKey, from } = await resolveResendCreds(businessId);
    if (!apiKey) {
      throw new Error("No Resend API key configured (neither business-specific nor global RESEND_API_KEY)");
    }
    const resend = new Resend(apiKey);

    const result = await resend.emails.send({
      from,
      to,
      subject: "You're subscribed!",
      html: `<p>Thanks for subscribing — you'll hear from us with new products, offers, and updates.</p>`,
    });

    return { success: true, result };
  } catch (err: any) {
    console.error("NEWSLETTER EMAIL ERROR", err);
    return { success: false, error: err?.message || "Unknown email error" };
  }
}

/**
 * Password reset email — unlike the newsletter welcome email, failures
 * here MUST propagate (the caller needs to know whether the reset link
 * actually went out) rather than being swallowed as best-effort.
 */
export async function sendPasswordResetEmail({
  to,
  resetUrl,
  businessId,
}: {
  to: string;
  resetUrl: string;
  businessId?: string;
}) {
  const { apiKey, from } = await resolveResendCreds(businessId);
  if (!apiKey) {
    throw new Error("No Resend API key configured (neither business-specific nor global RESEND_API_KEY)");
  }
  const resend = new Resend(apiKey);

  return resend.emails.send({
    from,
    to,
    subject: "Reset your password",
    html: `<p>We received a request to reset your password.</p>
<p><a href="${resetUrl}">Click here to reset your password</a>. This link expires in 30 minutes and can only be used once.</p>
<p>If you didn't request this, you can safely ignore this email.</p>`,
  });
}

export async function sendInvoiceEmail({
  to,
  customerName,
  invoiceNumber,
  pdfUrl,
  grandTotal,
  orderId,
  businessId,
}: any) {
  try {

    console.log("RESEND EMAIL START", {
      to,
      invoiceNumber,
      orderId,
      businessId,
    });

    const { apiKey, from } = await resolveResendCreds(businessId);
    if (!apiKey) {
      throw new Error("No Resend API key configured (neither business-specific nor global RESEND_API_KEY)");
    }
    const resend = new Resend(apiKey);

    const html = buildInvoiceEmailTemplate({
      customerName,
      invoiceNumber,
      pdfUrl,
      grandTotal,
      orderId,
    });

    const result = await resend.emails.send({
      from,
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
