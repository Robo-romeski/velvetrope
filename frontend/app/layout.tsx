import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import Providers from './providers';
import { AppNav } from './components/AppNav';
import { AppFooter } from './components/AppFooter';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'VelvetKey',
  description: 'Trust-first events platform.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/icon.svg',
  },
  appleWebApp: {
    capable: true,
    title: 'VelvetKey',
    statusBarStyle: 'black-translucent',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f7f7f5' },
    { media: '(prefers-color-scheme: dark)', color: '#111110' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} flex min-h-dvh flex-col bg-background font-sans text-foreground antialiased`}
      >
        <Providers>
          <AppNav />
          <div className="flex-1">{children}</div>
          <AppFooter />
        </Providers>
      </body>
    </html>
  );
}
