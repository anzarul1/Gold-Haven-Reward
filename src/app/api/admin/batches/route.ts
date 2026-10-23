/* ─────────────────────────────────────────────────────────────
   src/app/api/admin/batches/route.ts  –  Admin batch management
   ───────────────────────────────────────────────────────────── */

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { verifyAdmin } from '@/lib/firebase/server-auth';
import { FieldValue } from 'firebase-admin/firestore';
import { CODE_ALPHABET, CODE_LENGTH } from '@/lib/constants';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

/** Generate a single cryptographically secure random code */
function generateCode(): string {
  const bytes = crypto.randomBytes(CODE_LENGTH);
  return Array.from(bytes)
    .map((b) => CODE_ALPHABET[b % CODE_ALPHABET.length])
    .join('');
}

// ── GET: List all batches ──
export async function GET(request: NextRequest) {
  const decoded = await verifyAdmin(request);
  if (!decoded) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const snapshot = await adminDb
    .collection('batches')
    .orderBy('createdAt', 'desc')
    .get();

  const batches = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
      redemptionRate: data.quantity > 0
        ? Math.round(((data.redeemedCount || 0) / data.quantity) * 100)
        : 0,
    };
  });

  return NextResponse.json({ success: true, data: batches });
}

// ── POST: Create a new batch with codes ──
export async function POST(request: NextRequest) {
  const decoded = await verifyAdmin(request);
  if (!decoded) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  let body: { name: string; quantity: number; batchNumber?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
  }

  const { name, quantity, batchNumber } = body;

  if (!name || !quantity || quantity < 1 || quantity > 50000) {
    return NextResponse.json(
      { success: false, error: 'Name is required. Quantity must be 1-50000.' },
      { status: 400 }
    );
  }

  try {
    // Create batch document
    const batchRef = adminDb.collection('batches').doc();
    await batchRef.set({
      name,
      batchNumber: batchNumber || '',
      quantity,
      status: 'active',
      createdAt: FieldValue.serverTimestamp(),
      redeemedCount: 0,
    });

    // Generate unique codes with collision checking
    const existingCodes = new Set<string>();
    const codes: string[] = [];

    // Generate codes (slightly over to account for collisions)
    while (codes.length < quantity) {
      const code = generateCode();
      if (!existingCodes.has(code)) {
        existingCodes.add(code);
        codes.push(code);
      }
    }

    // Check for collisions with existing codes in Firestore (batches of 10)
    const uniqueCodes: string[] = [];
    for (let i = 0; i < codes.length; i += 10) {
      const batch = codes.slice(i, i + 10);
      const checks = await Promise.all(
        batch.map((code) => adminDb.collection('codes').doc(code).get())
      );
      for (let j = 0; j < checks.length; j++) {
        if (!checks[j].exists) {
          uniqueCodes.push(batch[j]);
        } else {
          // Generate replacement
          let newCode = generateCode();
          while (existingCodes.has(newCode)) {
            newCode = generateCode();
          }
          existingCodes.add(newCode);
          uniqueCodes.push(newCode);
        }
      }
    }

    // Write codes in batched writes of 500
    const BATCH_SIZE = 500;
    for (let i = 0; i < uniqueCodes.length; i += BATCH_SIZE) {
      const writeBatch = adminDb.batch();
      const slice = uniqueCodes.slice(i, i + BATCH_SIZE);
      for (const code of slice) {
        const codeRef = adminDb.collection('codes').doc(code);
        writeBatch.set(codeRef, {
          batchId: batchRef.id,
          status: 'unused',
        });
      }
      await writeBatch.commit();
    }

    return NextResponse.json({
      success: true,
      data: {
        batchId: batchRef.id,
        codesGenerated: uniqueCodes.length,
        codes: uniqueCodes, // Returned for CSV download
      },
    });
  } catch (err) {
    console.error('Batch creation error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to create batch' },
      { status: 500 }
    );
  }
}

// ── PUT: Disable/enable a batch ──
export async function PUT(request: NextRequest) {
  const decoded = await verifyAdmin(request);
  if (!decoded) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  let body: { batchId: string; status: 'active' | 'disabled' };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
  }

  await adminDb.collection('batches').doc(body.batchId).update({
    status: body.status,
  });

  return NextResponse.json({ success: true });
}
