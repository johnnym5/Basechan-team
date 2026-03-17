'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Logo } from '@/components/Logo';

export default function LoginPage() {
  const router = useRouter();
  
  useEffect(() => {
    // The login page is no longer used directly. Redirect to the main page.
    router.replace('/');
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center text-center gap-8">
      <Logo />
      <div className="flex items-center gap-4 mt-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Redirecting to the main app...</p>
      </div>
    </div>
  );
}
