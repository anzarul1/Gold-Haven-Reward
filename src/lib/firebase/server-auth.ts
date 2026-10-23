/* ─────────────────────────────────────────────────────────────
   src/lib/firebase/server-auth.ts  –  Server-side token verification
   ───────────────────────────────────────────────────────────── */

import { adminAuth } from './admin';
import { NextRequest } from 'next/server';
import type { DecodedIdToken } from 'firebase-admin/auth';

/**
 * Extracts and verifies the Firebase ID token from the Authorization header.
 * Returns the decoded token or null if invalid.
 */
export async function verifyAuth(
  request: NextRequest
): Promise<DecodedIdToken | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.split('Bearer ')[1];
  if (!token) return null;

  try {
    return await adminAuth.verifyIdToken(token);
  } catch {
    return null;
  }
}

/**
 * Verify token and check admin claim.
 * Returns decoded token if admin, null otherwise.
 */
export async function verifyAdmin(
  request: NextRequest
): Promise<DecodedIdToken | null> {
  const decoded = await verifyAuth(request);
  if (!decoded) return null;
  if (decoded.admin !== true) return null;
  return decoded;
}

/**
 * Extract client IP from request headers.
 */
export function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}
