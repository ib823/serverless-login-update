'use client';

import { useEffect, useState } from 'react';

export default function AccountPage() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/session')
      .then(async (r) => {
        if (r.ok) {
          const data = await r.json();
          setSession(data.session);
        } else {
          window.location.replace('/auth');
        }
      })
      .catch(() => window.location.replace('/auth'))
      .finally(() => setLoading(false));
  }, []);

  const signOut = async () => {
    await fetch('/api/logout', { method: 'POST' });
    window.location.replace('/auth');
  };

  if (loading) {
    return (
      <div className="container">
        <div className="card">
          <div className="btn loading" style={{ border: 'none' }}>Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="card fade-in">
        <h1>Authenticated</h1>
        <p className="status">
          Signed in as <strong>{session?.email}</strong>
        </p>
        
        <div className="actions" style={{ marginTop: '2rem' }}>
          <button className="btn" onClick={signOut}>
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
