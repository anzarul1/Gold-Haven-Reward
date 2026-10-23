/* ─────────────────────────────────────────────────────────────
   src/app/api/wallet/route.ts  –  Get wallet data
   ───────────────────────────────────────────────────────────── */

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { verifyAuth } from '@/lib/firebase/server-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const decoded = await verifyAuth(request);
  if (!decoded) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const uid = decoded.uid;

  try {
    // Get user data
    const userSnap = await adminDb.collection('users').doc(uid).get();
    if (!userSnap.exists) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }
    const user = userSnap.data()!;

    // Get recent redemptions (last 20)
    const redemptionsSnap = await adminDb
      .collection('redemptions')
      .where('uid', '==', uid)
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get();

    const redemptions = redemptionsSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
    }));

    // Get withdrawals (last 20)
    const withdrawalsSnap = await adminDb
      .collection('withdrawals')
      .where('uid', '==', uid)
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get();

    const withdrawals = withdrawalsSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
      processedAt: doc.data().processedAt?.toDate?.()?.toISOString() || null,
    }));

    // Get settings for min withdrawal
    const settingsSnap = await adminDb.collection('settings').doc('main').get();
    const minWithdrawal = settingsSnap.exists
      ? settingsSnap.data()?.minWithdrawal || 20
      : 20;

    return NextResponse.json({
      success: true,
      data: {
        balance: user.walletBalance || 0,
        totalEarned: user.totalEarned || 0,
        redemptions,
        withdrawals,
        minWithdrawal,
      },
    });
  } catch (err) {
    console.error('Wallet fetch error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to load wallet data' },
      { status: 500 }
    );
  }
}
