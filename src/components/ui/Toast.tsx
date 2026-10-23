/* ─────────────────────────────────────────────────────────────
   src/components/ui/Toast.tsx  –  Toast notification system
   ───────────────────────────────────────────────────────────── */
'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType>({
  showToast: () => {},
});

let toastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const borderColors: Record<ToastType, string> = {
    success: 'border-l-4 border-l-[var(--success)]',
    error: 'border-l-4 border-l-[var(--error)]',
    warning: 'border-l-4 border-l-[var(--warning)]',
    info: 'border-l-4 border-l-[var(--gold)]',
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {typeof window !== 'undefined' &&
        createPortal(
          <div
            className="fixed top-4 right-4 left-4 z-[10000] flex flex-col items-center gap-2 pointer-events-none"
            aria-live="polite"
            aria-atomic="true"
          >
            {toasts.map((toast) => (
              <div
                key={toast.id}
                className={`pointer-events-auto neu-raised px-5 py-3.5 text-sm font-medium max-w-sm w-full ${borderColors[toast.type]} animate-[slideDown_0.3s_ease]`}
                role="alert"
              >
                {toast.message}
              </div>
            ))}
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
