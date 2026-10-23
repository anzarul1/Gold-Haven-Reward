/**
 * Script to grant admin privileges to a user by email.
 *
 * Usage:
 *   node scripts/set-admin.js user@example.com
 *
 * Requirements:
 *   Requires valid service account credentials in environment variables
 *   or in a serviceAccountKey.json file in the project root.
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local if present
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
} catch (e) {
  // Ignore
}

let app;

// 1. Try serviceAccountKey.json
const keyFilePath = path.resolve(__dirname, '../serviceAccountKey.json');
if (fs.existsSync(keyFilePath)) {
  const serviceAccount = require(keyFilePath);
  app = initializeApp({
    credential: cert(serviceAccount),
  });
} else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
  // 2. Try env vars
  app = initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
} else {
  console.error('❌ Error: No Firebase Admin credentials found.');
  console.error('Please either:');
  console.error('  1. Place serviceAccountKey.json in the project root, or');
  console.error('  2. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in .env.local');
  process.exit(1);
}

const auth = getAuth(app);
const email = process.argv[2];

if (!email) {
  console.error('❌ Usage: node scripts/set-admin.js <email>');
  process.exit(1);
}

async function setAdminClaim() {
  try {
    console.log(`🔍 Looking up user with email: ${email}...`);
    const user = await auth.getUserByEmail(email);

    console.log(`👤 Found user: ${user.displayName || 'No Name'} (${user.uid})`);
    console.log(`Setting custom claim { admin: true }...`);

    await auth.setCustomUserClaims(user.uid, {
      ...user.customClaims,
      admin: true,
    });

    console.log('✅ Success! User has been granted admin privileges.');
    console.log('⚠️  Note: The user must sign out and sign back in for the new claim token to take effect.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to set admin claim:', err.message);
    process.exit(1);
  }
}

setAdminClaim();
