export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { runDueAutomationRules, publishDueScheduledPosts } from '@/core/social/automationEngine';

/**
 * Single cron entry point for social auto-pilot: publishes any
 * SCHEDULED posts whose time has come, then runs any AutomationRule whose
 * nextRunAt is due (content generation + publish + reshare). Safe to call
 * on any cadence -- both halves are no-ops when nothing is due.
 */
export async function GET() {
  try {
    await connectDB();

    const [scheduled, automation] = await Promise.all([publishDueScheduledPosts(), runDueAutomationRules()]);

    return NextResponse.json({
      success: true,
      scheduledPosts: scheduled,
      automation,
    });
  } catch (err: any) {
    console.error('SOCIAL AUTOPILOT CRON ERROR:', err);
    return NextResponse.json({ success: false, message: err?.message || 'Cron failed' }, { status: 500 });
  }
}
