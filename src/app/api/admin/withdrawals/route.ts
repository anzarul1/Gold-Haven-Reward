/* ─────────────────────────────────────────────────────────────
   src/app/api/admin/withdrawals/route.ts  –  Admin withdrawals
   
   Payouts are MANUAL for now. Structured so Razorpay X or
   Cashfree Payouts can be plugged in later.
   ───────────────────────────────────────────────────────────── */

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { verifyAdmin } from '@/lib/firebase/server-auth';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const decoded = await verifyAdmin(request);
  if (!decoded) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const limit = parseInt(searchParams.get('limit') || '50');

  let query: FirebaseFirestore.Query = adminDb.collection('withdrawals');

  if (status) {
    query = query.where('status', '==', status);
  }

  query = query.orderBy('createdAt', 'desc').limit(limit);

  const snapshot = await query.get();

  // Enrich with user info
  const withdrawals = await Promise.all(
    snapshot.docs.map(async (doc) => {
      const data = doc.data();
      let userName = '';
      let userEmail = '';

      if (data.uid) {
        const userSnap = await adminDb.collection('users').doc(data.uid).get();
        if (userSnap.exists) {
          const ud = userSnap.data()!;
          userName = ud.name || '';
          userEmail = ud.email || '';
        }
      }

      return {
        id: doc.id,
        ...data,
        userName,
        userEmail,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        processedAt: data.processedAt?.toDate?.()?.toISOString() || null,
      };
    })
  );

  return NextResponse.json({ success: true, data: withdrawals });
}

// ── PUT: Approve (mark paid) or Reject a withdrawal ──
export async function PUT(request: NextRequest) {
  const decoded = await verifyAdmin(request);
  if (!decoded) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  let body: {
    withdrawalId: string;
    action: 'paid' | 'rejected';
    txnRef?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
  }

  const { withdrawalId, action, txnRef } = body;

  try {
    await adminDb.runTransaction(async (txn) => {
      const withdrawalRef = adminDb.collection('withdrawals').doc(withdrawalId);
      const withdrawalSnap = await txn.get(withdrawalRef);

      if (!withdrawalSnap.exists) {
        throw new Error('Withdrawal not found');
      }

      const withdrawal = withdrawalSnap.data()!;
      if (withdrawal.status !== 'pending') {
        throw new Error('Withdrawal is not in pending status');
      }

      const now = FieldValue.serverTimestamp();

      if (action === 'paid') {
        // Mark as paid
        txn.update(withdrawalRef, {
          status: 'paid',
          txnRef: txnRef || '',
          processedAt: now,
        });

        /*
         * ── Future: Razorpay X / Cashfree Payouts integration ──
         * Replace the manual marking above with:
         * 
         * const payout = await payoutProvider.createPayout({
         *   upiId: withdrawal.upiId,
         *   amount: withdrawal.amount,
         *   referenceId: withdrawalId,
         * });
         * 
         * txn.update(withdrawalRef, {
         *   status: 'paid',
         *   txnRef: payout.transactionId,
         *   processedAt: now,
         * });
         */
      } else if (action === 'rejected') {
        // Reject and return balance to wallet
        const userRef = adminDb.collection('users').doc(withdrawal.uid);
        const ledgerRef = adminDb.collection('walletLedger').doc();

        txn.update(withdrawalRef, {
          status: 'rejected',
          processedAt: now,
        });

        // Credit the balance back
        txn.update(userRef, {
          walletBalance: FieldValue.increment(withdrawal.amount),
        });

        // Create ledger credit for rejected withdrawal
        txn.set(ledgerRef, {
          uid: withdrawal.uid,
          type: 'credit',
          amount: withdrawal.amount,
          reason: 'Withdrawal rejected - refund',
          refId: withdrawalId,
          createdAt: now,
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Withdrawal action error:', err);
    return NextResponse.json(
      { success: false, error: (err as Error).message || 'Failed to process withdrawal' },
      { status: 400 }
    );
  }
}
