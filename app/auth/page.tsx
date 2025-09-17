'use client';

import { useState } from 'react';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';

async function readError(r: Response) {
  try {
    const t = await r.text();
    try { const j = JSON.parse(t); return j.detail || j.error || t; } catch { return t; }
  } catch { return 'Unknown error'; }
}

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState<string>('');

  async function onContinue() {
    setMsg('Starting…');
    try {
      const r = await fetch('/api/webauthn/begin', {
        method: 'POST',
        headers: {'content-type':'application/json'},
        body: JSON.stringify({ email })
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || 'begin failed');

      if (data.mode === 'register') {
        const att = await startRegistration(data.options);
        const vr = await fetch('/api/webauthn/register/verify', {
          method:'POST', headers:{'content-type':'application/json'},
          body: JSON.stringify({ email, response: att })
        });
        if (!vr.ok) throw new Error(await readError(vr));
        setMsg('✅ Registered & signed in!');
      } else {
        const getRes = await startAuthentication(data.options);
        const vr = await fetch('/api/webauthn/auth/verify', {
          method:'POST', headers:{'content-type':'application/json'},
          body: JSON.stringify({ email, response: getRes })
        });
        if (!vr.ok) throw new Error(await readError(vr));
        setMsg('✅ Signed in!');
      }
    } catch (e:any) {
      setMsg('❌ ' + (e?.message || 'Unexpected error'));
    }
  }

  return (
    <main className="p-8 space-y-4 max-w-md">
      <h1 className="text-2xl font-semibold">Sign in with Passkey</h1>
      <p className="text-sm text-zinc-600">Single field. We pick register vs sign-in automatically.</p>
      <input
        className="w-full border rounded-lg px-3 py-2"
        placeholder="email@example.com"
        value={email}
        onChange={e=>setEmail(e.target.value)}
      />
      <button
        onClick={onContinue}
        className="rounded-lg border px-4 py-2 hover:bg-zinc-50"
      >
        Continue
      </button>
      {msg && <p className="text-sm">{msg}</p>}
    </main>
  );
}
