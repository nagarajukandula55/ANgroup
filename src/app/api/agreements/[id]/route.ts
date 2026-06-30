import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Agreement from '@/models/Agreement';
import mongoose from 'mongoose';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    await connectDB();

    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid agreement ID' }, { status: 400 });
    }

    const agreement = await Agreement.findById(id)
      .select('-signatures.otp')
      .lean();

    if (!agreement) {
      return NextResponse.json({ error: 'Agreement not found' }, { status: 404 });
    }

    return NextResponse.json({ agreement });
  } catch (error) {
    console.error('GET /api/agreements/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    await connectDB();

    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid agreement ID' }, { status: 400 });
    }

    const agreement = await Agreement.findById(id);
    if (!agreement) {
      return NextResponse.json({ error: 'Agreement not found' }, { status: 404 });
    }

    if (agreement.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Only DRAFT agreements can be edited' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const {
      title,
      parties,
      content,
      variables,
      expiresAt,
      governingLaw,
      jurisdiction,
    } = body;

    if (title) agreement.title = title;
    if (content !== undefined) agreement.content = content;
    if (variables !== undefined) agreement.variables = variables;
    if (expiresAt) agreement.expiresAt = new Date(expiresAt);
    if (governingLaw) agreement.governingLaw = governingLaw;
    if (jurisdiction) agreement.jurisdiction = jurisdiction;

    if (parties) {
      agreement.parties = parties;
      agreement.signatures = parties.map((p: { name: string; email: string; role: string }) => ({
        partyEmail: p.email,
        partyName: p.name,
        partyRole: p.role,
        otpVerified: false,
      }));
    }

    await agreement.save();

    return NextResponse.json({ agreement });
  } catch (error) {
    console.error('PUT /api/agreements/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    await connectDB();

    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid agreement ID' }, { status: 400 });
    }

    const agreement = await Agreement.findById(id);
    if (!agreement) {
      return NextResponse.json({ error: 'Agreement not found' }, { status: 404 });
    }

    if (agreement.status === 'FULLY_SIGNED') {
      return NextResponse.json(
        { error: 'Fully signed agreements cannot be cancelled' },
        { status: 400 }
      );
    }

    agreement.status = 'CANCELLED';
    await agreement.save();

    console.log(`Agreement ${id} cancelled by user ${userId}`);

    return NextResponse.json({ message: 'Agreement cancelled successfully', agreement });
  } catch (error) {
    console.error('DELETE /api/agreements/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
