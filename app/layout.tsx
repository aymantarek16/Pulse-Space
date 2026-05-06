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
      { url: '/icons/pulse-icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    shortcut: '/favicon.svg',
    apple: '/icons/pulse-icon-192.png',
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

const devServiceWorkerCleanupScript = `
(function () {
  if (!('serviceWorker' in navigator)) return;
  if (!['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname)) return;

  var reloadKey = 'pulsespace:dev-sw-cleaned';
  var cleanup = navigator.serviceWorker.getRegistrations()
    .then(function (registrations) {
      return Promise.all(registrations.map(function (registration) {
        return registration.unregister();
      }));
    })
    .then(function () {
      if (!('caches' in window)) return;
      return caches.keys().then(function (keys) {
        return Promise.all(keys.map(function (key) {
          return caches.delete(key);
        }));
      });
    });

  cleanup.then(function () {
    if (!sessionStorage.getItem(reloadKey)) {
      sessionStorage.setItem(reloadKey, '1');
      window.location.reload();
    }
  }).catch(function () {});
})();
`;

const browserExtensionErrorFilterScript = `
(function () {
  var ignoredMessages = [
    'A listener indicated an asynchronous response by returning true',
    'The message channel closed before a response was received'
  ];

  function shouldIgnore(value) {
    var message = value && value.message ? value.message : String(value || '');
    return ignoredMessages.some(function (ignored) {
      return message.indexOf(ignored) !== -1;
    });
  }

  window.addEventListener('unhandledrejection', function (event) {
    if (shouldIgnore(event.reason)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);

  window.addEventListener('error', function (event) {
    if (shouldIgnore(event.error || event.message)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className="dark">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icons/pulse-icon-192.png" />
        <script dangerouslySetInnerHTML={{ __html: browserExtensionErrorFilterScript }} />
        {process.env.NODE_ENV !== 'production' && (
          <script dangerouslySetInnerHTML={{ __html: devServiceWorkerCleanupScript }} />
        )}
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
