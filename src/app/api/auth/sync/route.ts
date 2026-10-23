/* ─────────────────────────────────────────────────────────────
   src/app/api/auth/sync/route.ts  –  Sync user doc on login
   ───────────────────────────────────────────────────────────── */

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { verifyAuth } from '@/lib/firebase/server-auth';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const decoded = await verifyAuth(request);
  if (!decoded) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const uid = decoded.uid;
  const userRef = adminDb.collection('users').doc(uid);
  const userSnap = await userRef.get();

  if (!userSnap.exists) {
    // Create new user document
    await userRef.set({
      email: decoded.email || '',
      name: decoded.name || decoded.email?.split('@')[0] || 'User',
      photoURL: decoded.picture || '',
      upiId: '',
      mobile: '',
      isBlocked: false,
      walletBalance: 0,
      totalEarned: 0,
      totalRedemptions: 0,
      createdAt: FieldValue.serverTimestamp(),
      lastActive: FieldValue.serverTimestamp(),
    });
  } else {
    // Update last active timestamp
    await userRef.update({
      lastActive: FieldValue.serverTimestamp(),
      ...(decoded.name && { name: decoded.name }),
      ...(decoded.picture && { photoURL: decoded.picture }),
    });
  }

  return NextResponse.json({ success: true });
}
