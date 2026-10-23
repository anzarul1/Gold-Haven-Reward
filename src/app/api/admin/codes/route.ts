/* ─────────────────────────────────────────────────────────────
   src/app/api/admin/codes/route.ts  –  Admin code management
   ───────────────────────────────────────────────────────────── */

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { verifyAdmin } from '@/lib/firebase/server-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const decoded = await verifyAdmin(request);
  if (!decoded) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search')?.toUpperCase().replace(/[\s-]/g, '');
  const batchId = searchParams.get('batchId');
  const status = searchParams.get('status');
  const limit = parseInt(searchParams.get('limit') || '50');

  let query: FirebaseFirestore.Query = adminDb.collection('codes');

  // If searching for a specific code
  if (search && search.length >= 3) {
    const codeDoc = await adminDb.collection('codes').doc(search).get();
    if (codeDoc.exists) {
      return NextResponse.json({
        success: true,
        data: [{
          code: codeDoc.id,
          ...codeDoc.data(),
          usedAt: codeDoc.data()?.usedAt?.toDate?.()?.toISOString() || null,
        }],
      });
    }
    // Search by prefix using range query
    const endStr = search.slice(0, -1) + String.fromCharCode(search.charCodeAt(search.length - 1) + 1);
    query = query
      .where('__name__', '>=', search)
      .where('__name__', '<', endStr);
  }

  if (batchId) {
    query = query.where('batchId', '==', batchId);
  }

  if (status) {
    query = query.where('status', '==', status);
  }

  const snapshot = await query.limit(limit).get();

  const codes = snapshot.docs.map((doc) => ({
    code: doc.id,
    ...doc.data(),
    usedAt: doc.data().usedAt?.toDate?.()?.toISOString() || null,
  }));

  return NextResponse.json({ success: true, data: codes });
}

// ── PUT: Disable a single code ──
export async function PUT(request: NextRequest) {
  const decoded = await verifyAdmin(request);
  if (!decoded) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  let body: { code: string; status: 'disabled' | 'unused' };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
  }

  const codeRef = adminDb.collection('codes').doc(body.code);
  const codeSnap = await codeRef.get();

  if (!codeSnap.exists) {
    return NextResponse.json({ success: false, error: 'Code not found' }, { status: 404 });
  }

  if (codeSnap.data()?.status === 'used' && body.status === 'unused') {
    return NextResponse.json(
      { success: false, error: 'Cannot re-enable a used code' },
      { status: 400 }
    );
  }

  await codeRef.update({ status: body.status });
  return NextResponse.json({ success: true });
}
