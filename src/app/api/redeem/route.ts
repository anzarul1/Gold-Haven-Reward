/* ─────────────────────────────────────────────────────────────
   src/app/api/redeem/route.ts  –  Redeem code endpoint
   
   ALL sensitive logic runs server-side inside ONE Firestore
   transaction to ensure atomicity. A code can never be
   redeemed twice even with concurrent requests.
   ───────────────────────────────────────────────────────────── */

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { verifyAuth, getClientIp } from '@/lib/firebase/server-auth';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { normalizeCode, isValidCodeFormat, todayKey, startOfWeek, DEFAULT_SETTINGS } from '@/lib/constants';
import type { SettingsDoc, RewardSlab } from '@/lib/types';

export const dynamic = 'force-dynamic';

// ── Rate-limit maps (in-memory, per server instance) ──
const userAttempts = new Map<string, { count: number; resetAt: number }>();
const ipAttempts = new Map<string, { count: number; resetAt: number }>();
const RATE_WINDOW_MS = 60_000; // 1 minute
const MAX_PER_USER_PER_MIN = 10;
const MAX_PER_IP_PER_MIN = 30;

function checkRateLimit(key: string, map: Map<string, { count: number; resetAt: number }>, max: number): boolean {
  const now = Date.now();
  const entry = map.get(key);
  if (!entry || now > entry.resetAt) {
    map.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  entry.count++;
  if (entry.count > max) return false;
  return true;
}

/** Pick a random reward using weighted probability */
function pickReward(slabs: RewardSlab[]): number {
  const totalWeight = slabs.reduce((sum, s) => sum + s.weight, 0);
  // Use crypto for unbiased randomness
  const randomBytes = new Uint32Array(1);
  crypto.getRandomValues(randomBytes);
  let random = (randomBytes[0] / 0xFFFFFFFF) * totalWeight;

  for (const slab of slabs) {
    random -= slab.weight;
    if (random <= 0) return slab.amount;
  }
  return slabs[slabs.length - 1].amount;
}

export async function POST(request: NextRequest) {
  // 1. Verify authentication
  const decoded = await verifyAuth(request);
  if (!decoded) {
    return NextResponse.json(
      { success: false, error: 'Please sign in to continue.', code: 'UNAUTHENTICATED' },
      { status: 401 }
    );
  }

  const uid = decoded.uid;
  const ip = getClientIp(request);
  const userAgent = request.headers.get('user-agent') || '';

  // 2. Rate limiting
  if (!checkRateLimit(uid, userAttempts, MAX_PER_USER_PER_MIN)) {
    return NextResponse.json(
      { success: false, error: 'Too many attempts. Please wait a minute.', code: 'RATE_LIMITED' },
      { status: 429 }
    );
  }
  if (!checkRateLimit(ip, ipAttempts, MAX_PER_IP_PER_MIN)) {
    return NextResponse.json(
      { success: false, error: 'Too many attempts from this device. Please wait.', code: 'RATE_LIMITED' },
      { status: 429 }
    );
  }

  // 3. Parse and validate code format
  let body: { code?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid request.', code: 'BAD_REQUEST' },
      { status: 400 }
    );
  }

  const rawCode = body.code;
  if (!rawCode || typeof rawCode !== 'string') {
    return NextResponse.json(
      { success: false, error: 'Please enter a code.', code: 'MISSING_CODE' },
      { status: 400 }
    );
  }

  const code = normalizeCode(rawCode);
  if (!isValidCodeFormat(code)) {
    return NextResponse.json(
      { success: false, error: 'Invalid code format. Codes are 10 characters (letters and numbers).', code: 'INVALID_FORMAT' },
      { status: 400 }
    );
  }

  // 4. Run everything in a single Firestore transaction
  try {
    const result = await adminDb.runTransaction(async (txn) => {
      const today = todayKey();
      const weekStart = startOfWeek();

      // ── Refs ──
      const settingsRef = adminDb.collection('settings').doc('main');
      const userRef = adminDb.collection('users').doc(uid);
      const codeRef = adminDb.collection('codes').doc(code);
      const attemptsRef = adminDb.collection('redeemAttempts').doc(uid);
      const dailyStatsRef = adminDb.collection('dailyStats').doc(today);

      // ── Reads (all inside transaction) ──
      const [settingsSnap, userSnap, codeSnap, attemptsSnap, dailyStatsSnap] = await Promise.all([
        txn.get(settingsRef),
        txn.get(userRef),
        txn.get(codeRef),
        txn.get(attemptsRef),
        txn.get(dailyStatsRef),
      ]);

      // ── Settings (use defaults if not configured) ──
      const settings: SettingsDoc = settingsSnap.exists
        ? (settingsSnap.data() as SettingsDoc)
        : DEFAULT_SETTINGS;

      // ── Check campaign active ──
      if (!settings.campaignActive) {
        return { error: 'The rewards campaign is currently paused. Check back soon!', code: 'CAMPAIGN_INACTIVE' };
      }

      // ── Check user exists and not blocked ──
      if (!userSnap.exists) {
        return { error: 'Account not found. Please sign in again.', code: 'USER_NOT_FOUND' };
      }
      const userData = userSnap.data()!;
      if (userData.isBlocked) {
        return { error: 'Your account has been temporarily suspended. Please contact support.', code: 'ACCOUNT_BLOCKED' };
      }

      // ── Check lock (wrong attempts) ──
      if (attemptsSnap.exists) {
        const attempts = attemptsSnap.data()!;
        if (attempts.lockedUntil && attempts.lockedUntil.toDate() > new Date()) {
          const minsLeft = Math.ceil(
            (attempts.lockedUntil.toDate().getTime() - Date.now()) / 60000
          );
          return {
            error: `Too many wrong attempts. Try again in ${minsLeft} minute${minsLeft > 1 ? 's' : ''}.`,
            code: 'LOCKED',
          };
        }
      }

      // ── Check code exists ──
      if (!codeSnap.exists) {
        // Increment wrong attempts
        const currentWrong = attemptsSnap.exists ? (attemptsSnap.data()!.wrongCount || 0) : 0;
        const newWrong = currentWrong + 1;

        if (newWrong >= settings.maxWrongAttempts) {
          txn.set(attemptsRef, {
            wrongCount: newWrong,
            lockedUntil: Timestamp.fromDate(
              new Date(Date.now() + settings.lockMinutes * 60 * 1000)
            ),
          });
          return {
            error: `Too many wrong attempts. You've been locked out for ${settings.lockMinutes} minutes.`,
            code: 'LOCKED',
          };
        }

        txn.set(
          attemptsRef,
          { wrongCount: newWrong },
          { merge: true }
        );

        return {
          error: `Invalid code. Please check and try again. (${settings.maxWrongAttempts - newWrong} attempts remaining)`,
          code: 'INVALID_CODE',
        };
      }

      // ── Check code status ──
      const codeData = codeSnap.data()!;
      if (codeData.status === 'used') {
        return { error: 'This code has already been redeemed.', code: 'CODE_USED' };
      }
      if (codeData.status === 'disabled') {
        return { error: 'This code is no longer valid.', code: 'CODE_DISABLED' };
      }

      // ── Check batch status ──
      if (codeData.batchId) {
        const batchRef = adminDb.collection('batches').doc(codeData.batchId);
        const batchSnap = await txn.get(batchRef);
        if (batchSnap.exists && batchSnap.data()?.status === 'disabled') {
          return { error: 'This code is no longer valid.', code: 'BATCH_DISABLED' };
        }
      }

      // ── Check daily budget ──
      const dailyStats = dailyStatsSnap.exists
        ? dailyStatsSnap.data()!
        : { totalCashbackGiven: 0, redemptionCount: 0 };

      // ── Per-user daily limit ──
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayRedemptions = await adminDb
        .collection('redemptions')
        .where('uid', '==', uid)
        .where('createdAt', '>=', Timestamp.fromDate(todayStart))
        .count()
        .get();

      if (todayRedemptions.data().count >= settings.maxRedeemsPerDay) {
        return {
          error: `You've reached your daily limit of ${settings.maxRedeemsPerDay} redemptions. Come back tomorrow!`,
          code: 'DAILY_LIMIT',
        };
      }

      // ── Per-user weekly limit ──
      const weeklyRedemptions = await adminDb
        .collection('redemptions')
        .where('uid', '==', uid)
        .where('createdAt', '>=', Timestamp.fromDate(weekStart))
        .count()
        .get();

      if (weeklyRedemptions.data().count >= settings.maxRedeemsPerWeek) {
        return {
          error: `You've reached your weekly limit of ${settings.maxRedeemsPerWeek} redemptions. Try again next week!`,
          code: 'WEEKLY_LIMIT',
        };
      }

      // ── Pick reward ──
      const rewardAmount = pickReward(settings.rewardSlabs);

      // ── Check daily budget after picking reward ──
      if (dailyStats.totalCashbackGiven + rewardAmount > settings.dailyBudgetCap) {
        return {
          error: 'Rewards are over for today! 🎉 Try again tomorrow for a chance to win.',
          code: 'BUDGET_EXCEEDED',
        };
      }

      // ── ALL CHECKS PASSED – Execute writes atomically ──
      const now = FieldValue.serverTimestamp();
      const redemptionRef = adminDb.collection('redemptions').doc();
      const ledgerRef = adminDb.collection('walletLedger').doc();

      // Mark code as used
      txn.update(codeRef, {
        status: 'used',
        usedBy: uid,
        usedAt: now,
        rewardAmount,
      });

      // Create redemption record
      txn.set(redemptionRef, {
        uid,
        code,
        amount: rewardAmount,
        ip,
        userAgent,
        createdAt: now,
      });

      // Create wallet ledger credit
      txn.set(ledgerRef, {
        uid,
        type: 'credit',
        amount: rewardAmount,
        reason: 'Code redemption',
        refId: redemptionRef.id,
        createdAt: now,
      });

      // Update user wallet balance
      txn.update(userRef, {
        walletBalance: FieldValue.increment(rewardAmount),
        totalEarned: FieldValue.increment(rewardAmount),
        totalRedemptions: FieldValue.increment(1),
        lastActive: now,
      });

      // Update daily stats
      txn.set(
        dailyStatsRef,
        {
          totalCashbackGiven: FieldValue.increment(rewardAmount),
          redemptionCount: FieldValue.increment(1),
        },
        { merge: true }
      );

      // Update batch redeemed count
      if (codeData.batchId) {
        const batchRef = adminDb.collection('batches').doc(codeData.batchId);
        txn.update(batchRef, {
          redeemedCount: FieldValue.increment(1),
        });
      }

      // Reset wrong attempts
      txn.set(attemptsRef, { wrongCount: 0, lockedUntil: null });

      return {
        success: true,
        amount: rewardAmount,
        newBalance: (userData.walletBalance || 0) + rewardAmount,
      };
    });

    // Return result from transaction
    if ('error' in result && result.error) {
      const statusMap: Record<string, number> = {
        CAMPAIGN_INACTIVE: 503,
        ACCOUNT_BLOCKED: 403,
        LOCKED: 429,
        INVALID_CODE: 400,
        CODE_USED: 400,
        CODE_DISABLED: 400,
        BATCH_DISABLED: 400,
        DAILY_LIMIT: 429,
        WEEKLY_LIMIT: 429,
        BUDGET_EXCEEDED: 503,
        USER_NOT_FOUND: 404,
      };
      return NextResponse.json(
        { success: false, error: result.error, code: result.code },
        { status: statusMap[result.code as string] || 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { amount: result.amount, newBalance: result.newBalance },
    });
  } catch (err) {
    console.error('Redeem transaction error:', err);
    return NextResponse.json(
      { success: false, error: 'Something went wrong. Please try again.', code: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}
