import type { Metadata, Viewport } from 'next';
import { Geist_Mono, Source_Sans_3, Source_Serif_4 } from 'next/font/google';
import Providers from './providers';
import { AppNav } from './components/AppNav';
import { AppFooter } from './components/AppFooter';
import './globals.css';

const sourceSans = Source_Sans_3({
  variable: '--font-source-sans',
  subsets: ['latin'],
});

const sourceSerif = Source_Serif_4({
  variable: '--font-source-serif',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'epicsexual',
  description:
    'An independent community journal for ENM learning, conversation, and private gatherings.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/epicsexual-logo.png',
    apple: '/epicsexual-logo.png',
  },
  appleWebApp: {
    capable: true,
    title: 'epicsexual',
    statusBarStyle: 'default',
  },
};

export const viewport: Viewport = {
  themeColor: '#F7F4FA',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${sourceSans.variable} ${sourceSerif.variable} ${geistMono.variable} flex min-h-dvh flex-col bg-background font-sans text-foreground antialiased`}
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
