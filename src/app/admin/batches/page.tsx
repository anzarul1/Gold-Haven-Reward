'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api-client';
import { useToast } from '@/components/ui/Toast';
import Spinner from '@/components/ui/Spinner';
import { formatCode } from '@/lib/constants';
import type { AdminBatch } from '@/lib/types';
import {
  Layers,
  Plus,
  Download,
  Ban,
  CheckCircle,
  AlertCircle,
  FileSpreadsheet,
  Check,
} from 'lucide-react';

export default function AdminBatchesPage() {
  const { showToast } = useToast();
  const [batches, setBatches] = useState<AdminBatch[]>([]);
  const [loading, setLoading] = useState(true);

  // New batch modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [batchName, setBatchName] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [quantity, setQuantity] = useState('100');
  const [generating, setGenerating] = useState(false);

  // Downloadable generated codes
  const [downloadBatch, setDownloadBatch] = useState<{ id: string; codes: string[]; name: string } | null>(null);

  const fetchBatches = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get<AdminBatch[]>('/api/admin/batches');
      if (res.success && res.data) {
        setBatches(res.data);
      }
    } catch {
      showToast('Failed to load batches', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(quantity, 10);
    if (!batchName.trim()) {
      showToast('Batch name is required', 'error');
      return;
    }
    if (isNaN(qty) || qty < 1 || qty > 10000) {
      showToast('Quantity must be between 1 and 10,000 for web generation', 'error');
      return;
    }

    setGenerating(true);
    try {
      const res = await api.post<{ batchId: string; codesGenerated: number; codes: string[] }>(
        '/api/admin/batches',
        {
          name: batchName.trim(),
          batchNumber: batchNumber.trim(),
          quantity: qty,
        }
      );

      if (res.success && res.data) {
        showToast(`Successfully created batch with ${res.data.codesGenerated} codes!`, 'success');
        setDownloadBatch({
          id: res.data.batchId,
          codes: res.data.codes,
          name: batchName.trim(),
        });
        setIsModalOpen(false);
        setBatchName('');
        setBatchNumber('');
        setQuantity('100');
        fetchBatches();
      } else {
        showToast(res.error || 'Failed to create batch', 'error');
      }
    } catch {
      showToast('Error generating batch codes', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleToggleBatchStatus = async (batchId: string, currentStatus: 'active' | 'disabled') => {
    const newStatus = currentStatus === 'active' ? 'disabled' : 'active';
    try {
      const res = await api.put('/api/admin/batches', {
        batchId,
        status: newStatus,
      });
      if (res.success) {
        showToast(`Batch ${newStatus === 'active' ? 'activated' : 'disabled'}`, 'success');
        fetchBatches();
      } else {
        showToast(res.error || 'Update failed', 'error');
      }
    } catch {
      showToast('Connection error', 'error');
    }
  };

  // Download CSV: columns "serial,code"
  const handleDownloadCsv = (codes: string[], name: string) => {
    const rows = ['serial,code'];
    codes.forEach((c, idx) => {
      rows.push(`${idx + 1},${formatCode(c)}`);
    });
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `GoldHaven_Batch_${name.replace(/\s+/g, '_')}_Codes.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold font-serif text-[var(--text-primary)]">
            Jar Batches & Code Generation
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Create production batches, generate unguessable 10-character codes, and export CSVs for the packaging printer.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="neu-gold-button text-xs py-2 px-3 font-semibold flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Create New Batch
        </button>
      </div>

      {/* Fresh Generation Alert / CSV Download Bar */}
      {downloadBatch && (
        <div className="neu-raised p-4 rounded-xl border border-[var(--gold)] bg-[rgba(212,175,55,0.06)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full neu-inset flex items-center justify-center text-[var(--gold)] shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-[var(--text-primary)]">
                {downloadBatch.codes.length} Codes Ready for Printing!
              </p>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Batch: {downloadBatch.name} • Alphabet: ABCDEFGHJKLMNPQRSTUVWXYZ23456789
              </p>
            </div>
          </div>
          <button
            onClick={() => handleDownloadCsv(downloadBatch.codes, downloadBatch.name)}
            className="neu-gold-button text-xs py-2 px-3 flex items-center gap-1.5 shrink-0"
          >
            <Download className="w-4 h-4" /> Download Printer CSV
          </button>
        </div>
      )}

      {/* Batches Table Card */}
      <div className="neu-raised rounded-2xl overflow-hidden p-1">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-sm font-bold text-[var(--text-primary)]">Production Batches</h2>
          <span className="text-xs text-[var(--text-secondary)]">{batches.length} total</span>
        </div>

        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center text-center">
            <Spinner />
          </div>
        ) : batches.length === 0 ? (
          <div className="py-16 text-center text-xs text-[var(--text-muted)]">
            No batches created yet. Click "+ Create New Batch" to generate your first jar codes.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Batch Name</th>
                  <th>Jar Stamp #</th>
                  <th>Quantity</th>
                  <th>Redeemed</th>
                  <th>Rate</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => (
                  <tr key={b.id}>
                    <td className="font-semibold text-white">{b.name}</td>
                    <td className="text-[var(--text-secondary)] font-mono text-xs">
                      {b.batchNumber || '—'}
                    </td>
                    <td>{b.quantity.toLocaleString()}</td>
                    <td className="text-[var(--gold)] font-medium">
                      {(b.redeemedCount || 0).toLocaleString()}
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-white/10 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-[var(--gold)] h-full rounded-full"
                            style={{ width: `${b.redemptionRate || 0}%` }}
                          />
                        </div>
                        <span className="text-xs text-[var(--text-secondary)]">
                          {b.redemptionRate || 0}%
                        </span>
                      </div>
                    </td>
                    <td>
                      <span
                        className={`badge text-[10px] ${
                          b.status === 'active' ? 'badge-success' : 'badge-error'
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>
                    <td className="text-xs text-[var(--text-muted)]">
                      {b.createdAt ? new Date(b.createdAt as string).toLocaleDateString('en-IN') : '—'}
                    </td>
                    <td className="text-right">
                      <button
                        onClick={() => handleToggleBatchStatus(b.id, b.status)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold neu-raised transition-all ${
                          b.status === 'active'
                            ? 'text-[var(--error)] hover:border-[var(--error)]'
                            : 'text-[var(--success)] hover:border-[var(--success)]'
                        }`}
                      >
                        {b.status === 'active' ? 'Disable Batch' : 'Enable Batch'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Batch Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="neu-raised max-w-md w-full p-6 rounded-2xl relative animate-scaleUp">
            <h3 className="text-lg font-bold mb-1 text-[var(--text-primary)]">
              Create New Production Batch
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mb-4">
              Generates cryptographic 10-char codes formatted as XXXXX-XXXXX (no 0/O/1/I).
            </p>

            <form onSubmit={handleCreateBatch} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-[var(--text-secondary)] mb-1 block">
                  Batch Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Batch Oct 2026 - Mumbai Factory"
                  value={batchName}
                  onChange={(e) => setBatchName(e.target.value)}
                  className="neu-input"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-medium text-[var(--text-secondary)] mb-1 block">
                  Batch / Lot Number (Printed on Jar)
                </label>
                <input
                  type="text"
                  placeholder="e.g. GH-2610-A"
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                  className="neu-input"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-[var(--text-secondary)] mb-1 block">
                  Quantity of Codes to Generate *
                </label>
                <input
                  type="number"
                  min="1"
                  max="10000"
                  step="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="neu-input"
                  required
                />
                <span className="text-[10px] text-[var(--text-muted)] mt-1 block">
                  Max 10,000 per request. Uses batched writes of 500 into Firestore.
                </span>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="neu-button-secondary flex-1 text-sm py-2.5"
                  disabled={generating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={generating}
                  className="neu-gold-button flex-1 text-sm py-2.5"
                >
                  {generating ? (
                    <>
                      <Spinner className="w-4 h-4 mr-2" />
                      Generating...
                    </>
                  ) : (
                    'Generate Codes'
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
