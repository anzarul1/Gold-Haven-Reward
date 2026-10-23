/* ─────────────────────────────────────────────────────────────
   src/app/api/admin/settings/route.ts  –  Admin campaign settings
   ───────────────────────────────────────────────────────────── */

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { verifyAdmin } from '@/lib/firebase/server-auth';
import { DEFAULT_SETTINGS } from '@/lib/constants';
import type { SettingsDoc } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const decoded = await verifyAdmin(request);
  if (!decoded) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  try {
    const settingsDoc = await adminDb.collection('settings').doc('main').get();
    const settings: SettingsDoc = settingsDoc.exists
      ? (settingsDoc.data() as SettingsDoc)
      : DEFAULT_SETTINGS;

    return NextResponse.json({ success: true, data: settings });
  } catch (err) {
    console.error('Error fetching settings:', err);
    return NextResponse.json({ success: false, error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const decoded = await verifyAdmin(request);
  if (!decoded) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body: Partial<SettingsDoc> = await request.json();

    // Basic validation
    if (body.rewardSlabs) {
      if (!Array.isArray(body.rewardSlabs) || body.rewardSlabs.length === 0) {
        return NextResponse.json({ success: false, error: 'Reward slabs must be a non-empty list' }, { status: 400 });
      }
      for (const slab of body.rewardSlabs) {
        if (typeof slab.amount !== 'number' || typeof slab.weight !== 'number' || slab.amount <= 0 || slab.weight <= 0) {
          return NextResponse.json({ success: false, error: 'Invalid reward slab entry' }, { status: 400 });
        }
      }
    }

    if (body.dailyBudgetCap !== undefined && (typeof body.dailyBudgetCap !== 'number' || body.dailyBudgetCap < 0)) {
      return NextResponse.json({ success: false, error: 'Invalid daily budget cap' }, { status: 400 });
    }

    if (body.minWithdrawal !== undefined && (typeof body.minWithdrawal !== 'number' || body.minWithdrawal <= 0)) {
      return NextResponse.json({ success: false, error: 'Invalid minimum withdrawal amount' }, { status: 400 });
    }

    await adminDb.collection('settings').doc('main').set(body, { merge: true });

    return NextResponse.json({ success: true, data: body });
  } catch (err) {
    console.error('Error updating settings:', err);
    return NextResponse.json({ success: false, error: 'Failed to update settings' }, { status: 500 });
  }
}
