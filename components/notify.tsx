'use client';
import React from 'react';

type NotifyAPI = {
  info: (m: string) => void;
  success: (m: string) => void;
  error: (m: string) => void;
}

export const notify: NotifyAPI = {
  info:   (m) => console.info('[info]', m),
  success:(m) => console.log('[success]', m),
  error:  (m) => console.error('[error]', m),
};

export function Notifier() { return null; }
