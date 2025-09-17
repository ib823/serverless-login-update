'use client';

import { useEffect, useState } from 'react';

export default function HomePage() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/session')
      .then(async (r) => {
        if (r.ok) {
          const data = await r.json();
          setSession(data.session);
          // If authenticated, redirect to account
          window.location.replace('/account');
        } else {
          // If not authenticated, redirect to auth
          window.location.replace('/auth');
        }
      })
      .catch(() => window.location.replace('/auth'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="container">
        <div className="card">
          <div className="btn loading" style={{ border: 'none' }}>Loading...</div>
        </div>
      </div>
    );
  }

  return null; // This won't be seen as we redirect
}
