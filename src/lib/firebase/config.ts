/* ─────────────────────────────────────────────────────────────
   src/lib/firebase/config.ts  –  Firebase client-side config
   ───────────────────────────────────────────────────────────── */
'use client';

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyBa7i8NccOZlTIrgV9QE8QEmqPn2K43ZXE',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'gold-haven-reward.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'gold-haven-reward',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'gold-haven-reward.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '210204799505',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:210204799505:web:8b7f3e425256ccabd537b0',
};

// Singleton pattern – prevents re-init in React Strict Mode / HMR
const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth: Auth = getAuth(app);
export default app;
