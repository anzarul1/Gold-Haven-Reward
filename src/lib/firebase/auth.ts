/* ─────────────────────────────────────────────────────────────
   src/lib/firebase/auth.ts  –  Client-side auth helpers
   
   Structured so Firebase Phone Auth can be added later 
   without a rewrite. All auth methods funnel through
   signInWith* helpers and the AuthProvider context.
   ───────────────────────────────────────────────────────────── */
'use client';

import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
  type Auth,
  // Phone auth imports – ready for future use:
  // PhoneAuthProvider,
  // RecaptchaVerifier,
  // signInWithPhoneNumber,
} from 'firebase/auth';
import { auth } from './config';

// ── Google Sign-In ──
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export async function signInWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

// ── Sign out ──
export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

// ── Auth state listener ──
export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

// ── Get current user ──
export function getCurrentUser(): User | null {
  return auth.currentUser;
}

// ── Get ID token for API calls ──
export async function getIdToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
}

// ── Check if user has admin claim ──
export async function isAdmin(): Promise<boolean> {
  const user = auth.currentUser;
  if (!user) return false;
  const result = await user.getIdTokenResult();
  return result.claims.admin === true;
}

/*
 ── Phone Auth (future) ──
 
 When ready to add phone auth:
 1. Enable Phone provider in Firebase Console
 2. Uncomment the imports above
 3. Implement:
 
 export function initRecaptcha(containerId: string): RecaptchaVerifier {
   return new RecaptchaVerifier(auth, containerId, {
     size: 'invisible',
     callback: () => {},
   });
 }
 
 export async function sendOtp(
   phoneNumber: string,
   recaptchaVerifier: RecaptchaVerifier
 ) {
   return signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
 }
 
 4. The AuthProvider already handles any auth state change,
    so phone-authenticated users will work seamlessly.
*/

export { auth, type User, type Auth };
