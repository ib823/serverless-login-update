'use client';

import { useEffect, useRef, useState } from 'react';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import { notify } from '@/components/notify';

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    
    fetch('/api/session')
      .then(r => r.ok && window.location.replace('/account'))
      .catch(() => {});
      
    const saved = localStorage.getItem('lastEmail');
    if (saved) setEmail(saved);
  }, []);

  const authenticate = async () => {
    const normalized = email.trim().toLowerCase();
    if (!normalized.includes('@') || loading) return;

    setLoading(true);
    localStorage.setItem('lastEmail', normalized);

    try {
      const beginResp = await fetch('/api/webauthn/begin', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: normalized })
      });

      if (!beginResp.ok) throw new Error('Network error');
      
      const { mode, options } = await beginResp.json();

      if (mode === 'register') {
        const credential = await startRegistration(options);
        
        const verifyResp = await fetch('/api/webauthn/register/verify', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ email: normalized, response: credential })
        });

        if (!verifyResp.ok) throw new Error('Registration failed');
        
        notify.success('Account created');
        setTimeout(() => window.location.replace('/account'), 500);
        
      } else {
        const assertion = await startAuthentication(options);
        
        const verifyResp = await fetch('/api/webauthn/auth/verify', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ email: normalized, response: assertion })
        });

        if (!verifyResp.ok) throw new Error('Authentication failed');
        
        notify.success('Authenticated');
        setTimeout(() => window.location.replace('/account'), 500);
      }
    } catch (err: any) {
      setLoading(false);
      
      if (err.name === 'AbortError' || err.message?.includes('aborted')) {
        return;
      }
      
      if (err.name === 'NotAllowedError') {
        notify.error('Security key unavailable');
      } else if (err.name === 'NotSupportedError') {
        notify.error('Browser not supported');
      } else if (err.message?.includes('Network')) {
        notify.error('Connection failed');
      } else {
        notify.error('Authentication failed');
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') authenticate();
  };

  return (
    <div className="container">
      <div className="card fade-in">
        <h1>Authentication<br/>Reimagined</h1>
        <p className="subtitle">No password. No friction.</p>
        
        <input
          ref={inputRef}
          type="email"
          className="input"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={loading}
          autoComplete="username webauthn"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck="false"
        />
        
        <button 
          className="btn" 
          onClick={authenticate}
          disabled={loading || !email.includes('@')}
        >
          {loading ? (
            <>Authenticating<span className="spinner"/></>
          ) : (
            'Continue'
          )}
        </button>
      </div>
    </div>
  );
}
