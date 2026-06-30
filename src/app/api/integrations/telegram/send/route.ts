import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Integration from '@/models/Integration';

interface TelegramConfig {
  botToken?: string;
  chatIds?: string[];
}

interface SendResult {
  chatId: string;
  success: boolean;
  error?: string;
  messageId?: number;
}

export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connectDB();

  try {
    const body = await request.json();
    const { message, chatIds: requestedChatIds } = body as {
      message: string;
      chatIds?: string[];
    };

    if (!message) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 });
    }

    const integration = await Integration.findOne({
      businessId: userId,
      type: 'TELEGRAM',
      isActive: true,
    }).lean();

    if (!integration) {
      return NextResponse.json(
        { error: 'Telegram integration not configured or inactive' },
        { status: 404 }
      );
    }

    const config = integration.config as TelegramConfig;
    const { botToken, chatIds: configuredChatIds } = config;

    if (!botToken) {
      return NextResponse.json(
        { error: 'Telegram bot token not configured' },
        { status: 400 }
      );
    }

    const targetChatIds =
      requestedChatIds && requestedChatIds.length > 0
        ? requestedChatIds
        : configuredChatIds || [];

    if (targetChatIds.length === 0) {
      return NextResponse.json(
        { error: 'No chat IDs specified or configured' },
        { status: 400 }
      );
    }

    const results: SendResult[] = await Promise.all(
      targetChatIds.map(async (chatId) => {
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

          if (!response.ok || !data.ok) {
            return {
              chatId,
              success: false,
              error: data.description || `HTTP ${response.status}`,
            };
          }

          return {
            chatId,
            success: true,
            messageId: data.result?.message_id,
          };
        } catch (err) {
          return {
            chatId,
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
    console.error('POST /api/integrations/telegram/send error:', error);
    return NextResponse.json({ error: 'Failed to send Telegram message' }, { status: 500 });
  }
}
