'use client';
import { useEffect, useState } from 'react';
import { notify } from '@/components/notify';

export default function AccountPage() {
  const [email, setEmail] = useState<string | null>(null);

  async function load(){
    const r = await fetch('/api/session',{cache:'no-store'});
    if(!r.ok){ setEmail(null); return; }
    const { session } = await r.json();
    setEmail(session?.email || null);
  }
  async function logout(){
    const r = await fetch('/api/logout',{method:'POST'});
    if(r.ok){ notify.info('Signed out'); setEmail(null); }
    else { notify.error('Sign out failed'); }
  }
  useEffect(()=>{ load(); },[]);

  return (
    <div className="card fade-in">
      <div className="h1">Account</div>
      <p className="small" style={{marginTop:4}}>Passkeys only. Nothing to phish.</p>
      {email ? (
        <>
          <p style={{marginTop:14}}>Signed in as <b>{email}</b></p>
          <div className="row" style={{marginTop:14}}>
            <a className="btn-ghost" href="/auth">Switch account</a>
            <button className="btn" onClick={logout}>Logout</button>
          </div>
        </>
      ) : (
        <>
          <p style={{marginTop:14}}>Not signed in.</p>
          <a className="btn" href="/auth" style={{marginTop:10, display:'inline-block'}}>Sign in</a>
        </>
      )}
    </div>
  );
}
