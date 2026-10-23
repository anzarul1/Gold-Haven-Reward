# 🌟 Gold Haven Rewards

> Mobile-first Neumorphic (Soft UI) Cashback Web Application & PWA for **Gold Haven Premium Mixed Nuts & Dry Fruits** (100g Jar, MRP ₹99).

Every jar has a printed QR code directing customers to `/redeem`. Under the jar lid is a unique 10-character code (`XXXXX-XXXXX`). When scanned, customers log in with Google, enter the code, and win instant random cashback of **₹1 to ₹5** credited directly to their in-app wallet, which they can withdraw via UPI (Google Pay, PhonePe, Paytm, BHIM, etc.).

---

## 💎 Design System: Dark Neumorphism (Soft UI)

- **Theme Palette**:
  - Base Background & Surfaces: `#1c1c1f`
  - Metallic Gold Accent: `#D4AF37`
  - High-Contrast Text: `#EDEDED` (WCAG AA compliant)
  - Secondary Text: `#A0A0A5`
- **Dual Soft Shadows**:
  - `neu-raised`: Top-left light shadow (`rgba(255,255,255,0.05)`), bottom-right dark shadow (`rgba(0,0,0,0.5)`)
  - `neu-inset`: Inset dual shadows for input fields, active indicators, and pressed states
  - `neu-gold-button`: Metallic gold button with tactile press micro-animations
- **Micro-Animations**:
  - Interactive scratch-to-reveal canvas card with fallback for `prefers-reduced-motion`
  - Gold confetti particle celebration
  - Active tab indicators and tactile button feedback
  - Mobile bottom navigation bar with safe-area padding for modern notch devices

---

## 🛠️ Technology Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router) + TypeScript
- **Styling**: Tailwind CSS + Custom Neumorphic CSS Utilities (`globals.css`)
- **Authentication**: Firebase Authentication (Google Provider) — architected so Firebase Phone Auth (OTP) is a drop-in without code rewrites.
- **Database**: Cloud Firestore (NoSQL, transactional anti-fraud engine)
- **Backend & Security**: Next.js Server Routes backed by **Firebase Admin SDK** (all redemptions, ledger transactions, and payouts are server-only)
- **PWA Ready**: Web App Manifest (`manifest.json`), service worker (`sw.js`), and icons ready for Capacitor Android wrapper.

---

## 📁 Project Architecture

```
gold-haven-rewards/
├── firestore.rules               # Zero client-side writes, user data isolation
├── firestore.indexes.json        # High-performance composite query indexes
├── .env.example                  # Environment configuration template
├── scripts/
│   └── set-admin.js              # CLI script to grant admin claim by email
├── public/
│   ├── logo.png                  # Gold Haven circular royal seal
│   ├── manifest.json             # PWA Web App Manifest
│   ├── sw.js                     # Service worker offline caching
│   └── icons/                    # App icons (192x192, 512x512)
└── src/
    ├── app/
    │   ├── globals.css           # Neumorphic tokens, shadows & utilities
    │   ├── layout.tsx            # Viewport, fonts, AuthProvider & ToastProvider
    │   ├── page.tsx              # Root redirect to /redeem
    │   ├── redeem/page.tsx       # QR landing, code entry, scratch card, confetti
    │   ├── wallet/page.tsx       # Balance card, ledger history, withdrawal modal
    │   ├── profile/page.tsx      # Customer account, UPI configuration, admin link
    │   ├── admin/
    │   │   ├── layout.tsx        # Admin claim verification & ops navigation
    │   │   ├── page.tsx          # Real-time dashboard KPI & 30-day chart
    │   │   ├── batches/page.tsx  # Batch code generator & printer CSV export
    │   │   ├── codes/page.tsx    # Code registry search & killswitch
    │   │   ├── redemptions/page.tsx # Audit log with IP/User-Agent & CSV export
    │   │   ├── users/page.tsx    # Customer directory & block/unblock
    │   │   ├── withdrawals/page.tsx # UPI payouts, approval & ledger refunds
    │   │   └── settings/page.tsx # Probability slabs, daily budgets & locks
    │   └── api/
    │       ├── auth/sync/route.ts
    │       ├── redeem/route.ts   # Core atomic transaction redemption engine
    │       ├── wallet/route.ts
    │       ├── withdraw/route.ts # Transactional ledger withdrawal
    │       ├── profile/route.ts
    │       └── admin/
    │           ├── dashboard/route.ts
    │           ├── batches/route.ts
    │           ├── codes/route.ts
    │           ├── redemptions/route.ts
    │           ├── users/route.ts
    │           ├── withdrawals/route.ts
    │           └── settings/route.ts
    ├── components/
    │   ├── auth/AuthProvider.tsx # Authentication context & ID token sync
    │   └── ui/
    │       ├── BottomNav.tsx     # Mobile bottom navigation bar
    │       ├── BottomNavWrapper.tsx # Route-aware nav visibility
    │       ├── ScratchCard.tsx   # Canvas scratch-to-reveal card
    │       ├── Confetti.tsx      # Gold confetti particle shower
    │       ├── Toast.tsx         # Toast notification system
    │       └── Spinner.tsx       # Neumorphic gold spinner
    └── lib/
        ├── types.ts              # Full Firestore schema & API contracts
        ├── constants.ts          # Code alphabet, formatting & regex validators
        ├── api-client.ts         # Authenticated fetch wrapper
        └── firebase/
            ├── config.ts         # Client SDK singleton
            ├── auth.ts           # Google Auth & Phone Auth scaffold
            ├── admin.ts          # Server-only Admin SDK singleton
            └── server-auth.ts    # ID token & admin claim verification
```

