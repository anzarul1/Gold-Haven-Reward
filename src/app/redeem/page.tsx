'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/components/ui/Toast';
import ScratchCard from '@/components/ui/ScratchCard';
import Confetti from '@/components/ui/Confetti';
import Spinner from '@/components/ui/Spinner';
import { formatCode, normalizeCode } from '@/lib/constants';
import { api } from '@/lib/api-client';
import type { RedeemResult } from '@/lib/types';
import { Sparkles, Wallet, Gift, ShieldAlert, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';

function RedeemContent() {
  const searchParams = useSearchParams();
  const { user, loading: authLoading, loginWithGoogle } = useAuth();
  const { showToast } = useToast();

  const [rawCode, setRawCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<RedeemResult | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);

  // Prefill code from URL if provided (e.g., /redeem?c=XXXXX-XXXXX)
  useEffect(() => {
    const codeParam = searchParams.get('c') || searchParams.get('code');
    if (codeParam) {
      setRawCode(formatCode(codeParam));
    }
  }, [searchParams]);

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setRawCode(formatCode(val));
    setErrorMessage(null);
  };

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      showToast('Please sign in to redeem your reward.', 'warning');
      return;
    }

    const clean = normalizeCode(rawCode);
    if (clean.length !== 10) {
      setErrorMessage('Please enter a valid 10-character code found under the jar lid.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await api.post<RedeemResult>('/api/redeem', { code: clean });
      if (res.success && res.data) {
        setSuccessResult(res.data);
        setShowConfetti(true);
        showToast(`Congratulations! You won ₹${res.data.amount} cashback! 🎉`, 'success');
      } else {
        setErrorMessage(res.error || 'Failed to redeem code. Please try again.');
        showToast(res.error || 'Redemption failed', 'error');
      }
    } catch {
      setErrorMessage('Network error. Please check your internet connection.');
      showToast('Connection error', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCardRevealed = useCallback(() => {
    setIsRevealed(true);
  }, []);

  const handleRedeemAnother = () => {
    setSuccessResult(null);
    setRawCode('');
    setIsRevealed(false);
    setShowConfetti(false);
    setErrorMessage(null);
  };

  if (authLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <Spinner />
        <p className="mt-4 text-sm text-[var(--text-secondary)]">Connecting to Gold Haven...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col px-5 py-6 safe-bottom">
      <Confetti active={showConfetti} />

      {/* Brand Header */}
      <header className="flex flex-col items-center text-center mt-2 mb-6">
        <div className="relative w-24 h-24 mb-3 rounded-full p-1 neu-raised flex items-center justify-center">
          <Image
            src="/logo.png"
            alt="Gold Haven Premium Foods"
            width={88}
            height={88}
            className="rounded-full object-cover"
            priority
          />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
          Gold Haven <span className="text-[var(--gold)]">Rewards</span>
        </h1>
        <p className="text-xs uppercase tracking-widest text-[var(--gold)] mt-1 font-semibold">
          Premium Mixed Nuts & Dry Fruits
        </p>
        <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs bg-[var(--bg-elevated)] border border-[rgba(212,175,55,0.2)] text-[var(--text-secondary)]">
          <span>100g Jar</span>
          <span>•</span>
          <span>MRP ₹99</span>
        </div>
      </header>

      {/* Main Card */}
      <div className="w-full neu-raised p-6 mb-6 flex flex-col items-center">
        {!user ? (
          /* ── 1. Unauthenticated Landing ── */
          <div className="w-full flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full neu-inset flex items-center justify-center text-[var(--gold)] mb-4">
              <Gift className="w-6 h-6" />
            </div>

            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">
              Scan. Enter code. Win!
            </h2>
            <p className="text-sm text-[var(--text-secondary)] mb-6 max-w-xs leading-relaxed">
              Every jar contains a unique code printed under the lid. Win random instant cashback of{' '}
              <strong className="text-[var(--gold)]">₹1 to ₹5</strong> directly in your wallet!
            </p>

            {/* Google Sign-in Button */}
            <button
              onClick={loginWithGoogle}
              className="neu-gold-button w-full text-base font-semibold"
              aria-label="Continue with Google"
            >
              <svg className="w-5 h-5 mr-1" viewBox="0 0 24 24">
                <path
                  fill="#1c1c1f"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#1c1c1f"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#1c1c1f"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#1c1c1f"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              Continue with Google
            </button>

            <p className="text-[11px] text-[var(--text-muted)] mt-4">
              Instant login. Withdraw cashback to any UPI ID anytime.
            </p>
          </div>
        ) : successResult ? (
          /* ── 2. Success / Scratch Card Reveal ── */
          <div className="w-full flex flex-col items-center text-center animate-fadeIn">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--gold)] mb-3">
              <Sparkles className="w-4 h-4 animate-spin" />
              <span>Reward Unlocked!</span>
            </div>

            <h2 className="text-xl font-bold mb-4">Under-the-Lid Jackpot</h2>

            {/* Interactive Scratch Card */}
            <div className="my-2">
              <ScratchCard amount={successResult.amount} onRevealed={handleCardRevealed} />
            </div>

            <p className="text-xs text-[var(--text-secondary)] mt-3">
              {isRevealed
                ? 'Reward added directly to your wallet!'
                : 'Swipe across the gold card above to reveal your prize!'}
            </p>

            <div className="w-full mt-6 neu-inset p-4 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full neu-raised flex items-center justify-center text-[var(--gold)]">
                  <Wallet className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="text-xs text-[var(--text-secondary)]">New Wallet Balance</p>
                  <p className="text-lg font-bold text-[var(--gold)]">
                    ₹{successResult.newBalance}
                  </p>
                </div>
              </div>
              <Link
                href="/wallet"
                className="text-xs font-semibold text-[var(--gold)] hover:underline flex items-center gap-1"
              >
                Withdraw <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="w-full flex gap-3 mt-5">
              <button
                onClick={handleRedeemAnother}
                className="neu-button-secondary flex-1 text-sm py-3"
              >
                Enter Another Code
              </button>
              <Link
                href="/wallet"
                className="neu-gold-button flex-1 text-sm py-3 text-center"
              >
                Go to Wallet
              </Link>
            </div>
          </div>
        ) : (
          /* ── 3. Authenticated Code Input Flow ── */
          <form onSubmit={handleRedeem} className="w-full flex flex-col items-center">
            <div className="flex items-center justify-between w-full mb-4">
              <span className="text-xs text-[var(--text-secondary)]">
                Logged in as <strong className="text-[var(--text-primary)]">{user.displayName || user.email}</strong>
              </span>
              <span className="text-xs text-[var(--gold)] font-medium">₹1 to ₹5 per jar</span>
            </div>

            <label htmlFor="code-input" className="text-sm font-medium text-[var(--text-primary)] mb-2 self-start">
              Enter 10-Character Code
            </label>

            {/* Formatted Code Input */}
            <div className="w-full relative mb-2">
              <input
                id="code-input"
                type="text"
                value={rawCode}
                onChange={handleCodeChange}
                placeholder="XXXXX-XXXXX"
                maxLength={11} // 10 chars + 1 hyphen
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck="false"
                className="neu-code-input uppercase"
                disabled={isSubmitting}
                required
              />
            </div>

            <p className="text-[11px] text-[var(--text-muted)] mb-5 text-center">
              Look under the lid of your 100g Gold Haven jar. Format: 5 letters - 5 letters
            </p>

            {/* Error Message Box */}
            {errorMessage && (
              <div
                className="w-full neu-inset p-3.5 rounded-xl border border-[var(--error)] bg-red-950/20 text-red-200 text-xs flex items-start gap-2.5 mb-5"
                role="alert"
              >
                <ShieldAlert className="w-4 h-4 text-[var(--error)] shrink-0 mt-0.5" />
                <span className="leading-snug">{errorMessage}</span>
              </div>
            )}

            {/* Redeem Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || normalizeCode(rawCode).length !== 10}
              className="neu-gold-button w-full text-base font-semibold"
            >
              {isSubmitting ? (
                <>
                  <Spinner className="w-5 h-5 mr-2" />
                  Verifying Code...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Claim Cashback
                </>
              )}
            </button>
          </form>
        )}
      </div>

      {/* How It Works Guide */}
      <div className="w-full neu-raised p-5 rounded-2xl">
        <h3 className="text-xs uppercase tracking-wider text-[var(--gold)] font-semibold mb-3">
          How to Win & Withdraw
        </h3>
        <ol className="space-y-3 text-xs text-[var(--text-secondary)]">
          <li className="flex items-start gap-3">
            <span className="w-5 h-5 rounded-full neu-inset text-[var(--gold)] flex items-center justify-center font-bold shrink-0">
              1
            </span>
            <span>Unscrew the lid of your Gold Haven jar and find the 10-character code stamped underneath.</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="w-5 h-5 rounded-full neu-inset text-[var(--gold)] flex items-center justify-center font-bold shrink-0">
              2
            </span>
            <span>Enter the code above to win an instant random cashback of ₹1, ₹2, ₹3, ₹4, or ₹5!</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="w-5 h-5 rounded-full neu-inset text-[var(--gold)] flex items-center justify-center font-bold shrink-0">
              3
            </span>
            <span>Accumulate rewards in your wallet and withdraw directly to your UPI ID (Google Pay, PhonePe, Paytm).</span>
          </li>
        </ol>
      </div>
    </div>
  );
}

export default function RedeemPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <Spinner />
          <p className="mt-4 text-sm text-[var(--text-secondary)]">Loading Gold Haven...</p>
        </div>
      }
    >
      <RedeemContent />
    </Suspense>
  );
}
