/* ─────────────────────────────────────────────────────────────
   src/app/api/withdraw/route.ts  –  Request withdrawal
   
   Runs in a transaction: validates balance, deducts via ledger
   debit, and creates a pending withdrawal record.
   ───────────────────────────────────────────────────────────── */

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { verifyAuth } from '@/lib/firebase/server-auth';
import { FieldValue } from 'firebase-admin/firestore';
import { isValidUpiId, DEFAULT_SETTINGS } from '@/lib/constants';

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
  let body: { amount?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid request' },
      { status: 400 }
    );
  }

  const amount = body.amount;
  if (!amount || typeof amount !== 'number' || amount <= 0) {
    return NextResponse.json(
      { success: false, error: 'Invalid withdrawal amount' },
      { status: 400 }
    );
  }

  try {
    const result = await adminDb.runTransaction(async (txn) => {
      const userRef = adminDb.collection('users').doc(uid);
      const settingsRef = adminDb.collection('settings').doc('main');

      const [userSnap, settingsSnap] = await Promise.all([
        txn.get(userRef),
        txn.get(settingsRef),
      ]);

      if (!userSnap.exists) {
        return { error: 'User not found' };
      }

      const userData = userSnap.data()!;
      const settings = settingsSnap.exists
        ? settingsSnap.data()!
        : DEFAULT_SETTINGS;

      // Check if blocked
      if (userData.isBlocked) {
        return { error: 'Your account has been suspended. Contact support.' };
      }

      // Validate UPI ID
      if (!userData.upiId || !isValidUpiId(userData.upiId)) {
        return { error: 'Please add a valid UPI ID in your profile before withdrawing.' };
      }

      // Check minimum withdrawal
      const minWithdrawal = settings.minWithdrawal || DEFAULT_SETTINGS.minWithdrawal;
      if (amount < minWithdrawal) {
        return { error: `Minimum withdrawal amount is ₹${minWithdrawal}` };
      }

      // Check balance
      if (userData.walletBalance < amount) {
        return { error: 'Insufficient balance' };
      }

      // Check for pending withdrawals
      const pendingSnap = await adminDb
        .collection('withdrawals')
        .where('uid', '==', uid)
        .where('status', '==', 'pending')
        .limit(1)
        .get();

      if (!pendingSnap.empty) {
        return { error: 'You already have a pending withdrawal. Please wait for it to be processed.' };
      }

      // ── All checks passed – Create withdrawal ──
      const withdrawalRef = adminDb.collection('withdrawals').doc();
      const ledgerRef = adminDb.collection('walletLedger').doc();
      const now = FieldValue.serverTimestamp();

      // Debit wallet
      txn.update(userRef, {
        walletBalance: FieldValue.increment(-amount),
        lastActive: now,
      });

      // Create ledger debit
      txn.set(ledgerRef, {
        uid,
        type: 'debit',
        amount,
        reason: 'Withdrawal request',
        refId: withdrawalRef.id,
        createdAt: now,
      });

      // Create withdrawal record
      txn.set(withdrawalRef, {
        uid,
        upiId: userData.upiId,
        amount,
        status: 'pending',
        txnRef: null,
        createdAt: now,
        processedAt: null,
      });

      return {
        success: true,
        newBalance: userData.walletBalance - amount,
      };
    });

    if ('error' in result && result.error) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { newBalance: result.newBalance },
    });
  } catch (err) {
    console.error('Withdraw error:', err);
    return NextResponse.json(
      { success: false, error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
