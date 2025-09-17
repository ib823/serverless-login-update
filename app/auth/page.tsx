'use client';

import { useEffect, useRef, useState } from 'react';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{type: 'error' | 'success' | null, message: string}>({type: null, message: ''});
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
    setStatus({type: null, message: ''});
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
        
        setStatus({type: 'success', message: 'Redirecting...'});
        setTimeout(() => window.location.replace('/account'), 500);
        
      } else {
        const assertion = await startAuthentication(options);
        
        const verifyResp = await fetch('/api/webauthn/auth/verify', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ email: normalized, response: assertion })
        });

        if (!verifyResp.ok) throw new Error('Authentication failed');
        
        setStatus({type: 'success', message: 'Redirecting...'});
        setTimeout(() => window.location.replace('/account'), 500);
      }
    } catch (err: any) {
      setLoading(false);
      
      if (err.name === 'AbortError' || err.message?.includes('aborted')) {
        setStatus({type: null, message: ''});
        return;
      }
      
      if (err.name === 'NotAllowedError') {
        setStatus({type: 'error', message: 'Security key not available. Try another browser.'});
      } else if (err.name === 'NotSupportedError') {
        setStatus({type: 'error', message: 'This browser doesn\'t support passkeys.'});
      } else if (err.message?.includes('Network')) {
        setStatus({type: 'error', message: 'Connection failed. Please try again.'});
      } else {
        setStatus({type: 'error', message: 'Authentication failed. Please try again.'});
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
          className={`input ${status.type === 'error' ? 'error' : ''}`}
          placeholder="Enter your email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (status.type) setStatus({type: null, message: ''});
          }}
          onKeyPress={handleKeyPress}
          disabled={loading}
          autoComplete="username webauthn"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck="false"
        />
        
        <button 
          className={`btn ${loading ? 'loading' : ''}`}
          onClick={authenticate}
          disabled={loading || !email.includes('@')}
        >
          {loading ? '' : 'Continue'}
        </button>

        <div className={`status-message ${status.type || ''}`}>
          {status.message || '\u00A0'}
        </div>
      </div>
    </div>
  );
}
