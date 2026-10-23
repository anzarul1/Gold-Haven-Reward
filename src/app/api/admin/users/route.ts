/* ─────────────────────────────────────────────────────────────
   src/app/api/admin/users/route.ts  –  Admin user management
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
  const search = searchParams.get('search');
  const limit = parseInt(searchParams.get('limit') || '50');

  let query: FirebaseFirestore.Query = adminDb.collection('users');

  if (search) {
    // Search by email (prefix match)
    query = query
      .where('email', '>=', search.toLowerCase())
      .where('email', '<=', search.toLowerCase() + '\uf8ff');
  }

  query = query.orderBy('lastActive', 'desc').limit(limit);

  const snapshot = await query.get();
  const users = snapshot.docs.map((doc) => ({
    uid: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
    lastActive: doc.data().lastActive?.toDate?.()?.toISOString() || null,
  }));

  return NextResponse.json({ success: true, data: users });
}

export async function PUT(request: NextRequest) {
  const decoded = await verifyAdmin(request);
  if (!decoded) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  let body: { uid: string; isBlocked: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
  }

  await adminDb.collection('users').doc(body.uid).update({
    isBlocked: body.isBlocked,
  });

  return NextResponse.json({ success: true });
}
