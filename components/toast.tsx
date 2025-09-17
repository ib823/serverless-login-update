'use client';

import { useEffect, useState } from 'react';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

let toastId = 0;
const toasts: Toast[] = [];
const listeners: ((toasts: Toast[]) => void)[] = [];

const emit = () => listeners.forEach(l => l([...toasts]));

export const toast = {
  success: (message: string) => {
    const t = { id: ++toastId, message, type: 'success' as const };
    toasts.push(t);
    emit();
    setTimeout(() => {
      const idx = toasts.findIndex(x => x.id === t.id);
      if (idx >= 0) {
        toasts.splice(idx, 1);
        emit();
      }
    }, 3000);
  },
  error: (message: string) => {
    const t = { id: ++toastId, message, type: 'error' as const };
    toasts.push(t);
    emit();
    setTimeout(() => {
      const idx = toasts.findIndex(x => x.id === t.id);
      if (idx >= 0) {
        toasts.splice(idx, 1);
        emit();
      }
    }, 4000);
  }
};

export function Toaster() {
  const [items, setItems] = useState<Toast[]>([]);
  
  useEffect(() => {
    const handler = (t: Toast[]) => setItems(t);
    listeners.push(handler);
    return () => {
      const idx = listeners.indexOf(handler);
      if (idx >= 0) listeners.splice(idx, 1);
    };
  }, []);
  
  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    }}>
      {items.map(t => (
        <div key={t.id} style={{
          padding: '12px 20px',
          borderRadius: '8px',
          background: t.type === 'success' ? '#10b981' : '#ef4444',
          color: 'white',
          fontSize: '14px',
          fontWeight: 500,
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          animation: 'slideIn 0.3s ease',
          minWidth: '250px'
        }}>
          {t.message}
        </div>
      ))}
    </div>
  );
}
