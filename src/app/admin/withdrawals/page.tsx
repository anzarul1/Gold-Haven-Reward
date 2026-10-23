'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api-client';
import { useToast } from '@/components/ui/Toast';
import Spinner from '@/components/ui/Spinner';
import type { AdminWithdrawal } from '@/lib/types';
import {
  CreditCard,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  Check,
  X,
  ExternalLink,
  Coins,
} from 'lucide-react';

export default function AdminWithdrawalsPage() {
  const { showToast } = useToast();
  const [withdrawals, setWithdrawals] = useState<AdminWithdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');

  // Process payout modal
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<AdminWithdrawal | null>(null);
  const [actionType, setActionType] = useState<'paid' | 'rejected'>('paid');
  const [txnRef, setTxnRef] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchWithdrawals = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      params.set('limit', '50');

      const res = await api.get<AdminWithdrawal[]>(`/api/admin/withdrawals?${params.toString()}`);
      if (res.success && res.data) {
        setWithdrawals(res.data);
      }
    } catch {
      showToast('Failed to load withdrawals', 'error');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, showToast]);

  useEffect(() => {
    fetchWithdrawals();
  }, [fetchWithdrawals]);

  const handleOpenActionModal = (w: AdminWithdrawal, action: 'paid' | 'rejected') => {
    setSelectedWithdrawal(w);
    setActionType(action);
    setTxnRef('');
  };

  const handleConfirmAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWithdrawal) return;

    if (actionType === 'paid' && !txnRef.trim()) {
      showToast('Please enter the UPI transaction reference / UTR number', 'error');
      return;
    }

    setIsProcessing(true);
    try {
      const res = await api.put('/api/admin/withdrawals', {
        withdrawalId: selectedWithdrawal.id,
        action: actionType,
        txnRef: txnRef.trim(),
      });

      if (res.success) {
        showToast(
          actionType === 'paid'
            ? 'Withdrawal marked as Paid! Customer notified.'
            : 'Withdrawal rejected. ₹' + selectedWithdrawal.amount + ' refunded to customer wallet via ledger.',
          actionType === 'paid' ? 'success' : 'warning'
        );
        setSelectedWithdrawal(null);
        fetchWithdrawals();
      } else {
        showToast(res.error || 'Failed to update withdrawal', 'error');
      }
    } catch {
      showToast('Connection error', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold font-serif text-[var(--text-primary)]">
          UPI Payout Processing
        </h1>
        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
          Approve customer withdrawals with UPI reference (UTR), or reject to automatically refund their wallet via ledger credit.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="tab-bar max-w-md">
        <button
          onClick={() => setStatusFilter('pending')}
          className={`tab-item ${statusFilter === 'pending' ? 'active' : ''}`}
        >
          Pending Review
        </button>
        <button
          onClick={() => setStatusFilter('paid')}
          className={`tab-item ${statusFilter === 'paid' ? 'active' : ''}`}
        >
          Completed (Paid)
        </button>
        <button
          onClick={() => setStatusFilter('rejected')}
          className={`tab-item ${statusFilter === 'rejected' ? 'active' : ''}`}
        >
          Rejected
        </button>
        <button
          onClick={() => setStatusFilter('')}
          className={`tab-item ${statusFilter === '' ? 'active' : ''}`}
        >
          All
        </button>
      </div>

      {/* Withdrawals Table */}
      <div className="neu-raised rounded-2xl overflow-hidden p-1">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-sm font-bold text-[var(--text-primary)]">Withdrawal Requests</h2>
          <span className="text-xs text-[var(--text-secondary)]">{withdrawals.length} items</span>
        </div>

        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center text-center">
            <Spinner />
          </div>
        ) : withdrawals.length === 0 ? (
          <div className="py-16 text-center text-xs text-[var(--text-muted)]">
            No withdrawal requests under this status.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Destination UPI ID</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Requested At</th>
                  <th>Transaction Ref / UTR</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {withdrawals.map((w) => (
                  <tr key={w.id}>
                    <td>
                      <div>
                        <span className="font-semibold text-white text-xs block">
                          {w.userName || 'Customer'}
                        </span>
                        <span className="text-[11px] text-[var(--text-secondary)] block">
                          {w.userEmail || w.uid}
                        </span>
                      </div>
                    </td>
                    <td className="font-mono font-bold text-[var(--gold)] text-xs">
                      {w.upiId}
                    </td>
                    <td className="font-bold text-white text-sm">
                      ₹{w.amount}
                    </td>
                    <td>
                      <span
                        className={`badge text-[10px] ${
                          w.status === 'paid'
                            ? 'badge-success'
                            : w.status === 'rejected'
                            ? 'badge-error'
                            : 'badge-warning'
                        }`}
                      >
                        {w.status}
                      </span>
                    </td>
                    <td className="text-xs text-[var(--text-muted)]">
                      {w.createdAt ? new Date(w.createdAt as string).toLocaleString('en-IN') : '—'}
                    </td>
                    <td className="text-xs font-mono text-[var(--text-secondary)]">
                      {w.txnRef || <span className="text-[var(--text-muted)] italic">—</span>}
                    </td>
                    <td className="text-right">
                      {w.status === 'pending' ? (
                        <div className="inline-flex gap-2">
                          <button
                            onClick={() => handleOpenActionModal(w, 'paid')}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold neu-raised text-[var(--success)] hover:border-[var(--success)] flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" /> Mark Paid
                          </button>
                          <button
                            onClick={() => handleOpenActionModal(w, 'rejected')}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold neu-raised text-[var(--error)] hover:border-[var(--error)] flex items-center gap-1"
                          >
                            <X className="w-3.5 h-3.5" /> Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-[var(--text-muted)]">Processed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Process Action Modal */}
      {selectedWithdrawal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="neu-raised max-w-md w-full p-6 rounded-2xl relative animate-scaleUp">
            <h3 className="text-lg font-bold mb-1 text-[var(--text-primary)]">
              {actionType === 'paid' ? 'Mark Payout as Paid' : 'Reject Withdrawal Request'}
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mb-4">
              {actionType === 'paid'
                ? `Confirm manual transfer of ₹${selectedWithdrawal.amount} to ${selectedWithdrawal.upiId}.`
                : `Reject request of ₹${selectedWithdrawal.amount}. This will automatically credit the amount back to ${selectedWithdrawal.userEmail || 'user'}'s wallet ledger.`}
            </p>

            <form onSubmit={handleConfirmAction} className="space-y-4">
              <div className="neu-inset p-3.5 rounded-xl space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Recipient:</span>
                  <span className="font-semibold text-white">{selectedWithdrawal.userEmail}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">UPI ID:</span>
                  <span className="font-mono font-bold text-[var(--gold)]">{selectedWithdrawal.upiId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Amount:</span>
                  <span className="font-bold text-white">₹{selectedWithdrawal.amount}</span>
                </div>
              </div>

              {actionType === 'paid' && (
                <div>
                  <label className="text-xs font-medium text-[var(--text-secondary)] mb-1 block">
                    Bank / UPI Transaction Reference (UTR) *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 423589123456 or GPay-Ref-9821"
                    value={txnRef}
                    onChange={(e) => setTxnRef(e.target.value)}
                    className="neu-input"
                    required
                  />
                  <span className="text-[10px] text-[var(--text-muted)] mt-1 block">
                    This reference will be visible in the user's transaction history.
                  </span>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedWithdrawal(null)}
                  className="neu-button-secondary flex-1 text-sm py-2.5"
                  disabled={isProcessing}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className={`flex-1 text-sm py-2.5 font-semibold rounded-xl neu-raised transition-all ${
                    actionType === 'paid'
                      ? 'bg-[var(--gold)] text-[#1c1c1f]'
                      : 'bg-red-900/50 text-red-200 border border-red-500'
                  }`}
                >
                  {isProcessing ? (
                    <Spinner className="w-4 h-4 mx-auto" />
                  ) : actionType === 'paid' ? (
                    'Confirm & Mark Paid'
                  ) : (
                    'Confirm Rejection'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
