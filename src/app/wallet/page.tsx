'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/components/ui/Toast';
import Spinner from '@/components/ui/Spinner';
import { api } from '@/lib/api-client';
import {
  Wallet as WalletIcon,
  ArrowUpRight,
  Sparkles,
  History,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Coins,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

interface HistoryItem {
  id: string;
  type: 'redemption' | 'withdrawal';
  title: string;
  subtitle: string;
  amount: number;
  status?: 'pending' | 'paid' | 'rejected';
  date: string;
  txnRef?: string;
}

interface WalletResponse {
  balance: number;
  totalEarned: number;
  minWithdrawal: number;
  redemptions: {
    id: string;
    code: string;
    amount: number;
    createdAt: string;
  }[];
  withdrawals: {
    id: string;
    upiId: string;
    amount: number;
    status: 'pending' | 'paid' | 'rejected';
    txnRef?: string;
    createdAt: string;
    processedAt?: string;
  }[];
}

export default function WalletPage() {
  const { user, loading: authLoading, loginWithGoogle } = useAuth();
  const { showToast } = useToast();

  const [walletData, setWalletData] = useState<WalletResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'redemptions' | 'withdrawals'>('all');

  // Withdrawal state
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [isSubmittingWithdraw, setIsSubmittingWithdraw] = useState(false);
  const [userUpi, setUserUpi] = useState<string | null>(null);

  const fetchWallet = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const res = await api.get<WalletResponse>('/api/wallet');
      if (res.success && res.data) {
        setWalletData(res.data);
      }

      // Also get profile to check UPI
      const profileRes = await api.get<{ upiId: string }>('/api/profile');
      if (profileRes.success && profileRes.data) {
        setUserUpi(profileRes.data.upiId || '');
      }
    } catch {
      showToast('Failed to load wallet data', 'error');
    } finally {
      setLoading(false);
    }
  }, [user, showToast]);

  useEffect(() => {
    if (user) {
      fetchWallet();
    } else {
      setLoading(false);
    }
  }, [user, fetchWallet]);

  const handleOpenWithdraw = () => {
    if (!userUpi) {
      showToast('Please add your UPI ID in Profile before withdrawing.', 'warning');
      return;
    }
    const balance = walletData?.balance || 0;
    const min = walletData?.minWithdrawal || 20;
    if (balance < min) {
      showToast(`Minimum withdrawal is ₹${min}. Keep redeeming!`, 'warning');
      return;
    }
    setWithdrawAmount(balance.toString());
    setIsWithdrawModalOpen(true);
  };

  const handleConfirmWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(withdrawAmount);
    const balance = walletData?.balance || 0;
    const min = walletData?.minWithdrawal || 20;

    if (isNaN(amount) || amount <= 0) {
      showToast('Please enter a valid amount', 'error');
      return;
    }
    if (amount < min) {
      showToast(`Minimum withdrawal is ₹${min}`, 'error');
      return;
    }
    if (amount > balance) {
      showToast('Insufficient wallet balance', 'error');
      return;
    }

    setIsSubmittingWithdraw(true);
    try {
      const res = await api.post('/api/withdraw', { amount });
      if (res.success) {
        showToast('Withdrawal request submitted! Payout processing.', 'success');
        setIsWithdrawModalOpen(false);
        fetchWallet();
      } else {
        showToast(res.error || 'Failed to submit withdrawal', 'error');
      }
    } catch {
      showToast('Connection error. Please try again.', 'error');
    } finally {
      setIsSubmittingWithdraw(false);
    }
  };

  if (authLoading || (user && loading)) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center safe-bottom">
        <Spinner />
        <p className="mt-4 text-sm text-[var(--text-secondary)]">Loading wallet balance...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center safe-bottom">
        <div className="w-16 h-16 rounded-full neu-raised flex items-center justify-center text-[var(--gold)] mb-4">
          <WalletIcon className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold mb-2">Sign In to View Wallet</h2>
        <p className="text-sm text-[var(--text-secondary)] mb-6 max-w-xs">
          Log in with your Google account to check your balance, see redemption history, and withdraw cashback.
        </p>
        <button onClick={loginWithGoogle} className="neu-gold-button w-full max-w-xs text-sm font-semibold">
          Continue with Google
        </button>
      </div>
    );
  }

  const balance = walletData?.balance || 0;
  const totalEarned = walletData?.totalEarned || 0;
  const minWithdrawal = walletData?.minWithdrawal || 20;
  const canWithdraw = balance >= minWithdrawal && !!userUpi;

  // Combine and sort history
  const combinedHistory: HistoryItem[] = [
    ...(walletData?.redemptions || []).map((r) => ({
      id: `red_${r.id}`,
      type: 'redemption' as const,
      title: `Won ₹${r.amount} Cashback`,
      subtitle: `Code •••• ${r.code.slice(-4)}`,
      amount: r.amount,
      date: r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recent',
    })),
    ...(walletData?.withdrawals || []).map((w) => ({
      id: `wd_${w.id}`,
      type: 'withdrawal' as const,
      title: `UPI Withdrawal to ${w.upiId}`,
      subtitle: w.status === 'paid' && w.txnRef ? `Txn: ${w.txnRef}` : `Status: ${w.status}`,
      amount: -w.amount,
      status: w.status,
      date: w.createdAt ? new Date(w.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recent',
      txnRef: w.txnRef,
    })),
  ];

  const filteredHistory = combinedHistory.filter((item) => {
    if (activeTab === 'redemptions') return item.type === 'redemption';
    if (activeTab === 'withdrawals') return item.type === 'withdrawal';
    return true;
  });

  return (
    <div className="flex-1 flex flex-col px-5 py-6 safe-bottom">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">My Wallet</h1>
        <Link
          href="/profile"
          className="text-xs text-[var(--gold)] font-medium flex items-center gap-1 hover:underline"
        >
          UPI Settings <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Neumorphic Balance Card */}
      <div className="w-full neu-raised p-6 rounded-2xl mb-6 relative overflow-hidden">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-[var(--text-secondary)] font-medium">
              Available Balance
            </p>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-4xl font-bold font-serif text-[var(--gold)]">
                ₹{balance}
              </span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-full neu-inset flex items-center justify-center text-[var(--gold)]">
            <Coins className="w-6 h-6" />
          </div>
        </div>

        <div className="pt-4 border-t border-[rgba(255,255,255,0.05)] flex items-center justify-between">
          <div>
            <p className="text-[11px] text-[var(--text-muted)]">Lifetime Earned</p>
            <p className="text-sm font-semibold text-[var(--text-primary)]">₹{totalEarned}</p>
          </div>
          <div>
            <p className="text-[11px] text-[var(--text-muted)]">Min. Withdrawal</p>
            <p className="text-sm font-semibold text-[var(--text-secondary)]">₹{minWithdrawal}</p>
          </div>
        </div>

        {/* Withdraw Action */}
        <div className="mt-5">
          <button
            onClick={handleOpenWithdraw}
            disabled={balance < minWithdrawal}
            className={`w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
              balance >= minWithdrawal
                ? 'neu-gold-button'
                : 'neu-button-secondary opacity-60 cursor-not-allowed text-[var(--text-muted)]'
            }`}
          >
            <ArrowUpRight className="w-4 h-4" />
            {balance >= minWithdrawal
              ? 'Withdraw to UPI'
              : `Earn ₹${minWithdrawal - balance} more to withdraw`}
          </button>
        </div>

        {!userUpi && (
          <p className="text-[11px] text-[var(--warning)] mt-2 text-center">
            ⚠️ Add your UPI ID in Profile to enable payouts.
          </p>
        )}
      </div>

      {/* History Tabs */}
      <div className="tab-bar mb-4">
        <button
          onClick={() => setActiveTab('all')}
          className={`tab-item ${activeTab === 'all' ? 'active' : ''}`}
        >
          All Activity
        </button>
        <button
          onClick={() => setActiveTab('redemptions')}
          className={`tab-item ${activeTab === 'redemptions' ? 'active' : ''}`}
        >
          Wins
        </button>
        <button
          onClick={() => setActiveTab('withdrawals')}
          className={`tab-item ${activeTab === 'withdrawals' ? 'active' : ''}`}
        >
          Withdrawals
        </button>
      </div>

      {/* History List */}
      <div className="flex-1 flex flex-col gap-3">
        {filteredHistory.length === 0 ? (
          <div className="neu-inset p-8 rounded-2xl text-center my-4">
            <History className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2 opacity-40" />
            <p className="text-sm font-medium text-[var(--text-secondary)]">No transactions yet</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Redeem a code from your Gold Haven jar to start earning!
            </p>
            <Link
              href="/redeem"
              className="inline-block mt-4 px-4 py-2 text-xs font-semibold rounded-lg neu-raised text-[var(--gold)]"
            >
              Scan & Win Now
            </Link>
          </div>
        ) : (
          filteredHistory.map((item) => (
            <div
              key={item.id}
              className="neu-raised p-4 rounded-xl flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full neu-inset flex items-center justify-center shrink-0 ${
                    item.type === 'redemption'
                      ? 'text-[var(--gold)]'
                      : item.status === 'paid'
                      ? 'text-[var(--success)]'
                      : item.status === 'rejected'
                      ? 'text-[var(--error)]'
                      : 'text-[var(--warning)]'
                  }`}
                >
                  {item.type === 'redemption' ? (
                    <Sparkles className="w-4 h-4" />
                  ) : item.status === 'paid' ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : item.status === 'rejected' ? (
                    <XCircle className="w-4 h-4" />
                  ) : (
                    <Clock className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold text-[var(--text-primary)] leading-tight">
                    {item.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-[var(--text-muted)]">{item.date}</span>
                    <span className="text-[10px] text-[var(--text-muted)]">•</span>
                    <span className="text-[10px] text-[var(--text-secondary)]">{item.subtitle}</span>
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0">
                <p
                  className={`text-sm font-bold ${
                    item.amount > 0 ? 'text-[var(--success)]' : 'text-[var(--text-primary)]'
                  }`}
                >
                  {item.amount > 0 ? `+₹${item.amount}` : `-₹${Math.abs(item.amount)}`}
                </p>
                {item.status && (
                  <span
                    className={`badge mt-1 text-[10px] ${
                      item.status === 'paid'
                        ? 'badge-success'
                        : item.status === 'rejected'
                        ? 'badge-error'
                        : 'badge-warning'
                    }`}
                  >
                    {item.status}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Withdrawal Modal */}
      {isWithdrawModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="neu-raised max-w-sm w-full p-6 rounded-2xl relative animate-scaleUp">
            <h3 className="text-lg font-bold mb-1 text-[var(--text-primary)]">Withdraw Cashback</h3>
            <p className="text-xs text-[var(--text-secondary)] mb-4">
              Payout will be transferred to your registered UPI ID.
            </p>

            <form onSubmit={handleConfirmWithdraw} className="space-y-4">
              <div className="neu-inset p-3 rounded-xl">
                <span className="text-[11px] text-[var(--text-muted)] block">Transfer to UPI ID</span>
                <span className="text-sm font-semibold text-[var(--gold)] block mt-0.5">
                  {userUpi}
                </span>
              </div>

              <div>
                <label className="text-xs font-medium text-[var(--text-secondary)] mb-1 block">
                  Amount (₹)
                </label>
                <input
                  type="number"
                  min={minWithdrawal}
                  max={balance}
                  step="1"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="neu-input"
                  required
                />
                <span className="text-[10px] text-[var(--text-muted)] mt-1 block">
                  Available: ₹{balance} • Minimum: ₹{minWithdrawal}
                </span>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsWithdrawModalOpen(false)}
                  className="neu-button-secondary flex-1 text-sm py-2.5"
                  disabled={isSubmittingWithdraw}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingWithdraw}
                  className="neu-gold-button flex-1 text-sm py-2.5"
                >
                  {isSubmittingWithdraw ? <Spinner className="w-4 h-4" /> : 'Confirm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
