import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Authentication',
  description: 'Passwordless authentication',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <style dangerouslySetInnerHTML={{ __html: `
          nextjs-portal { display: none !important; }
        `}} />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
