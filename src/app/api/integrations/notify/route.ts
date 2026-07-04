// Route: /api/integrations/notify/route.ts
import { NextRequest, NextResponse } from 'next/server';
<<<<<<< HEAD
import { connectDB } from '@/lib/mongodb'
=======
import { connectDB } from '@/lib/mongodb';
>>>>>>> 1440f99 (Fix: Agreement variables field, correct connectDB imports across all new API routes)
import Integration, { TelegramConfig, WhatsAppConfig, SlackConfig } from '@/models/Integration';

async function sendTelegram(config: TelegramConfig, message: string): Promise<void> {
  const chatIds = config.chatIds ?? [];
  await Promise.all(
    chatIds.map((chatId) =>
      fetch(`https://api.telegram.org/bot${config.botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'Markdown',
        }),
      })
    )
  );
}

async function sendWhatsApp(config: WhatsAppConfig, message: string): Promise<void> {
  const recipients = config.recipients ?? [];
  await Promise.all(
    recipients.map((to) =>
      fetch(
        `https://graph.facebook.com/v17.0/${config.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.accessToken}`,
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to,
            type: 'text',
            text: { body: message },
          }),
        }
      )
    )
  );
}

async function sendSlack(config: SlackConfig, message: string): Promise<void> {
  await fetch(config.webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      channel: config.channel,
      text: message,
    }),
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { event, message, businessId } = body;

  await connectDB();

  const integrations = await Integration.find({
    businessId,
    isActive: true,
  }).lean();

  const matching = integrations.filter((integration) => {
    const config = integration.config as { notificationTriggers?: string[] };
    return Array.isArray(config?.notificationTriggers) &&
      config.notificationTriggers.includes(event);
  });

  let notified = 0;

  await Promise.allSettled(
    matching.map(async (integration) => {
      try {
        switch (integration.provider) {
          case 'TELEGRAM':
            await sendTelegram(integration.config as TelegramConfig, message);
            break;
          case 'WHATSAPP':
            await sendWhatsApp(integration.config as WhatsAppConfig, message);
            break;
          case 'SLACK':
            await sendSlack(integration.config as SlackConfig, message);
            break;
          default:
            return;
        }
        notified++;
      } catch {
        // fire-and-forget: swallow errors silently
      }
    })
  );

  return NextResponse.json({ success: true, notified });
}
