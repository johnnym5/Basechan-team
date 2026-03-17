'use client';

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // This layout is now just a wrapper for styling, as login is handled in a dialog.
    return (
        <main className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
            {children}
        </main>
    );
}
