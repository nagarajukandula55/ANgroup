import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Integration from '@/models/Integration';

interface TelegramConfig {
  botToken?: string;
  chatIds?: string[];
  notificationTriggers?: string[];
}

interface WhatsAppConfig {
  phoneNumberId?: string;
  accessToken?: string;
  recipients?: string[];
  notificationTriggers?: string[];
}

interface ChannelResult {
  channel: string;
  sent: boolean;
  error?: string;
  details?: unknown;
}

async function sendTelegram(
  config: TelegramConfig,
  message: string
): Promise<ChannelResult> {
  const { botToken, chatIds } = config;

  if (!botToken || !chatIds || chatIds.length === 0) {
    return { channel: 'telegram', sent: false, error: 'Missing bot token or chat IDs' };
  }

  const results = await Promise.all(
    chatIds.map(async (chatId) => {
      try {
        const response = await fetch(
          `https://api.telegram.org/bot${botToken}/sendMessage`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: message,
              parse_mode: 'HTML',
            }),
          }
        );
        const data = await response.json();
        return { chatId, success: response.ok && data.ok, error: data.description };
      } catch (err) {
        return {
          chatId,
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        };
      }
    })
  );

  const anySuccess = results.some((r) => r.success);
  return { channel: 'telegram', sent: anySuccess, details: results };
}

async function sendWhatsApp(
  config: WhatsAppConfig,
  message: string
): Promise<ChannelResult> {
  const { phoneNumberId, accessToken, recipients } = config;

  if (!phoneNumberId || !accessToken || !recipients || recipients.length === 0) {
    return {
      channel: 'whatsapp',
      sent: false,
      error: 'Missing phone number ID, access token, or recipients',
    };
  }

  const results = await Promise.all(
    recipients.map(async (to) => {
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
              text: { preview_url: false, body: message },
            }),
          }
        );
        const data = await response.json();
        if (!response.ok) {
          return {
            to,
            success: false,
            error: data?.error?.message || `HTTP ${response.status}`,
          };
        }
        return { to, success: true, messageId: data?.messages?.[0]?.id };
      } catch (err) {
        return {
          to,
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        };
      }
    })
  );

  const anySuccess = results.some((r) => r.success);
  return { channel: 'whatsapp', sent: anySuccess, details: results };
}

export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connectDB();

  try {
    const body = await request.json();
    const {
      event,
      message,
      data: eventData,
      channels,
    } = body as {
      event: string;
      message: string;
      data?: Record<string, unknown>;
      channels?: string[];
    };

    if (!event || !message) {
      return NextResponse.json(
        { error: 'event and message are required' },
        { status: 400 }
      );
    }

    const requestedChannels = channels
      ? channels.map((c) => c.toUpperCase())
      : ['TELEGRAM', 'WHATSAPP'];

    const integrations = await Integration.find({
      businessId: userId,
      type: { $in: requestedChannels },
      isActive: true,
    }).lean();

    const formattedMessage = eventData
      ? `${message}\n\n${Object.entries(eventData)
          .map(([k, v]) => `• <b>${k}:</b> ${v}`)
          .join('\n')}`
      : message;

    const channelResults: ChannelResult[] = [];

    const telegramIntegration = integrations.find((i) => i.type === 'TELEGRAM');
    if (telegramIntegration && requestedChannels.includes('TELEGRAM')) {
      const config = telegramIntegration.config as TelegramConfig;
      const triggers = config.notificationTriggers;
      if (!triggers || triggers.length === 0 || triggers.includes(event)) {
        const result = await sendTelegram(config, formattedMessage);
        channelResults.push(result);
      } else {
        channelResults.push({
          channel: 'telegram',
          sent: false,
          error: `Event "${event}" not in notification triggers`,
        });
      }
    } else if (requestedChannels.includes('TELEGRAM')) {
      channelResults.push({
        channel: 'telegram',
        sent: false,
        error: 'Telegram integration not configured or inactive',
      });
    }

    const whatsappIntegration = integrations.find((i) => i.type === 'WHATSAPP');
    if (whatsappIntegration && requestedChannels.includes('WHATSAPP')) {
      const config = whatsappIntegration.config as WhatsAppConfig;
      const triggers = config.notificationTriggers;
      if (!triggers || triggers.length === 0 || triggers.includes(event)) {
        const result = await sendWhatsApp(config, message);
        channelResults.push(result);
      } else {
        channelResults.push({
          channel: 'whatsapp',
          sent: false,
          error: `Event "${event}" not in notification triggers`,
        });
      }
    } else if (requestedChannels.includes('WHATSAPP')) {
      channelResults.push({
        channel: 'whatsapp',
        sent: false,
        error: 'WhatsApp integration not configured or inactive',
      });
    }

    const anySent = channelResults.some((r) => r.sent);

    return NextResponse.json({
      event,
      notified: anySent,
      channels: channelResults,
    });
  } catch (error) {
    console.error('POST /api/integrations/notify error:', error);
    return NextResponse.json({ error: 'Failed to send notifications' }, { status: 500 });
  }
}
