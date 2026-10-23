'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api-client';
import { useToast } from '@/components/ui/Toast';
import Spinner from '@/components/ui/Spinner';
import { formatCode } from '@/lib/constants';
import {
  Sparkles,
  Download,
  Filter,
  Calendar,
  User as UserIcon,
  Globe,
  Coins,
} from 'lucide-react';

interface RedemptionItem {
  id: string;
  uid: string;
  userEmail: string;
  code: string;
  amount: number;
  ip: string;
  userAgent: string;
  createdAt: string;
}

export default function AdminRedemptionsPage() {
  const { showToast } = useToast();
  const [redemptions, setRedemptions] = useState<RedemptionItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [userFilter, setUserFilter] = useState('');
  const [amountFilter, setAmountFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchRedemptions = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (userFilter.trim()) params.set('uid', userFilter.trim());
      if (amountFilter) params.set('amount', amountFilter);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      params.set('limit', '100');

      const res = await api.get<RedemptionItem[]>(`/api/admin/redemptions?${params.toString()}`);
      if (res.success && res.data) {
        setRedemptions(res.data);
      }
    } catch {
      showToast('Failed to load redemptions log', 'error');
    } finally {
      setLoading(false);
    }
  }, [userFilter, amountFilter, startDate, endDate, showToast]);

  useEffect(() => {
    fetchRedemptions();
  }, [fetchRedemptions]);

  // CSV Export
  const handleExportCsv = () => {
    if (redemptions.length === 0) {
      showToast('No redemptions to export', 'warning');
      return;
    }

    const headers = ['Redemption ID', 'User Email', 'UID', 'Code', 'Amount (INR)', 'IP Address', 'User Agent', 'Date & Time'];
    const rows = redemptions.map((r) => [
      r.id,
      r.userEmail,
      r.uid,
      formatCode(r.code),
      r.amount,
      r.ip,
      `"${r.userAgent.replace(/"/g, '""')}"`,
      r.createdAt ? new Date(r.createdAt).toLocaleString('en-IN') : '',
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `GoldHaven_Redemptions_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Exported CSV successfully!', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold font-serif text-[var(--text-primary)]">
            Redemptions Log & Audit
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Immutable log of every code claimed, payout amount, user session, and anti-fraud device fingerprint.
          </p>
        </div>
        <button
          onClick={handleExportCsv}
          className="neu-gold-button text-xs py-2 px-3 font-semibold flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Filters Bar */}
      <div className="neu-raised p-4 rounded-2xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label className="text-[10px] text-[var(--text-muted)] font-semibold uppercase block mb-1">
            Amount Filter
          </label>
          <select
            value={amountFilter}
            onChange={(e) => setAmountFilter(e.target.value)}
            className="neu-input text-xs cursor-pointer"
          >
            <option value="">All Amounts (₹1 - ₹5)</option>
            <option value="1">₹1 Cashback</option>
            <option value="2">₹2 Cashback</option>
            <option value="3">₹3 Cashback</option>
            <option value="4">₹4 Cashback</option>
            <option value="5">₹5 Cashback</option>
          </select>
        </div>

        <div>
          <label className="text-[10px] text-[var(--text-muted)] font-semibold uppercase block mb-1">
            Start Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="neu-input text-xs"
          />
        </div>

        <div>
          <label className="text-[10px] text-[var(--text-muted)] font-semibold uppercase block mb-1">
            End Date
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="neu-input text-xs"
          />
        </div>

        <div>
          <label className="text-[10px] text-[var(--text-muted)] font-semibold uppercase block mb-1">
            User ID (UID)
          </label>
          <input
            type="text"
            placeholder="Search by UID..."
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            className="neu-input text-xs"
          />
        </div>
      </div>

      {/* Redemptions Table */}
      <div className="neu-raised rounded-2xl overflow-hidden p-1">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-sm font-bold text-[var(--text-primary)]">Redemptions Log</h2>
          <span className="text-xs text-[var(--text-secondary)]">{redemptions.length} entries</span>
        </div>

        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center text-center">
            <Spinner />
          </div>
        ) : redemptions.length === 0 ? (
          <div className="py-16 text-center text-xs text-[var(--text-muted)]">
            No redemptions matching the selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Customer Email</th>
                  <th>Code</th>
                  <th>Amount</th>
                  <th>IP Address</th>
                  <th>Date & Time</th>
                  <th>Browser / Agent</th>
                </tr>
              </thead>
              <tbody>
                {redemptions.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div>
                        <span className="font-semibold text-white text-xs block">
                          {r.userEmail}
                        </span>
                        <span className="font-mono text-[10px] text-[var(--text-muted)] block">
                          {r.uid ? r.uid.slice(0, 10) + '...' : '—'}
                        </span>
                      </div>
                    </td>
                    <td className="font-mono font-bold text-[var(--gold)] text-xs">
                      {formatCode(r.code)}
                    </td>
                    <td className="font-bold text-[var(--success)] text-sm">
                      ₹{r.amount}
                    </td>
                    <td className="text-xs font-mono text-[var(--text-secondary)]">
                      {r.ip}
                    </td>
                    <td className="text-xs text-[var(--text-muted)]">
                      {r.createdAt ? new Date(r.createdAt).toLocaleString('en-IN') : '—'}
                    </td>
                    <td className="text-[10px] text-[var(--text-muted)] max-w-xs truncate" title={r.userAgent}>
                      {r.userAgent}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
