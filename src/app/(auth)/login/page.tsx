'use client';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "@/components/auth/LoginForm";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { SupportDialog } from "@/components/auth/SupportDialog";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";

export default function LoginPage() {
  return (
    <div className="flex flex-col items-center gap-8">
      <Logo />
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Welcome Back</CardTitle>
          <CardDescription>Enter your username and password to sign in.</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
        <CardFooter>
          <Dialog>
            <div className="text-center text-sm text-muted-foreground w-full">
              Having trouble?{' '}
              <DialogTrigger asChild>
                <Button variant="link" className="p-0 h-auto">Contact Support</Button>
              </DialogTrigger>
            </div>
            <SupportDialog />
          </Dialog>
        </CardFooter>
      </Card>
    </div>
  );
}
