/**
 * Optional Development Helper: Seed Sample Codes & Settings
 *
 * Usage:
 *   node scripts/seed-data.js
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Load environment variables from .env.local
try {
  const envPath = path.resolve(__dirname, '../.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach((line) => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
        process.env[key] = value.replace(/\\n/g, '\n');
      }
    });
  }
} catch (e) {}

let app;
const keyFilePath = path.resolve(__dirname, '../serviceAccountKey.json');
if (fs.existsSync(keyFilePath)) {
  app = initializeApp({ credential: cert(require(keyFilePath)) });
} else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
  app = initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
} else {
  console.error('❌ No Firebase Admin credentials found in .env.local or serviceAccountKey.json');
  process.exit(1);
}

const db = getFirestore(app);
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateCode() {
  const bytes = crypto.randomBytes(10);
  return Array.from(bytes)
    .map((b) => CODE_ALPHABET[b % CODE_ALPHABET.length])
    .join('');
}

function formatCode(raw) {
  return `${raw.slice(0, 5)}-${raw.slice(5, 10)}`;
}

async function seed() {
  console.log('🌱 Seeding initial settings and demo batch...');

  // 1. Seed settings/main
  const settingsRef = db.collection('settings').doc('main');
  await settingsRef.set(
    {
      rewardSlabs: [
        { amount: 1, weight: 60 },
        { amount: 2, weight: 20 },
        { amount: 3, weight: 12 },
        { amount: 4, weight: 5 },
        { amount: 5, weight: 3 },
      ],
      dailyBudgetCap: 2000,
      maxRedeemsPerDay: 2,
      maxRedeemsPerWeek: 10,
      maxWrongAttempts: 5,
      lockMinutes: 60,
      minWithdrawal: 20,
      campaignActive: true,
    },
    { merge: true }
  );
  console.log('✅ Default settings configured.');

  // 2. Create demo batch
  const batchRef = db.collection('batches').doc();
  const quantity = 25;
  await batchRef.set({
    name: 'Launch Demo Batch (25 Codes)',
    batchNumber: 'GH-DEMO-01',
    quantity,
    status: 'active',
    createdAt: FieldValue.serverTimestamp(),
    redeemedCount: 0,
  });

  const batch = db.batch();
  const printedCodes = [];

  for (let i = 0; i < quantity; i++) {
    const raw = generateCode();
    printedCodes.push(raw);
    const codeRef = db.collection('codes').doc(raw);
    batch.set(codeRef, {
      batchId: batchRef.id,
      status: 'unused',
    });
  }

  await batch.commit();

  console.log(`✅ Demo batch created (${quantity} codes).`);
  console.log('\n🎟️  Here are 5 test codes to try on /redeem:');
  printedCodes.slice(0, 5).forEach((code, idx) => {
    console.log(`   ${idx + 1}. Formatted: ${formatCode(code)}  |  URL: /redeem?c=${formatCode(code)}`);
  });

  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
