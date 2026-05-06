import type { Metadata, Viewport } from 'next';
import { Cairo, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { PWAInstallPrompt } from '@/components/common/PWAInstallPrompt';
import { ServiceWorkerProvider } from '@/components/common/ServiceWorkerProvider';

const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  variable: '--font-cairo',
  display: 'swap',
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-plus-jakarta',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: 'PulseSpace', template: '%s · PulseSpace' },
  description: 'A premium social platform for meaningful connections',
  keywords: ['social', 'community', 'groups', 'connect', 'chat'],
  authors: [{ name: 'PulseSpace' }],
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
    shortcut: '/favicon.svg',
    apple: '/icons/icon-192x192.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'PulseSpace',
  },
  openGraph: {
    type: 'website',
    siteName: 'PulseSpace',
    title: 'PulseSpace — Where communities pulse',
    description: 'A premium social platform for meaningful connections',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PulseSpace',
    description: 'A premium social platform for meaningful connections',
  },
};

export const viewport: Viewport = {
  themeColor: '#09130F',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className="dark">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body className={`${cairo.variable} ${plusJakarta.variable} font-sans bg-pulse-bg text-pulse-text antialiased`}>
        <LanguageProvider>
          <AuthProvider>
            <ServiceWorkerProvider />
            {children}
            <PWAInstallPrompt />
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
