export default function Home() {
  return (
    <main className="p-8 space-y-4">
      <h1 className="text-2xl font-semibold">Passkeys IdP v3.0</h1>
      <p className="text-zinc-600">Next.js 15 · WebAuthn · OAuth 2.1 + PKCE · OIDC</p>
      <div className="space-x-3">
        <a className="inline-block rounded-lg border px-4 py-2 hover:bg-zinc-50" href="/auth">Auth</a>
        <a className="inline-block rounded-lg border px-4 py-2 hover:bg-zinc-50" href="/budget">Free-Tier Budget</a>
      </div>
    </main>
  );
}
