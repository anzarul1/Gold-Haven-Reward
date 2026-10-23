'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api-client';
import { useToast } from '@/components/ui/Toast';
import Spinner from '@/components/ui/Spinner';
import { formatCode } from '@/lib/constants';
import type { AdminCode } from '@/lib/types';
import {
  QrCode,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Ban,
  Clock,
  Coins,
} from 'lucide-react';

export default function AdminCodesPage() {
  const { showToast } = useToast();
  const [codes, setCodes] = useState<AdminCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchCodes = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (statusFilter) params.set('status', statusFilter);
      params.set('limit', '50');

      const res = await api.get<AdminCode[]>(`/api/admin/codes?${params.toString()}`);
      if (res.success && res.data) {
        setCodes(res.data);
      }
    } catch {
      showToast('Failed to fetch codes', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, showToast]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchCodes();
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [fetchCodes]);

  const handleToggleCodeStatus = async (code: string, currentStatus: string) => {
    if (currentStatus === 'used') {
      showToast('Used codes cannot be modified', 'warning');
      return;
    }

    const newStatus = currentStatus === 'unused' ? 'disabled' : 'unused';
    try {
      const res = await api.put('/api/admin/codes', {
        code,
        status: newStatus,
      });

      if (res.success) {
        showToast(`Code ${formatCode(code)} ${newStatus}`, 'success');
        fetchCodes();
      } else {
        showToast(res.error || 'Update failed', 'error');
      }
    } catch {
      showToast('Connection error', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold font-serif text-[var(--text-primary)]">
          Redemption Codes Registry
        </h1>
        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
          Lookup any printed jar code, inspect redemption timestamps, won cashback amount, or disable leaked codes.
        </p>
      </div>

      {/* Filter / Search Bar */}
      <div className="neu-raised p-4 rounded-2xl flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search code (e.g. XXXXX or full 10 chars)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="neu-input pl-10 text-sm"
          />
        </div>

        <div className="sm:w-48">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="neu-input text-sm cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="unused">Unused Only</option>
            <option value="used">Redeemed (Used)</option>
            <option value="disabled">Disabled</option>
          </select>
        </div>
      </div>

      {/* Table Card */}
      <div className="neu-raised rounded-2xl overflow-hidden p-1">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-sm font-bold text-[var(--text-primary)]">Codes List</h2>
          <span className="text-xs text-[var(--text-secondary)]">{codes.length} results</span>
        </div>

        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center text-center">
            <Spinner />
          </div>
        ) : codes.length === 0 ? (
          <div className="py-16 text-center text-xs text-[var(--text-muted)]">
            No codes found matching query.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Formatted Code</th>
                  <th>Raw Code</th>
                  <th>Batch ID</th>
                  <th>Status</th>
                  <th>Reward</th>
                  <th>Used By (UID)</th>
                  <th>Used At</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {codes.map((c) => (
                  <tr key={c.code}>
                    <td className="font-mono font-bold text-[var(--gold)] text-sm">
                      {formatCode(c.code)}
                    </td>
                    <td className="font-mono text-xs text-[var(--text-muted)]">
                      {c.code}
                    </td>
                    <td className="text-xs font-mono text-[var(--text-secondary)]">
                      {c.batchId ? c.batchId.slice(0, 8) + '...' : '—'}
                    </td>
                    <td>
                      <span
                        className={`badge text-[10px] ${
                          c.status === 'used'
                            ? 'badge-gold'
                            : c.status === 'unused'
                            ? 'badge-success'
                            : 'badge-error'
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="font-semibold text-white">
                      {c.rewardAmount ? `₹${c.rewardAmount}` : '—'}
                    </td>
                    <td className="text-xs font-mono text-[var(--text-muted)]">
                      {c.usedBy ? c.usedBy.slice(0, 10) + '...' : '—'}
                    </td>
                    <td className="text-xs text-[var(--text-muted)]">
                      {c.usedAt ? new Date(c.usedAt as string).toLocaleString('en-IN') : '—'}
                    </td>
                    <td className="text-right">
                      {c.status !== 'used' ? (
                        <button
                          onClick={() => handleToggleCodeStatus(c.code, c.status)}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold neu-raised transition-all ${
                            c.status === 'unused'
                              ? 'text-[var(--error)] hover:border-[var(--error)]'
                              : 'text-[var(--success)] hover:border-[var(--success)]'
                          }`}
                        >
                          {c.status === 'unused' ? 'Disable' : 'Enable'}
                        </button>
                      ) : (
                        <span className="text-xs text-[var(--text-muted)]">Locked</span>
                      )}
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
