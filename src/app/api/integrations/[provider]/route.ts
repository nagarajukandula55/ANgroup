// Route: /api/integrations/[provider]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/connectDB';
import Integration from '@/models/Integration';

interface RouteContext {
  params: Promise<{ provider: string }>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  const userId = req.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const businessId = req.headers.get('x-active-business-id');
  const { provider } = await context.params;

  await connectDB();

  const integration = await Integration.findOne({
    businessId,
    provider: provider.toUpperCase(),
  }).lean();

  return NextResponse.json({
    success: true,
    integration: integration ?? null,
  });
}

export async function PUT(req: NextRequest, context: RouteContext) {
  const userId = req.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const businessId = req.headers.get('x-active-business-id');
  const { provider } = await context.params;
  const body = await req.json();
  const { config, isActive } = body;

  await connectDB();

  const updateFields: Record<string, unknown> = {};
  if (config !== undefined) updateFields.config = config;
  if (isActive !== undefined) updateFields.isActive = isActive;

  await Integration.findOneAndUpdate(
    { businessId, provider: provider.toUpperCase() },
    { $set: updateFields },
    { new: true }
  );

  return NextResponse.json({ success: true });
}
