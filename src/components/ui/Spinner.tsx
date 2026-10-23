/* ─────────────────────────────────────────────────────────────
   src/components/ui/Spinner.tsx  –  Loading spinner
   ───────────────────────────────────────────────────────────── */

export default function Spinner({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center ${className}`} role="status">
      <div className="spinner-gold" />
      <span className="sr-only">Loading...</span>
    </div>
  );
}

export function FullPageSpinner() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[var(--bg-base)] z-50">
      <div className="flex flex-col items-center gap-4">
        <div className="spinner-gold" style={{ width: 48, height: 48 }} />
        <p className="text-[var(--text-secondary)] text-sm">Loading...</p>
      </div>
    </div>
  );
}
