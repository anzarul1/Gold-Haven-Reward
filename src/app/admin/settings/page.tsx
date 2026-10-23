'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api-client';
import { useToast } from '@/components/ui/Toast';
import Spinner from '@/components/ui/Spinner';
import { DEFAULT_SETTINGS } from '@/lib/constants';
import type { SettingsDoc, RewardSlab } from '@/lib/types';
import {
  Settings,
  Save,
  Power,
  Coins,
  ShieldAlert,
  Sliders,
  DollarSign,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';

export default function AdminSettingsPage() {
  const { showToast } = useToast();
  const [settings, setSettings] = useState<SettingsDoc>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get<SettingsDoc>('/api/admin/settings');
      if (res.success && res.data) {
        setSettings(res.data);
      }
    } catch {
      showToast('Failed to load settings', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSlabWeightChange = (index: number, newWeight: number) => {
    const updated = [...settings.rewardSlabs];
    updated[index] = { ...updated[index], weight: Math.max(0, newWeight) };
    setSettings({ ...settings, rewardSlabs: updated });
  };

  const totalWeight = settings.rewardSlabs.reduce((sum, s) => sum + s.weight, 0);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (totalWeight <= 0) {
      showToast('Total slab probability weight must be greater than 0', 'error');
      return;
    }

    setSaving(true);
    try {
      const res = await api.put('/api/admin/settings', settings);
      if (res.success) {
        showToast('Settings saved successfully! ✨', 'success');
        fetchSettings();
      } else {
        showToast(res.error || 'Failed to save settings', 'error');
      }
    } catch {
      showToast('Connection error', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = () => {
    setSettings(DEFAULT_SETTINGS);
    showToast('Reset to default parameters (remember to Save)', 'info');
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center">
        <Spinner />
        <p className="text-xs text-[var(--text-secondary)] mt-3">Loading campaign parameters...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold font-serif text-[var(--text-primary)]">
            Campaign Controls & Reward Slabs
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Configure weighted random cashback payouts, daily budget ceilings, anti-fraud attempt throttles, and campaign status.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="neu-button-secondary text-xs py-2 px-3 font-semibold flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Defaults
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Campaign Master Switch */}
        <div className="neu-raised p-5 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full neu-inset flex items-center justify-center ${
                settings.campaignActive ? 'text-[var(--success)]' : 'text-[var(--error)]'
              }`}
            >
              <Power className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-[var(--text-primary)]">
                Campaign Status: {settings.campaignActive ? 'ACTIVE (Live)' : 'PAUSED (Inactive)'}
              </p>
              <p className="text-xs text-[var(--text-secondary)]">
                {settings.campaignActive
                  ? 'Customers can scan and redeem codes normally.'
                  : 'Redemptions are temporarily paused. A friendly banner will be shown to customers.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSettings({ ...settings, campaignActive: !settings.campaignActive })}
            className={`px-4 py-2 rounded-xl text-xs font-bold neu-raised transition-all ${
              settings.campaignActive
                ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500'
                : 'bg-red-950/40 text-red-300 border border-red-500'
            }`}
          >
            {settings.campaignActive ? 'Campaign On' : 'Campaign Off'}
          </button>
        </div>

        {/* Reward Slabs & Probability Weights */}
        <div className="neu-raised p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Coins className="w-4 h-4 text-[var(--gold)]" />
                Reward Slabs & Probability Weights
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Set relative weights for each prize amount. Higher weight = higher likelihood of winning.
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-[var(--text-muted)]">Sum of Weights: </span>
              <span className="text-xs font-bold text-[var(--gold)]">{totalWeight}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 pt-2">
            {settings.rewardSlabs.map((slab, idx) => {
              const probability = totalWeight > 0 ? ((slab.weight / totalWeight) * 100).toFixed(1) : '0';
              return (
                <div key={slab.amount} className="neu-inset p-3.5 rounded-xl text-center space-y-2">
                  <span className="text-lg font-serif font-bold text-[var(--gold)] block">
                    ₹{slab.amount}
                  </span>
                  <div>
                    <label className="text-[10px] text-[var(--text-muted)] uppercase block mb-1">
                      Weight
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={slab.weight}
                      onChange={(e) => handleSlabWeightChange(idx, parseInt(e.target.value, 10) || 0)}
                      className="neu-input text-center text-sm py-1.5"
                    />
                  </div>
                  <span className="text-[11px] font-semibold text-[var(--text-secondary)] block">
                    {probability}% odds
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Budget & Redemptions Limits */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Budget Caps */}
          <div className="neu-raised p-5 rounded-2xl space-y-4">
            <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-[var(--gold)]" />
              Budget & Payout Thresholds
            </h2>

            <div>
              <label className="text-xs font-medium text-[var(--text-secondary)] block mb-1">
                Daily Total Cashback Budget Cap (₹)
              </label>
              <input
                type="number"
                min="0"
                step="50"
                value={settings.dailyBudgetCap}
                onChange={(e) => setSettings({ ...settings, dailyBudgetCap: parseInt(e.target.value, 10) || 0 })}
                className="neu-input text-sm"
              />
              <span className="text-[10px] text-[var(--text-muted)] mt-1 block">
                Default ₹2,000. When reached, shows "Rewards are over for today, try tomorrow".
              </span>
            </div>

            <div>
              <label className="text-xs font-medium text-[var(--text-secondary)] block mb-1">
                Minimum Withdrawal Amount (₹)
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={settings.minWithdrawal}
                onChange={(e) => setSettings({ ...settings, minWithdrawal: parseInt(e.target.value, 10) || 1 })}
                className="neu-input text-sm"
              />
              <span className="text-[10px] text-[var(--text-muted)] mt-1 block">
                Default ₹20. Customer balance must reach this amount before UPI withdrawal is unlocked.
              </span>
            </div>
          </div>

          {/* Anti-Fraud & User Throttles */}
          <div className="neu-raised p-5 rounded-2xl space-y-4">
            <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-[var(--warning)]" />
              Anti-Fraud & Velocity Limits
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-[var(--text-secondary)] block mb-1">
                  Max Redeems / Day / User
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={settings.maxRedeemsPerDay}
                  onChange={(e) => setSettings({ ...settings, maxRedeemsPerDay: parseInt(e.target.value, 10) || 1 })}
                  className="neu-input text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-[var(--text-secondary)] block mb-1">
                  Max Redeems / Week / User
                </label>
                <input
                  type="number"
                  min="1"
                  max="200"
                  value={settings.maxRedeemsPerWeek}
                  onChange={(e) => setSettings({ ...settings, maxRedeemsPerWeek: parseInt(e.target.value, 10) || 1 })}
                  className="neu-input text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-[var(--text-secondary)] block mb-1">
                  Max Wrong Attempts
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={settings.maxWrongAttempts}
                  onChange={(e) => setSettings({ ...settings, maxWrongAttempts: parseInt(e.target.value, 10) || 1 })}
                  className="neu-input text-sm"
                />
                <span className="text-[10px] text-[var(--text-muted)] mt-0.5 block">
                  Default: 5 wrong entries
                </span>
              </div>

              <div>
                <label className="text-xs font-medium text-[var(--text-secondary)] block mb-1">
                  Lockout Duration (Mins)
                </label>
                <input
                  type="number"
                  min="5"
                  max="1440"
                  value={settings.lockMinutes}
                  onChange={(e) => setSettings({ ...settings, lockMinutes: parseInt(e.target.value, 10) || 60 })}
                  className="neu-input text-sm"
                />
                <span className="text-[10px] text-[var(--text-muted)] mt-0.5 block">
                  Default: 60 minutes
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Save Bar */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="neu-gold-button py-3 px-6 text-sm font-semibold flex items-center gap-2"
          >
            {saving ? (
              <>
                <Spinner className="w-4 h-4 mr-1" />
                Saving Changes...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-1" />
                Save Settings
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
