'use client';
import React, { useEffect, useState } from 'react';

type Kind = 'success' | 'error' | 'info';
type Notice = { id: number; kind: Kind; text: string };
type Listener = (n: Notice) => void;

const listeners: Listener[] = [];
function emit(n: Notice) { for (const l of listeners) l(n); }
function id() { return Date.now() + Math.random(); }

export const notify = {
  success(text: string) { emit({ id: id(), kind: 'success', text }); },
  error(text: string)   { emit({ id: id(), kind: 'error',   text }); },
  info(text: string)    { emit({ id: id(), kind: 'info',    text }); },
};

export function Notifier() {
  const [items, setItems] = useState<Notice[]>([]);
  useEffect(() => {
    const h: Listener = (n) => {
      setItems(prev => [n, ...prev].slice(0, 3));
      setTimeout(() => setItems(prev => prev.filter(i => i.id !== n.id)), 3200);
    };
    listeners.push(h);
    return () => { const i = listeners.indexOf(h); if (i >= 0) listeners.splice(i, 1); };
  }, []);
  return (
    <div aria-live="polite" aria-atomic="true" className="toaster">
      {items.map(n => (
        <div
          key={n.id}
          role={n.kind === 'error' ? 'alert' : 'status'}
          className={`notice ${n.kind} toast-enter`}
        >
          {n.text}
        </div>
      ))}
    </div>
  );
}
