import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Agreement, { ISignature } from '@/models/Agreement';
import mongoose from 'mongoose';
import bcryptjs from 'bcryptjs';

interface RouteParams {
  params: Promise<{ id: string }>;
}

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    await connectDB();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid agreement ID' }, { status: 400 });
    }

    const body = await req.json();
    const { partyEmail } = body;

    if (!partyEmail) {
      return NextResponse.json({ error: 'partyEmail is required' }, { status: 400 });
    }

    const agreement = await Agreement.findById(id);
    if (!agreement) {
      return NextResponse.json({ error: 'Agreement not found' }, { status: 404 });
    }

    if (!['PENDING_SIGNATURE', 'PARTIALLY_SIGNED', 'DRAFT'].includes(agreement.status)) {
      return NextResponse.json(
        { error: 'Agreement is not in a state where OTPs can be generated' },
        { status: 400 }
      );
    }

    const sigIndex = agreement.signatures.findIndex(
      (s: ISignature) => s.partyEmail === partyEmail
    );

    if (sigIndex === -1) {
      return NextResponse.json(
        { error: 'Party not found in agreement' },
        { status: 404 }
      );
    }

    if (agreement.signatures[sigIndex].signedAt) {
      return NextResponse.json(
        { error: 'This party has already signed the agreement' },
        { status: 400 }
      );
    }

    const rawOtp = generateOTP();
    const hashedOtp = await bcryptjs.hash(rawOtp, 10);
    const otpExpiry = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    agreement.signatures[sigIndex].otp = hashedOtp;
    agreement.signatures[sigIndex].otpExpiry = otpExpiry;
    agreement.signatures[sigIndex].otpVerified = false;

    await agreement.save();

    const partyName = agreement.signatures[sigIndex].partyName;

    // In production, send email here
    console.log(`[EMAIL SIMULATION] Sending OTP to ${partyEmail} (${partyName})`);
    console.log(`  Agreement: ${agreement.title}`);
    console.log(`  OTP: ${rawOtp} (expires in 30 minutes)`);
    console.log(`  Subject: Your OTP for signing "${agreement.title}"`);
    console.log(`  Body: Dear ${partyName}, your OTP to sign the agreement "${agreement.title}" is: ${rawOtp}. This OTP is valid for 30 minutes.`);

    return NextResponse.json({
      sent: true,
      message: 'OTP generated successfully. In production this would be sent via email.',
      // Return OTP for demo mode
      otp: rawOtp,
      note: 'OTP is shown here for demo purposes only. In production, OTP would only be sent via email and never returned in the API response.',
      expiresAt: otpExpiry,
    });
  } catch (error) {
    console.error('POST /api/agreements/[id]/otp error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
