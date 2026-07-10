import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase';
import { ThemeProvider } from '@/components/ThemeProvider';
import { ImpersonationProvider } from '@/context/ImpersonationProvider';
import { MainAppLayout } from '@/components/layout/MainAppLayout';
import { Suspense } from 'react';

export const metadata: Metadata = {
<<<<<<< HEAD
  title: 'Basechan Staff',
  description: 'Staff Internal Control & Automation',
=======
  title: 'Basechan Team',
  description: 'Staff Internal Control & Automation',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
    shortcut: '/logo.png',
  },
>>>>>>> 8c2f2c7ee9c25fe21fb0f2e265f70b5d1d4e553a
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#101622',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet" />
      </head>
<<<<<<< HEAD
      <body className="font-body antialiased">
=======
      <body className="font-body antialiased" suppressHydrationWarning>
>>>>>>> 8c2f2c7ee9c25fe21fb0f2e265f70b5d1d4e553a
        <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
        >
            <FirebaseClientProvider>
              <ImpersonationProvider>
                <Suspense fallback={<div className="min-h-screen bg-background" />}>
                  <MainAppLayout>
                    {children}
                  </MainAppLayout>
                </Suspense>
                <Toaster />
              </ImpersonationProvider>
            </FirebaseClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
