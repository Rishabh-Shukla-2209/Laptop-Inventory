'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  exiting?: boolean;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (type: Toast['type'], message: string) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 300);
  }, []);

  const addToast = useCallback(
    (type: Toast['type'], message: string) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setToasts((prev) => [...prev, { id, type, message }]);
      setTimeout(() => removeToast(id), 5000);
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      {/* Toast container */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-lg border px-4 py-3 shadow-2xl backdrop-blur-xl flex items-start gap-3 ${
              toast.exiting ? 'toast-exit' : 'toast-enter'
            } ${
              toast.type === 'success'
                ? 'bg-success-muted border-success/30 text-success'
                : toast.type === 'error'
                ? 'bg-danger-muted border-danger/30 text-danger'
                : toast.type === 'warning'
                ? 'bg-warning-muted border-warning/30 text-warning'
                : 'bg-info-muted border-info/30 text-info'
            }`}
          >
            <span className="text-lg mt-0.5">
              {toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : toast.type === 'warning' ? '⚠' : 'ℹ'}
            </span>
            <p className="text-sm flex-1 pt-0.5">{toast.message}</p>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-current opacity-60 hover:opacity-100 transition-opacity shrink-0 mt-0.5"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
