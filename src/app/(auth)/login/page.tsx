
'use client';
import { Logo } from '@/components/Logo';
import { LoginForm } from '@/components/auth/LoginForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SupportDialog } from '@/components/auth/SupportDialog';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { Dialog } from '@/components/ui/dialog';

export default function LoginPage() {
  const [isSupportOpen, setIsSupportOpen] = useState(false);

  return (
    <>
      <div className="absolute top-8 left-8">
        <Logo />
      </div>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Welcome Back</CardTitle>
          <CardDescription>Enter your credentials to access your dashboard.</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
           <div className="text-center text-sm text-muted-foreground pt-4 mt-4 border-t">
              Having trouble?{' '}
              <Button variant="link" className="p-0 h-auto" onClick={() => setIsSupportOpen(true)}>Contact Support</Button>
          </div>
        </CardContent>
      </Card>
       <Dialog open={isSupportOpen} onOpenChange={setIsSupportOpen}>
          <SupportDialog />
      </Dialog>
    </>
  );
}
