import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Integration from '@/models/Integration';

interface WhatsAppConfig {
  phoneNumberId?: string;
  accessToken?: string;
  wabaId?: string;
  recipients?: string[];
}

interface SendResult {
  to: string;
  success: boolean;
  error?: string;
  messageId?: string;
}

export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connectDB();

  try {
    const body = await request.json();
    const { message, to: requestedRecipients } = body as {
      message: string;
      to?: string[];
    };

    if (!message) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 });
    }

    const integration = await Integration.findOne({
      businessId: userId,
      type: 'WHATSAPP',
      isActive: true,
    }).lean();

    if (!integration) {
      return NextResponse.json(
        { error: 'WhatsApp integration not configured or inactive' },
        { status: 404 }
      );
    }

    const config = integration.config as WhatsAppConfig;
    const { phoneNumberId, accessToken, recipients: configuredRecipients } = config;

    if (!phoneNumberId || !accessToken) {
      return NextResponse.json(
        { error: 'WhatsApp phone number ID or access token not configured' },
        { status: 400 }
      );
    }

    const targetRecipients =
      requestedRecipients && requestedRecipients.length > 0
        ? requestedRecipients
        : configuredRecipients || [];

    if (targetRecipients.length === 0) {
      return NextResponse.json(
        { error: 'No recipients specified or configured' },
        { status: 400 }
      );
    }

    const results: SendResult[] = await Promise.all(
      targetRecipients.map(async (to) => {
        try {
          const response = await fetch(
            `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
              },
              body: JSON.stringify({
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to,
                type: 'text',
                text: {
                  preview_url: false,
                  body: message,
                },
              }),
            }
          );

          const data = await response.json();

          if (!response.ok) {
            const errMsg =
              data?.error?.message ||
              data?.error?.error_data?.details ||
              `HTTP ${response.status}`;
            return { to, success: false, error: errMsg };
          }

          const messageId = data?.messages?.[0]?.id;
          return { to, success: true, messageId };
        } catch (err) {
          return {
            to,
            success: false,
            error: err instanceof Error ? err.message : 'Unknown error',
          };
        }
      })
    );

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      results,
      summary: {
        total: results.length,
        success: successCount,
        failed: failCount,
      },
    });
  } catch (error) {
    console.error('POST /api/integrations/whatsapp/send error:', error);
    return NextResponse.json({ error: 'Failed to send WhatsApp message' }, { status: 500 });
  }
}
