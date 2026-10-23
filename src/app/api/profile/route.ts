/* ─────────────────────────────────────────────────────────────
   src/app/api/profile/route.ts  –  Get/update profile
   ───────────────────────────────────────────────────────────── */

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { verifyAuth } from '@/lib/firebase/server-auth';
import { isValidUpiId } from '@/lib/constants';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const decoded = await verifyAuth(request);
  if (!decoded) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const userSnap = await adminDb.collection('users').doc(decoded.uid).get();
  if (!userSnap.exists) {
    return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
  }

  const data = userSnap.data()!;
  return NextResponse.json({
    success: true,
    data: {
      email: data.email,
      name: data.name,
      photoURL: data.photoURL || '',
      upiId: data.upiId || '',
      mobile: data.mobile || '',
      walletBalance: data.walletBalance || 0,
      totalEarned: data.totalEarned || 0,
      totalRedemptions: data.totalRedemptions || 0,
    },
  });
}

export async function PUT(request: NextRequest) {
  const decoded = await verifyAuth(request);
  if (!decoded) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  let body: { upiId?: string; mobile?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
  }

  const updates: Record<string, unknown> = {
    lastActive: FieldValue.serverTimestamp(),
  };

  // Validate and set UPI ID
  if (body.upiId !== undefined) {
    if (body.upiId && !isValidUpiId(body.upiId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid UPI ID format. Use format: name@bank' },
        { status: 400 }
      );
    }
    updates.upiId = body.upiId;
  }

  // Set mobile (optional, no verification yet)
  if (body.mobile !== undefined) {
    if (body.mobile && !/^\+?[0-9]{10,13}$/.test(body.mobile.replace(/\s/g, ''))) {
      return NextResponse.json(
        { success: false, error: 'Invalid mobile number format' },
        { status: 400 }
      );
    }
    updates.mobile = body.mobile;
  }

  try {
    await adminDb.collection('users').doc(decoded.uid).update(updates);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Profile update error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
