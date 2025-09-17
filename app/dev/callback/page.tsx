'use client';
import { useEffect, useState } from 'react';

export default function DevCallback() {
  const [q, setQ] = useState<Record<string,string>>({});
  useEffect(() => {
    const u = new URL(window.location.href);
    const out: Record<string,string> = {};
    u.searchParams.forEach((v,k)=>out[k]=v);
    setQ(out);
  }, []);
  return (
    <main className="p-8 space-y-4">
      <h1 className="text-2xl font-semibold">Dev Callback</h1>
      <p className="text-sm text-zinc-600">Use the <code>code</code> value below with the token endpoint.</p>
      <pre className="p-3 rounded border bg-white">{JSON.stringify(q,null,2)}</pre>
      <a className="underline" href="/account">Go to account</a>
    </main>
  );
}
