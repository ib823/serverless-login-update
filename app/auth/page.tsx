'use client';

import { useEffect, useRef, useState } from 'react';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import { notify } from '@/components/notify';

async function readError(r: Response) {
  try { const t = await r.text(); try { const j = JSON.parse(t); return (j as any).detail || (j as any).error || t; } catch { return t; } }
  catch { return 'Unexpected error'; }
}
async function hasSession(): Promise<boolean> {
  try { const r = await fetch('/api/session', { cache: 'no-store' }); return r.ok; } catch { return false; }
}
async function begin(email:string, forceMode?:'register'){
  const r = await fetch('/api/webauthn/begin',{
    method:'POST', headers:{'content-type':'application/json'},
    body: JSON.stringify({ email, ...(forceMode?{forceMode}:{}) })
  });
  const data = await r.json().catch(()=> ({}));
  if(!r.ok) throw new Error((data as any)?.error || 'Begin failed');
  return data as { mode:'auth'|'register'; options:any };
}

export default function AuthPage(){
  const [email, setEmail] = useState('');
  const [mode, setMode] = useState<'last'|'input'>('input');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement|null>(null);

  // Initialize: last email, autofocus, redirect if already signed in
  useEffect(()=>{ (async()=>{
    const last = localStorage.getItem('lastEmail')||'';
    if(last){ setEmail(last); setMode('last'); }
    if(await hasSession()) window.location.assign('/account');
    setTimeout(()=>{ if(mode==='input') inputRef.current?.focus(); },0);
  })(); },[]);

  async function flow(goEmail:string){
    const normalized = goEmail.trim().toLowerCase();
    if(!normalized.includes('@')) { inputRef.current?.focus(); return; }
    setBusy(true);
    localStorage.setItem('lastEmail', normalized);
    try{
      notify.info('Starting sign-in');
      const first = await begin(normalized);
      if(first.mode==='auth'){
        try{
          const getRes = await startAuthentication(first.options);
          const vr = await fetch('/api/webauthn/auth/verify',{ method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({email:normalized, response:getRes})});
          if(!vr.ok) throw new Error(await readError(vr));
          notify.success('Signed in');
          window.location.assign('/account');
          return;
        }catch(e:any){
          if(!String(e?.message||'').toLowerCase().includes('user aborted')){
            notify.info('No passkey on this device. Creating a new passkey.');
            const regStart = await begin(normalized,'register');
            const att = await startRegistration(regStart.options);
            const rv = await fetch('/api/webauthn/register/verify',{ method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({email:normalized, response:att})});
            if(!rv.ok) throw new Error(await readError(rv));
            notify.success('Passkey created and signed in');
            window.location.assign('/account');
            return;
          } else {
            notify.info('Cancelled. Press Enter to try again.');
          }
        }
      } else {
        notify.info('Creating a new passkey');
        const att = await startRegistration(first.options);
        const rv = await fetch('/api/webauthn/register/verify',{ method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({email:normalized, response:att})});
        if(!rv.ok) throw new Error(await readError(rv));
        notify.success('Passkey created and signed in');
        window.location.assign('/account');
      }
    } catch(e:any){
      const m = String(e?.message || 'Unexpected error');
      if(/SecurityError|NotAllowedError/i.test(m)) notify.error('The browser blocked or timed out. Keep this tab in front and try again.');
      else if(/Unsupported/i.test(m)) notify.error('This browser may not support passkeys. Try the latest Chrome, Edge, or Safari.');
      else notify.error(m);
    } finally { setBusy(false); }
  }

  return (
    <div className="card fade-in">
      <div className="h1">Sign in</div>
      <p className="small" style={{ marginTop: 4 }}>One action. Enter submits.</p>

      {mode==='last' ? (
        <>
          <button
            className="btn"
            style={{ marginTop: 14, width: '100%' }}
            disabled={busy}
            onClick={()=>flow(email)}
            onKeyDown={(e)=>{ if(e.key==='Enter' && !busy) flow(email); }}
          >
            Continue as {email}
          </button>
          <div style={{ marginTop: 10 }}>
            <button className="btn-ghost" onClick={()=>{ setMode('input'); setTimeout(()=>inputRef.current?.focus(),0); }}>
              Use a different email
            </button>
          </div>
        </>
      ) : (
        <div className="row" style={{ marginTop: 12 }}>
          <input
            ref={inputRef}
            className="input"
            type="email"
            inputMode="email"
            autoComplete="username"
            enterKeyHint="go"
            placeholder="you@example.com"
            value={email}
            onChange={e=>setEmail(e.target.value)}
            onKeyDown={(e)=>{ if(e.key==='Enter' && !busy && email.includes('@')) flow(email); }}
          />
          <button className="btn" disabled={busy || !email.includes('@')} onClick={()=>flow(email)}>
            Continue
          </button>
        </div>
      )}
    </div>
  );
}
