'use client';

import { createPortal } from 'react-dom';
import { useToast } from '@/lib/toast-context';

export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0 || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast-enter pointer-events-auto rounded-lg px-4 py-3 font-mono text-sm shadow-lg border ${
            toast.type === 'success'
              ? 'bg-green/10 border-green text-green'
              : toast.type === 'error'
                ? 'bg-coral/10 border-coral text-coral'
                : 'bg-purple/10 border-purple text-purple'
          }`}
          role="alert"
        >
          <div className="flex items-center justify-between gap-4">
            <span>{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-current opacity-60 hover:opacity-100"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>,
    document.body
  );
}
