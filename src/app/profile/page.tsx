'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/components/ui/Toast';
import Spinner from '@/components/ui/Spinner';
import { api } from '@/lib/api-client';
import { isValidUpiId } from '@/lib/constants';
import {
  User as UserIcon,
  Mail,
  Smartphone,
  CreditCard,
  LogOut,
  ShieldAlert,
  ShieldCheck,
  Check,
  Lock,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface ProfileData {
  email: string;
  name: string;
  photoURL?: string;
  upiId?: string;
  mobile?: string;
  walletBalance: number;
  totalEarned: number;
  totalRedemptions: number;
}

export default function ProfilePage() {
  const { user, loading: authLoading, isAdmin, logout, loginWithGoogle } = useAuth();
  const { showToast } = useToast();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states
  const [upiId, setUpiId] = useState('');
  const [mobile, setMobile] = useState('');
  const [upiError, setUpiError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const res = await api.get<ProfileData>('/api/profile');
      if (res.success && res.data) {
        setProfile(res.data);
        setUpiId(res.data.upiId || '');
        setMobile(res.data.mobile || '');
      }
    } catch {
      showToast('Failed to load profile', 'error');
    } finally {
      setLoading(false);
    }
  }, [user, showToast]);

  useEffect(() => {
    if (user) {
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, [user, fetchProfile]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpiError(null);

    const trimmedUpi = upiId.trim();
    if (trimmedUpi && !isValidUpiId(trimmedUpi)) {
      setUpiError('Invalid UPI ID. Format should be name@bank (e.g. 9876543210@paytm, user@oksbi)');
      return;
    }

    setSaving(true);
    try {
      const res = await api.put('/api/profile', {
        upiId: trimmedUpi,
        mobile: mobile.trim(),
      });

      if (res.success) {
        showToast('Profile updated successfully! ✅', 'success');
        fetchProfile();
      } else {
        showToast(res.error || 'Failed to update profile', 'error');
      }
    } catch {
      showToast('Connection error', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || (user && loading)) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center safe-bottom">
        <Spinner />
        <p className="mt-4 text-sm text-[var(--text-secondary)]">Loading your profile...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center safe-bottom">
        <div className="w-16 h-16 rounded-full neu-raised flex items-center justify-center text-[var(--gold)] mb-4">
          <UserIcon className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold mb-2">Sign In to Your Account</h2>
        <p className="text-sm text-[var(--text-secondary)] mb-6 max-w-xs">
          Manage your payout UPI ID, track your lifetime rewards, and secure your account.
        </p>
        <button onClick={loginWithGoogle} className="neu-gold-button w-full max-w-xs text-sm font-semibold">
          Continue with Google
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col px-5 py-6 safe-bottom">
      {/* Profile Header Card */}
      <div className="w-full neu-raised p-6 rounded-2xl mb-6 flex flex-col items-center text-center">
        <div className="relative w-20 h-20 mb-3 rounded-full neu-inset p-1 flex items-center justify-center">
          {user.photoURL ? (
            <Image
              src={user.photoURL}
              alt={user.displayName || 'User'}
              width={72}
              height={72}
              className="rounded-full object-cover"
            />
          ) : (
            <UserIcon className="w-8 h-8 text-[var(--gold)]" />
          )}
        </div>

        <h1 className="text-lg font-bold text-[var(--text-primary)]">
          {profile?.name || user.displayName || 'Gold Haven Customer'}
        </h1>
        <p className="text-xs text-[var(--text-secondary)] flex items-center gap-1.5 mt-0.5">
          <Mail className="w-3.5 h-3.5 text-[var(--gold)]" />
          {profile?.email || user.email}
        </p>

        {/* Stats Summary */}
        <div className="w-full grid grid-cols-2 gap-3 mt-5 pt-4 border-t border-[rgba(255,255,255,0.05)]">
          <div className="neu-inset p-3 rounded-xl text-center">
            <span className="text-[10px] uppercase text-[var(--text-muted)] font-medium block">
              Redemptions
            </span>
            <span className="text-base font-bold text-[var(--text-primary)] block mt-0.5">
              {profile?.totalRedemptions || 0} jars
            </span>
          </div>
          <div className="neu-inset p-3 rounded-xl text-center">
            <span className="text-[10px] uppercase text-[var(--text-muted)] font-medium block">
              Total Cashback
            </span>
            <span className="text-base font-bold text-[var(--gold)] block mt-0.5">
              ₹{profile?.totalEarned || 0}
            </span>
          </div>
        </div>
      </div>

      {/* Admin Portal Gateway (If user has custom claim) */}
      {isAdmin && (
        <div className="w-full neu-raised p-4 rounded-xl mb-6 border border-[rgba(212,175,55,0.3)] bg-gradient-to-r from-[rgba(212,175,55,0.05)] to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-[var(--gold)]" />
              <div>
                <p className="text-xs font-bold text-[var(--text-primary)]">Administrator Access</p>
                <p className="text-[10px] text-[var(--gold)]">Verified admin account</p>
              </div>
            </div>
            <Link
              href="/admin"
              className="neu-gold-button text-xs py-2 px-3 font-semibold flex items-center gap-1"
            >
              Open Admin <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* Payout & Contact Settings Form */}
      <form onSubmit={handleSaveProfile} className="w-full neu-raised p-5 rounded-2xl mb-6 space-y-4">
        <h2 className="text-xs uppercase tracking-wider text-[var(--gold)] font-semibold mb-2">
          Payout & Account Details
        </h2>

        {/* UPI ID */}
        <div>
          <label htmlFor="upi-input" className="text-xs font-medium text-[var(--text-secondary)] mb-1.5 flex items-center gap-1.5">
            <CreditCard className="w-3.5 h-3.5 text-[var(--gold)]" />
            UPI ID (For Instant Withdrawal)
          </label>
          <input
            id="upi-input"
            type="text"
            placeholder="e.g. mobile@paytm or name@oksbi"
            value={upiId}
            onChange={(e) => {
              setUpiId(e.target.value);
              setUpiError(null);
            }}
            className={`neu-input ${upiError ? 'error' : ''}`}
          />
          {upiError ? (
            <p className="text-[11px] text-[var(--error)] mt-1">{upiError}</p>
          ) : (
            <p className="text-[10px] text-[var(--text-muted)] mt-1">
              Supports Google Pay, PhonePe, Paytm, BHIM or bank UPI handle.
            </p>
          )}
        </div>

        {/* Mobile Number */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="mobile-input" className="text-xs font-medium text-[var(--text-secondary)] flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-[var(--gold)]" />
              Mobile Number (Optional)
            </label>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--bg-elevated)] text-[var(--gold)] border border-[rgba(212,175,55,0.2)]">
              Verification coming soon
            </span>
          </div>
          <input
            id="mobile-input"
            type="tel"
            placeholder="+91 98765 43210"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            className="neu-input"
          />
          <p className="text-[10px] text-[var(--text-muted)] mt-1">
            Phone authentication with OTP will be available soon.
          </p>
        </div>

        {/* Save Button */}
        <button
          type="submit"
          disabled={saving}
          className="neu-gold-button w-full text-sm font-semibold mt-2"
        >
          {saving ? (
            <>
              <Spinner className="w-4 h-4 mr-2" />
              Saving Settings...
            </>
          ) : (
            <>
              <Check className="w-4 h-4 mr-1" />
              Save Details
            </>
          )}
        </button>
      </form>

      {/* Logout Action */}
      <button
        onClick={logout}
        className="neu-button-secondary w-full text-xs font-semibold py-3 flex items-center justify-center gap-2 text-[var(--text-secondary)] hover:text-[var(--error)]"
      >
        <LogOut className="w-4 h-4" />
        Log Out of Gold Haven
      </button>

      <p className="text-center text-[10px] text-[var(--text-muted)] mt-6">
        Gold Haven Rewards v1.0 • Neumorphic Edition
      </p>
    </div>
  );
}
