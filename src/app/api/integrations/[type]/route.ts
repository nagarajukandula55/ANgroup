import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Integration from '@/models/Integration';

interface RouteParams {
  params: Promise<{ type: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const userId = request.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { type } = await params;

  await connectDB();

  try {
    const integration = await Integration.findOne({
      businessId: userId,
      type: type.toUpperCase(),
    }).lean();

    if (!integration) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
    }

    return NextResponse.json({ integration });
  } catch (error) {
    console.error(`GET /api/integrations/${type} error:`, error);
    return NextResponse.json({ error: 'Failed to fetch integration' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const userId = request.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { type } = await params;

  await connectDB();

  try {
    const body = await request.json();
    const { name, config, isActive } = body;

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (config !== undefined) updateData.config = config;
    if (isActive !== undefined) updateData.isActive = isActive;

    const integration = await Integration.findOneAndUpdate(
      { businessId: userId, type: type.toUpperCase() },
      { $set: updateData },
      { new: true }
    );

    if (!integration) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
    }

    return NextResponse.json({ integration });
  } catch (error) {
    console.error(`PUT /api/integrations/${type} error:`, error);
    return NextResponse.json({ error: 'Failed to update integration' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const userId = request.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { type } = await params;

  await connectDB();

  try {
    const integration = await Integration.findOneAndUpdate(
      { businessId: userId, type: type.toUpperCase() },
      { $set: { isActive: false } },
      { new: true }
    );

    if (!integration) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Integration disabled', integration });
  } catch (error) {
    console.error(`DELETE /api/integrations/${type} error:`, error);
    return NextResponse.json({ error: 'Failed to disable integration' }, { status: 500 });
  }
}
