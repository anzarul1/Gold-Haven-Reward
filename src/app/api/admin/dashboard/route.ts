/* ─────────────────────────────────────────────────────────────
   src/app/api/admin/dashboard/route.ts  –  Admin dashboard stats
   ───────────────────────────────────────────────────────────── */

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { verifyAdmin } from '@/lib/firebase/server-auth';
import { todayKey, startOfMonth } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const decoded = await verifyAdmin(request);
  if (!decoded) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  try {
    // Get total codes stats
    const [totalSnap, usedSnap, unusedSnap] = await Promise.all([
      adminDb.collection('codes').count().get(),
      adminDb.collection('codes').where('status', '==', 'used').count().get(),
      adminDb.collection('codes').where('status', '==', 'unused').count().get(),
    ]);

    const totalCodes = totalSnap.data().count;
    const redeemedCodes = usedSnap.data().count;
    const unusedCodes = unusedSnap.data().count;

    // Today's stats
    const today = todayKey();
    const dailyStatsSnap = await adminDb.collection('dailyStats').doc(today).get();
    const cashbackToday = dailyStatsSnap.exists
      ? dailyStatsSnap.data()?.totalCashbackGiven || 0
      : 0;

    // This month's stats
    const monthStart = startOfMonth();
    const monthKey = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, '0')}`;
    const monthStatsSnap = await adminDb
      .collection('dailyStats')
      .where('__name__', '>=', `${monthKey}-01`)
      .where('__name__', '<=', `${monthKey}-31`)
      .get();

    let cashbackThisMonth = 0;
    monthStatsSnap.docs.forEach((doc) => {
      cashbackThisMonth += doc.data().totalCashbackGiven || 0;
    });

    // Active users (users who have at least 1 redemption)
    const activeUsersSnap = await adminDb
      .collection('users')
      .where('totalRedemptions', '>', 0)
      .count()
      .get();
    const activeUsers = activeUsersSnap.data().count;

    // Pending withdrawals
    const pendingSnap = await adminDb
      .collection('withdrawals')
      .where('status', '==', 'pending')
      .count()
      .get();
    const pendingWithdrawals = pendingSnap.data().count;

    // Daily chart (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const chartKey = `${thirtyDaysAgo.getFullYear()}-${String(thirtyDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(thirtyDaysAgo.getDate()).padStart(2, '0')}`;

    const chartSnap = await adminDb
      .collection('dailyStats')
      .where('__name__', '>=', chartKey)
      .orderBy('__name__')
      .get();

    const dailyChart = chartSnap.docs.map((doc) => ({
      date: doc.id,
      count: doc.data().redemptionCount || 0,
      amount: doc.data().totalCashbackGiven || 0,
    }));

    return NextResponse.json({
      success: true,
      data: {
        totalCodes,
        redeemedCodes,
        unusedCodes,
        cashbackToday,
        cashbackThisMonth,
        activeUsers,
        pendingWithdrawals,
        dailyChart,
      },
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to load dashboard' },
      { status: 500 }
    );
  }
}
