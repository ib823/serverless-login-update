import './globals.css';
import { Notifier } from '@/components/notify';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <main className="container">
          <div className="nav">
            <div className="brand">Passkeys IdP</div>
            <a className="link" href="/account">Account</a>
          </div>
          {children}
        </main>
        <Notifier />
      </body>
    </html>
  );
}
