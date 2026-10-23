/* ─────────────────────────────────────────────────────────────
   src/app/api/admin/redemptions/route.ts  –  Admin redemption logs
   ───────────────────────────────────────────────────────────── */

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { verifyAdmin } from '@/lib/firebase/server-auth';
import { Timestamp } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const decoded = await verifyAdmin(request);
  if (!decoded) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const uid = searchParams.get('uid');
  const amountStr = searchParams.get('amount');
  const startDateStr = searchParams.get('startDate');
  const endDateStr = searchParams.get('endDate');
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 500);

  try {
    let query: FirebaseFirestore.Query = adminDb.collection('redemptions');

    if (uid) {
      query = query.where('uid', '==', uid);
    }

    if (amountStr) {
      const amount = parseFloat(amountStr);
      if (!isNaN(amount)) {
        query = query.where('amount', '==', amount);
      }
    }

    if (startDateStr) {
      const startDate = new Date(startDateStr);
      startDate.setHours(0, 0, 0, 0);
      query = query.where('createdAt', '>=', Timestamp.fromDate(startDate));
    }

    if (endDateStr) {
      const endDate = new Date(endDateStr);
      endDate.setHours(23, 59, 59, 999);
      query = query.where('createdAt', '<=', Timestamp.fromDate(endDate));
    }

    query = query.orderBy('createdAt', 'desc').limit(limit);

    const snapshot = await query.get();

    // Cache user emails to minimize lookups
    const userEmailCache = new Map<string, string>();

    const redemptions = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const data = doc.data();
        let userEmail = 'Unknown';

        if (data.uid) {
          if (userEmailCache.has(data.uid)) {
            userEmail = userEmailCache.get(data.uid)!;
          } else {
            const userDoc = await adminDb.collection('users').doc(data.uid).get();
            if (userDoc.exists) {
              userEmail = userDoc.data()?.email || 'No email';
            }
            userEmailCache.set(data.uid, userEmail);
          }
        }

        return {
          id: doc.id,
          uid: data.uid,
          userEmail,
          code: data.code,
          amount: data.amount,
          ip: data.ip || '—',
          userAgent: data.userAgent || '—',
          createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        };
      })
    );

    return NextResponse.json({ success: true, data: redemptions });
  } catch (err) {
    console.error('Error fetching redemptions:', err);
    return NextResponse.json({ success: false, error: 'Failed to fetch redemptions' }, { status: 500 });
  }
}
