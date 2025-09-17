import type { Metadata } from 'next';
import './globals.css';
import { Notifier } from '@/components/notify';

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
          /* Hide Next.js debug tools */
          nextjs-portal, [id^="__next"], [class*="nextjs"] { 
            display: none !important; 
          }
        `}} />
      </head>
      <body>
        {children}
        <Notifier />
      </body>
    </html>
  );
}
