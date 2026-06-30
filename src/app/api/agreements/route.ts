import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Agreement from '@/models/Agreement';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get('businessId');
    const status = searchParams.get('status');
    const templateType = searchParams.get('type');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 });
    }

    const query: Record<string, unknown> = {
      businessId: new mongoose.Types.ObjectId(businessId),
    };

    if (status && status !== 'ALL') {
      query.status = status;
    }
    if (templateType) {
      query.templateType = templateType;
    }
    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }

    const skip = (page - 1) * limit;

    const [agreements, total] = await Promise.all([
      Agreement.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-content -signatures.otp')
        .lean(),
      Agreement.countDocuments(query),
    ]);

    const stats = await Agreement.aggregate([
      { $match: { businessId: new mongoose.Types.ObjectId(businessId) } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const statsMap: Record<string, number> = {};
    for (const s of stats) {
      statsMap[s._id] = s.count;
    }

    return NextResponse.json({
      agreements,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        total,
        DRAFT: statsMap['DRAFT'] || 0,
        PENDING_SIGNATURE: statsMap['PENDING_SIGNATURE'] || 0,
        PARTIALLY_SIGNED: statsMap['PARTIALLY_SIGNED'] || 0,
        FULLY_SIGNED: statsMap['FULLY_SIGNED'] || 0,
        EXPIRED: statsMap['EXPIRED'] || 0,
        CANCELLED: statsMap['CANCELLED'] || 0,
      },
    });
  } catch (error) {
    console.error('GET /api/agreements error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const userId = req.headers.get('x-user-id');
    const userName = req.headers.get('x-user-name');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      businessId,
      templateType,
      title,
      parties,
      content,
      variables,
      expiresAt,
      governingLaw,
      jurisdiction,
    } = body;

    if (!businessId || !templateType || !title) {
      return NextResponse.json(
        { error: 'businessId, templateType, and title are required' },
        { status: 400 }
      );
    }

    if (!parties || parties.length < 2) {
      return NextResponse.json(
        { error: 'At least 2 parties are required' },
        { status: 400 }
      );
    }

    const agreement = await Agreement.create({
      businessId: new mongoose.Types.ObjectId(businessId),
      templateType,
      title,
      parties,
      content: content || '',
      variables: variables || {},
      status: 'DRAFT',
      signatures: parties.map((p: { name: string; email: string; role: string }) => ({
        partyEmail: p.email,
        partyName: p.name,
        partyRole: p.role,
        otpVerified: false,
      })),
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      governingLaw: governingLaw || 'Indian Contract Act, 1872',
      jurisdiction: jurisdiction || 'India',
      createdBy: new mongoose.Types.ObjectId(userId),
    });

    console.log(`Agreement created by ${userName || userId}: ${agreement._id}`);

    return NextResponse.json({ agreement }, { status: 201 });
  } catch (error) {
    console.error('POST /api/agreements error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
