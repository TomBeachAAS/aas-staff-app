import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AAS Staff Portal',
  description: 'Autonomous Agri Solutions — Staff Management',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'AAS Staff',
    startupImage: '/icons/icon-512.png',
  },
  icons: {
    apple: '/icons/icon-192.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#1B4F8A',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased bg-gray-50 text-gray-900">
        {children}
      </body>
    </html>
  );
}
