'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api-client';
import { useToast } from '@/components/ui/Toast';
import Spinner from '@/components/ui/Spinner';
import type { AdminUser } from '@/lib/types';
import {
  Users,
  Search,
  ShieldAlert,
  ShieldCheck,
  CheckCircle,
  XCircle,
  CreditCard,
  Coins,
} from 'lucide-react';

export default function AdminUsersPage() {
  const { showToast } = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      params.set('limit', '50');

      const res = await api.get<AdminUser[]>(`/api/admin/users?${params.toString()}`);
      if (res.success && res.data) {
        setUsers(res.data);
      }
    } catch {
      showToast('Failed to load user accounts', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, showToast]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchUsers]);

  const handleToggleBlock = async (uid: string, currentBlocked: boolean, userEmail: string) => {
    const newBlocked = !currentBlocked;
    try {
      const res = await api.put('/api/admin/users', {
        uid,
        isBlocked: newBlocked,
      });

      if (res.success) {
        showToast(
          `User ${userEmail} ${newBlocked ? 'blocked' : 'unblocked'} successfully.`,
          newBlocked ? 'warning' : 'success'
        );
        fetchUsers();
      } else {
        showToast(res.error || 'Failed to update user status', 'error');
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
          Registered Customers
        </h1>
        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
          View all consumers who have signed in with Google, inspect balances and UPI IDs, or suspend suspicious accounts.
        </p>
      </div>

      {/* Search Input */}
      <div className="neu-raised p-4 rounded-2xl">
        <div className="relative">
          <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search customer by email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="neu-input pl-10 text-sm"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="neu-raised rounded-2xl overflow-hidden p-1">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-sm font-bold text-[var(--text-primary)]">Customer Directory</h2>
          <span className="text-xs text-[var(--text-secondary)]">{users.length} registered</span>
        </div>

        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center text-center">
            <Spinner />
          </div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center text-xs text-[var(--text-muted)]">
            No customers found matching search.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Registered UPI</th>
                  <th>Mobile</th>
                  <th>Wallet Balance</th>
                  <th>Lifetime Earned</th>
                  <th>Redemptions</th>
                  <th>Last Active</th>
                  <th>Status</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.uid}>
                    <td>
                      <div>
                        <span className="font-semibold text-white text-xs block">
                          {u.name || 'Unnamed'}
                        </span>
                        <span className="text-[11px] text-[var(--text-secondary)] block">
                          {u.email}
                        </span>
                      </div>
                    </td>
                    <td className="text-xs font-mono text-[var(--gold)]">
                      {u.upiId || <span className="text-[var(--text-muted)] italic">Not set</span>}
                    </td>
                    <td className="text-xs text-[var(--text-secondary)]">
                      {u.mobile || '—'}
                    </td>
                    <td className="font-bold text-[var(--gold)] text-sm">
                      ₹{u.walletBalance || 0}
                    </td>
                    <td className="font-medium text-white text-xs">
                      ₹{u.totalEarned || 0}
                    </td>
                    <td className="text-xs text-[var(--text-secondary)]">
                      {u.totalRedemptions || 0} jars
                    </td>
                    <td className="text-xs text-[var(--text-muted)]">
                      {u.lastActive ? new Date(u.lastActive as string).toLocaleDateString('en-IN') : '—'}
                    </td>
                    <td>
                      <span
                        className={`badge text-[10px] ${
                          u.isBlocked ? 'badge-error' : 'badge-success'
                        }`}
                      >
                        {u.isBlocked ? 'Blocked' : 'Active'}
                      </span>
                    </td>
                    <td className="text-right">
                      <button
                        onClick={() => handleToggleBlock(u.uid, u.isBlocked, u.email)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold neu-raised transition-all ${
                          u.isBlocked
                            ? 'text-[var(--success)] hover:border-[var(--success)]'
                            : 'text-[var(--error)] hover:border-[var(--error)]'
                        }`}
                      >
                        {u.isBlocked ? 'Unblock' : 'Block User'}
                      </button>
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
