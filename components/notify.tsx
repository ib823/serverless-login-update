'use client';

import { useEffect, useState } from 'react';

type Toast = {
  id: number;
  type: 'success' | 'error' | 'info';
  message: string;
};

const toasts: Toast[] = [];
const listeners: ((toasts: Toast[]) => void)[] = [];

const emit = () => listeners.forEach(l => l([...toasts]));

export const notify = {
  success: (message: string) => {
    const toast = { id: Date.now(), type: 'success' as const, message };
    toasts.push(toast);
    emit();
    setTimeout(() => {
      const idx = toasts.findIndex(t => t.id === toast.id);
      if (idx >= 0) {
        toasts.splice(idx, 1);
        emit();
      }
    }, 3000);
  },
  error: (message: string) => {
    const toast = { id: Date.now(), type: 'error' as const, message };
    toasts.push(toast);
    emit();
    setTimeout(() => {
      const idx = toasts.findIndex(t => t.id === toast.id);
      if (idx >= 0) {
        toasts.splice(idx, 1);
        emit();
      }
    }, 3000);
  },
  info: (message: string) => {
    const toast = { id: Date.now(), type: 'info' as const, message };
    toasts.push(toast);
    emit();
    setTimeout(() => {
      const idx = toasts.findIndex(t => t.id === toast.id);
      if (idx >= 0) {
        toasts.splice(idx, 1);
        emit();
      }
    }, 3000);
  }
};

export function Notifier() {
  const [items, setItems] = useState<Toast[]>([]);

  useEffect(() => {
    const handler = (toasts: Toast[]) => setItems(toasts);
    listeners.push(handler);
    return () => {
      const idx = listeners.indexOf(handler);
      if (idx >= 0) listeners.splice(idx, 1);
    };
  }, []);

  return (
    <div className="toasts" aria-live="polite">
      {items.map(toast => (
        <div key={toast.id} className={`toast ${toast.type}`}>
          {toast.message}
        </div>
      ))}
    </div>
  );
}
