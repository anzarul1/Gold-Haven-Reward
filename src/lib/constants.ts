/* ─────────────────────────────────────────────────────────────
   src/lib/constants.ts  –  App-wide constants
   ───────────────────────────────────────────────────────────── */

/** Characters allowed in redeem codes (no 0/O/1/I to avoid confusion) */
export const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Code length before formatting */
export const CODE_LENGTH = 10;

/** Display format: XXXXX-XXXXX */
export const formatCode = (raw: string): string => {
  const clean = raw.replace(/[\s-]/g, '').toUpperCase();
  if (clean.length <= 5) return clean;
  return `${clean.slice(0, 5)}-${clean.slice(5, 10)}`;
};

/** Strip formatting from a code */
export const normalizeCode = (input: string): string =>
  input.replace(/[\s-]/g, '').toUpperCase().slice(0, CODE_LENGTH);

/** Validate code format */
export const isValidCodeFormat = (code: string): boolean => {
  const normalized = normalizeCode(code);
  if (normalized.length !== CODE_LENGTH) return false;
  return [...normalized].every((ch) => CODE_ALPHABET.includes(ch));
};

/** Validate UPI ID format: name@bank */
export const isValidUpiId = (upi: string): boolean =>
  /^[a-zA-Z0-9._-]+@[a-zA-Z]{2,}$/.test(upi);

/** Default settings (matches Firestore settings/main) */
export const DEFAULT_SETTINGS = {
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
};

/** Date helpers */
export const todayKey = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const startOfWeek = (): Date => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay()); // Sunday start
  return d;
};

export const startOfMonth = (): Date => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(1);
  return d;
};

export const startOfDay = (): Date => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};