---

## 🔒 Security & Anti-Fraud Architecture

1. **Atomic Firestore Transactions**:
   All redemption checks (campaign active, user not blocked, user not locked, code exists and unused, per-user daily/weekly limits, daily budget cap) and writes (mark code used, create redemption record, create wallet ledger credit, increment user balance, increment daily stats) run within **ONE atomic Firestore transaction**. Concurrent requests for the same code will fail safely.
2. **Cryptographic Random Codes**:
   Codes are generated using Node.js `crypto.randomBytes` using the 30-character alphabet:
   `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (excludes confusing characters `0`, `O`, `1`, `I`).
3. **Lockout & Rate Limiting**:
   - 5 consecutive wrong attempts lock the user out for 60 minutes (configurable in settings).
   - Rate limiting on API endpoints per UID and per IP address.
   - Device fingerprints (IP address + User-Agent) logged with every redemption.
4. **Zero Client-Side Firestore Writes**:
   All client writes to `codes`, `users`, `walletLedger`, `redemptions`, `withdrawals`, and `settings` are completely blocked via `firestore.rules`.
5. **Double-Entry Wallet Ledger**:
   Wallet balance is always backed by an immutable ledger. Rejected withdrawals automatically generate a refund ledger credit.

---

## 🚀 Step-by-Step Setup Guide

### 1. Create Firebase Project
1. Go to the [Firebase Console](https://console.firebase.google.com/) and click **Add Project**.
2. Name it `gold-haven-rewards` (or your preferred name).
3. Disable Google Analytics (or keep default) and click **Create Project**.

### 2. Enable Google Sign-In
1. Navigate to **Build > Authentication > Get Started**.
2. Under the **Sign-in method** tab, click **Google**.
3. Toggle **Enable**, choose your support email, and click **Save**.
4. In **Authentication > Settings > Authorized domains**, make sure `localhost` is listed. When deploying to Vercel, add your production domain (e.g. `gold-haven-rewards.vercel.app`).

### 3. Create Cloud Firestore Database
1. Navigate to **Build > Firestore Database > Create Database**.
2. Select a location close to your Indian users (e.g., `asia-south1` - Mumbai).
3. Start in **Production mode** and click **Create**.

### 4. Deploy Firestore Security Rules & Indexes
Install Firebase CLI if you haven't already:
```bash
npm install -g firebase-tools
firebase login
firebase use --add <your-firebase-project-id>
firebase deploy --only firestore:rules,firestore:indexes
```

### 5. Generate Firebase Admin Service Account Key
1. Go to **Project Settings** (gear icon) > **Service accounts**.
2. Click **Generate new private key**, then **Generate key**.
3. A JSON file will download. Open it to find:
   - `project_id`
   - `client_email`
   - `private_key`

### 6. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Fill in the keys:
```env
# Firebase Client SDK (from Project Settings > General > Your apps > Web app)
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef

# Firebase Admin SDK (from your downloaded Service Account JSON)
FIREBASE_PROJECT_ID=your-project
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 7. Grant First Admin Privilege
1. Open the app in your browser at `http://localhost:3000/redeem` and sign in with your Google account.
2. In your terminal, run the admin assignment script with your Google account email:
```bash
node scripts/set-admin.js your-email@gmail.com
```
3. Sign out in the app and sign back in.
4. Visit `http://localhost:3000/admin` to access the full Operations Console!

### 8. Run the Application Locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) on your mobile browser or desktop device.

---

## 📱 Packaging as an Android App with Capacitor (PWA to APK)

This app is fully PWA-ready with standalone display mode, dark status bar, and service worker. To package it as a native Android app:

```bash
# 1. Install Capacitor dependencies
npm install @capacitor/core @capacitor/cli @capacitor/android

# 2. Initialize Capacitor
npx cap init "Gold Haven Rewards" com.goldhaven.rewards --web-dir=out

# 3. Build Next.js static output (or point capacitor.config.json to your live Vercel URL)
npm run build

# 4. Add Android platform
npx cap add android

# 5. Open in Android Studio
npx cap open android
```

---

## 💰 Default Reward Probabilities & Economy

| Prize Amount | Probability | Odds per 100 Jars |
| :--- | :--- | :--- |
| **₹1 Cashback** | 60% | 60 Jars |
| **₹2 Cashback** | 20% | 20 Jars |
| **₹3 Cashback** | 12% | 12 Jars |
| **₹4 Cashback** | 5% | 5 Jars |
| **₹5 Cashback** | 3% | 3 Jars |

*Note: You can tune these weights live in `/admin/settings` at any time without redeploying code.*

---

## 📄 License
Proprietary & Confidential • Gold Haven Premium Foods.
