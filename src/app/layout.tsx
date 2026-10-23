import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { ToastProvider } from '@/components/ui/Toast';
import BottomNavWrapper from '@/components/ui/BottomNavWrapper';

export const metadata: Metadata = {
  title: 'Gold Haven Rewards | Win Cashback on Premium Dry Fruits',
  description:
    'Scan the QR code under the jar lid, enter your unique code and win instant cashback of ₹1 to ₹5 in your wallet. Withdraw directly to UPI.',
  manifest: '/manifest.json',
  icons: {
    icon: '/logo.png',
    apple: '/icons/icon-192x192.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Gold Haven Rewards',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#1c1c1f',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;0,800;1,600&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="bg-[var(--bg-base)] text-[var(--text-primary)] antialiased min-h-screen flex flex-col">
        <AuthProvider>
          <ToastProvider>
            <main className="flex-1 w-full max-w-md mx-auto relative flex flex-col">
              {children}
            </main>
            <BottomNavWrapper />
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
