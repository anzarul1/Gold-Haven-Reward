'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import type { DashboardStats } from '@/lib/types';
import Spinner from '@/components/ui/Spinner';
import {
  QrCode,
  Sparkles,
  TrendingUp,
  Users,
  CreditCard,
  Layers,
  ArrowRight,
  Clock,
  Calendar,
  AlertCircle,
  Coins,
} from 'lucide-react';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get<DashboardStats>('/api/admin/dashboard');
      if (res.success && res.data) {
        setStats(res.data);
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center">
        <Spinner />
        <p className="text-xs text-[var(--text-secondary)] mt-3">Loading operations metrics...</p>
      </div>
    );
  }

  const s = stats || {
    totalCodes: 0,
    redeemedCodes: 0,
    unusedCodes: 0,
    cashbackToday: 0,
    cashbackThisMonth: 0,
    activeUsers: 0,
    pendingWithdrawals: 0,
    dailyChart: [],
  };

  const redemptionRate = s.totalCodes > 0 ? ((s.redeemedCodes / s.totalCodes) * 100).toFixed(1) : '0';

  // Find max in chart for scaling
  const maxChartCount = Math.max(...(s.dailyChart.map((d) => d.count) || [1]), 5);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-serif text-[var(--text-primary)]">
            Campaign Overview
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Real-time analytics for Gold Haven Premium Dry Fruits cashback program
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/batches"
            className="neu-gold-button text-xs py-2 px-3 font-semibold"
          >
            + Generate Codes
          </Link>
          <Link
            href="/admin/withdrawals"
            className="neu-button-secondary text-xs py-2 px-3 font-semibold"
          >
            Review Payouts ({s.pendingWithdrawals})
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Codes */}
        <div className="neu-raised p-4 rounded-2xl">
          <div className="flex items-center justify-between text-[var(--text-muted)] mb-2">
            <span className="text-xs font-medium">Codes Printed</span>
            <QrCode className="w-4 h-4 text-[var(--gold)]" />
          </div>
          <p className="text-2xl font-bold font-serif text-[var(--text-primary)]">
            {s.totalCodes.toLocaleString()}
          </p>
          <p className="text-[11px] text-[var(--text-secondary)] mt-1">
            <span className="text-[var(--gold)] font-semibold">{s.unusedCodes.toLocaleString()}</span> unused in market
          </p>
        </div>

        {/* Redeemed & Rate */}
        <div className="neu-raised p-4 rounded-2xl">
          <div className="flex items-center justify-between text-[var(--text-muted)] mb-2">
            <span className="text-xs font-medium">Redemptions</span>
            <Sparkles className="w-4 h-4 text-[var(--gold)]" />
          </div>
          <p className="text-2xl font-bold font-serif text-[var(--gold)]">
            {s.redeemedCodes.toLocaleString()}
          </p>
          <p className="text-[11px] text-[var(--text-secondary)] mt-1">
            <span className="font-semibold text-[var(--success)]">{redemptionRate}%</span> redemption rate
          </p>
        </div>

        {/* Cashback Today */}
        <div className="neu-raised p-4 rounded-2xl">
          <div className="flex items-center justify-between text-[var(--text-muted)] mb-2">
            <span className="text-xs font-medium">Cashback Today</span>
            <Coins className="w-4 h-4 text-[var(--gold)]" />
          </div>
          <p className="text-2xl font-bold font-serif text-[var(--text-primary)]">
            ₹{s.cashbackToday.toLocaleString()}
          </p>
          <p className="text-[11px] text-[var(--text-secondary)] mt-1">
            Month: ₹{s.cashbackThisMonth.toLocaleString()}
          </p>
        </div>

        {/* Active Users & Withdrawals */}
        <div className="neu-raised p-4 rounded-2xl">
          <div className="flex items-center justify-between text-[var(--text-muted)] mb-2">
            <span className="text-xs font-medium">Pending Payouts</span>
            <CreditCard className="w-4 h-4 text-[var(--warning)]" />
          </div>
          <p className="text-2xl font-bold font-serif text-[var(--warning)]">
            {s.pendingWithdrawals}
          </p>
          <p className="text-[11px] text-[var(--text-secondary)] mt-1">
            {s.activeUsers} total customers
          </p>
        </div>
      </div>

      {/* Chart & Quick Action Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Redemptions Bar Chart */}
        <div className="lg:col-span-2 neu-raised p-5 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-[var(--text-primary)]">
                Daily Redemptions (Last 30 Days)
              </h2>
              <p className="text-[11px] text-[var(--text-muted)]">
                Volume of code entries and rewards claimed
              </p>
            </div>
            <span className="text-xs text-[var(--gold)] font-medium flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> Live
            </span>
          </div>

          {s.dailyChart.length === 0 ? (
            <div className="h-48 neu-inset rounded-xl flex items-center justify-center text-xs text-[var(--text-muted)]">
              No redemption activity recorded yet this month.
            </div>
          ) : (
            <div className="neu-inset p-4 rounded-xl">
              <div className="h-44 flex items-end gap-2 overflow-x-auto pt-6 pb-2">
                {s.dailyChart.map((d) => {
                  const heightPercent = Math.max((d.count / maxChartCount) * 100, 4);
                  return (
                    <div
                      key={d.date}
                      className="flex-1 min-w-[28px] flex flex-col items-center gap-1.5 group relative"
                    >
                      {/* Tooltip on hover */}
                      <div className="absolute -top-8 bg-[var(--bg-elevated)] border border-[rgba(212,175,55,0.2)] text-[10px] text-[var(--gold)] px-2 py-0.5 rounded shadow opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                        {d.count} redeems (₹{d.amount})
                      </div>
                      <div
                        className="w-full bg-gradient-to-t from-[var(--gold-dark)] to-[var(--gold)] rounded-t-sm transition-all duration-300 group-hover:brightness-125"
                        style={{ height: `${heightPercent}%` }}
                      />
                      <span className="text-[9px] text-[var(--text-muted)] rotate-45 origin-left mt-1">
                        {d.date.slice(5)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Quick Links & Anti-Fraud Status */}
        <div className="neu-raised p-5 rounded-2xl flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-[var(--text-primary)] mb-3">
              Operations Shortcuts
            </h2>

            <div className="space-y-2">
              <Link
                href="/admin/batches"
                className="neu-inset p-3 rounded-xl flex items-center justify-between hover:border-[var(--gold)] border border-transparent transition-all block"
              >
                <div className="flex items-center gap-2.5">
                  <Layers className="w-4 h-4 text-[var(--gold)]" />
                  <span className="text-xs font-medium">Batch Code Printer</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              </Link>

              <Link
                href="/admin/withdrawals"
                className="neu-inset p-3 rounded-xl flex items-center justify-between hover:border-[var(--gold)] border border-transparent transition-all block"
              >
                <div className="flex items-center gap-2.5">
                  <CreditCard className="w-4 h-4 text-[var(--warning)]" />
                  <span className="text-xs font-medium">Process UPI Withdrawals</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              </Link>

              <Link
                href="/admin/settings"
                className="neu-inset p-3 rounded-xl flex items-center justify-between hover:border-[var(--gold)] border border-transparent transition-all block"
              >
                <div className="flex items-center gap-2.5">
                  <Coins className="w-4 h-4 text-[var(--gold)]" />
                  <span className="text-xs font-medium">Adjust Reward Probabilities</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              </Link>
            </div>
          </div>

          {/* Anti-fraud monitor note */}
          <div className="mt-4 pt-3 border-t border-white/5 text-[11px] text-[var(--text-muted)] leading-relaxed">
            🛡️ <strong className="text-[var(--text-secondary)]">Anti-Fraud Engine Active:</strong> Rate limits, transaction lockouts, collision prevention, and per-user caps are enforced atomically on all requests.
          </div>
        </div>
      </div>
    </div>
  );
}
