import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase';
import { ThemeProvider } from '@/components/ThemeProvider';
import { ImpersonationProvider } from '@/context/ImpersonationProvider';
import { SuperAdminModeProvider } from '@/context/SuperAdminModeProvider';
import { MainAppLayout } from '@/components/layout/MainAppLayout';
import { Suspense } from 'react';
import { CloseToDashboardButton } from '@/components/layout/CloseToDashboardButton';
import { QueryClientProvider } from '@/components/providers/QueryClientProvider';

export const metadata: Metadata = {
  title: 'Basechan Team',
  description: 'Staff Internal Control & Automation',
  icons: {
    icon: '/favicon.png',
    apple: '/favicon.png',
    shortcut: '/favicon.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0b121e', // Matches Dark Mode Pastel Navy background (hsl(215, 45%, 8%))
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&family=Space+Grotesk:wght@300..700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet" />
      </head>
      <body className="font-body antialiased" suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <FirebaseClientProvider>
            <QueryClientProvider>
              <ImpersonationProvider>
                <SuperAdminModeProvider>
                  <Suspense fallback={<div className="min-h-screen bg-background" />}>
                    <MainAppLayout>
                      {children}
                    </MainAppLayout>
                  </Suspense>
                  <Toaster />
                  <CloseToDashboardButton />
                </SuperAdminModeProvider>
              </ImpersonationProvider>
            </QueryClientProvider>
          </FirebaseClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
