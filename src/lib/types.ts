/* ─────────────────────────────────────────────────────────────
   src/lib/types.ts  –  Shared TypeScript types for Gold Haven
   ───────────────────────────────────────────────────────────── */

// ── Firestore: users/{uid} ──
export interface UserDoc {
  email: string;
  name: string;
  photoURL?: string;
  upiId?: string;
  mobile?: string;
  isBlocked: boolean;
  walletBalance: number;
  totalEarned: number;
  totalRedemptions: number;
  createdAt: FirebaseTimestamp;
  lastActive: FirebaseTimestamp;
}

// ── Firestore: batches/{batchId} ──
export interface BatchDoc {
  name: string;
  batchNumber?: string;
  quantity: number;
  status: 'active' | 'disabled';
  createdAt: FirebaseTimestamp;
  redeemedCount: number;
}

// ── Firestore: codes/{code} ──
export interface CodeDoc {
  batchId: string;
  status: 'unused' | 'used' | 'disabled';
  usedBy?: string;
  usedAt?: FirebaseTimestamp;
  rewardAmount?: number;
}

// ── Firestore: redemptions/{id} ──
export interface RedemptionDoc {
  uid: string;
  code: string;
  amount: number;
  ip: string;
  userAgent: string;
  createdAt: FirebaseTimestamp;
}

// ── Firestore: walletLedger/{id} ──
export interface WalletLedgerDoc {
  uid: string;
  type: 'credit' | 'debit';
  amount: number;
  reason: string;
  refId?: string;
  createdAt: FirebaseTimestamp;
}

// ── Firestore: withdrawals/{id} ──
export interface WithdrawalDoc {
  uid: string;
  upiId: string;
  amount: number;
  status: 'pending' | 'paid' | 'rejected';
  txnRef?: string;
  createdAt: FirebaseTimestamp;
  processedAt?: FirebaseTimestamp;
}

// ── Firestore: settings/main ──
export interface RewardSlab {
  amount: number;
  weight: number;
}

export interface SettingsDoc {
  rewardSlabs: RewardSlab[];
  dailyBudgetCap: number;
  maxRedeemsPerDay: number;
  maxRedeemsPerWeek: number;
  maxWrongAttempts: number;
  lockMinutes: number;
  minWithdrawal: number;
  campaignActive: boolean;
}

// ── Firestore: dailyStats/{yyyy-mm-dd} ──
export interface DailyStatsDoc {
  totalCashbackGiven: number;
  redemptionCount: number;
}

// ── Firestore: redeemAttempts/{uid} ──
export interface RedeemAttemptsDoc {
  wrongCount: number;
  lockedUntil?: FirebaseTimestamp;
}

// ── Firebase Timestamp helper type ──
export type FirebaseTimestamp = {
  seconds: number;
  nanoseconds: number;
} | Date | unknown;

// ── API response shapes ──
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export interface RedeemResult {
  amount: number;
  newBalance: number;
}

export interface WalletData {
  balance: number;
  totalEarned: number;
  redemptions: (RedemptionDoc & { id: string })[];
  withdrawals: (WithdrawalDoc & { id: string })[];
}

// ── Admin dashboard ──
export interface DashboardStats {
  totalCodes: number;
  redeemedCodes: number;
  unusedCodes: number;
  cashbackToday: number;
  cashbackThisMonth: number;
  activeUsers: number;
  pendingWithdrawals: number;
  dailyChart: { date: string; count: number; amount: number }[];
}

export interface AdminBatch extends BatchDoc {
  id: string;
  redemptionRate: number;
}

export interface AdminCode extends CodeDoc {
  code: string;
  batchName?: string;
}

export interface AdminUser extends UserDoc {
  uid: string;
}

export interface AdminWithdrawal extends WithdrawalDoc {
  id: string;
  userName?: string;
  userEmail?: string;
}
