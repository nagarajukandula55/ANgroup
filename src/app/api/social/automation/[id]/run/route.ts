import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import AutomationRule from '@/models/AutomationRule';
import { runAutomationRule } from '@/core/social/automationEngine';
import { logAction } from '@/lib/audit/logAction';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();

    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid rule ID' }, { status: 400 });
    }

    const rule = await AutomationRule.findById(id);
    if (!rule) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
    }

    const result = await runAutomationRule(rule);

    logAction({ action: 'RUN', entity: 'AutomationRule', entityId: id, after: result, req: request });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('POST /api/social/automation/[id]/run error:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
