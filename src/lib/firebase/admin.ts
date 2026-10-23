/* ─────────────────────────────────────────────────────────────
   src/lib/firebase/admin.ts  –  Firebase Admin SDK (server only)
   ───────────────────────────────────────────────────────────── */

import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

let cachedApp: App | null = null;
let cachedAuth: Auth | null = null;
let cachedDb: Firestore | null = null;

export function getAdminApp(): App {
  if (cachedApp) return cachedApp;
  if (getApps().length) {
    cachedApp = getApps()[0];
    return cachedApp;
  }

  // Fallback dummy creds for build-time static evaluation if env vars are empty
  const projectId = process.env.FIREBASE_PROJECT_ID || 'dummy-project';
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || 'dummy@dummy-project.iam.gserviceaccount.com';
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC3\n-----END PRIVATE KEY-----\n').replace(/\\n/g, '\n');

  try {
    cachedApp = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  } catch {
    cachedApp = getApps()[0];
  }

  return cachedApp;
}

export function getAdminAuth(): Auth {
  if (!cachedAuth) {
    cachedAuth = getAuth(getAdminApp());
  }
  return cachedAuth;
}

export function getAdminDb(): Firestore {
  if (!cachedDb) {
    cachedDb = getFirestore(getAdminApp());
  }
  return cachedDb;
}

// Proxies for seamless backwards-compatible usage: adminDb.collection(...), adminAuth.verifyIdToken(...)
export const adminApp = new Proxy({} as App, {
  get: (_, prop) => (getAdminApp() as unknown as Record<string, unknown>)[prop as string],
});

export const adminAuth = new Proxy({} as Auth, {
  get: (_, prop) => (getAdminAuth() as unknown as Record<string, unknown>)[prop as string],
});

export const adminDb = new Proxy({} as Firestore, {
  get: (_, prop) => (getAdminDb() as unknown as Record<string, unknown>)[prop as string],
});
