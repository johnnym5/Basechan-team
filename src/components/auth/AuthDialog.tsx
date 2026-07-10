<<<<<<< HEAD
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LoginForm } from './LoginForm';
import { SupportDialog } from './SupportDialog';
import { Button } from '../ui/button';

interface AuthDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function AuthDialog({ open, onOpenChange }: AuthDialogProps) {
    const [isSupportOpen, setIsSupportOpen] = useState(false);

    // When the main auth dialog closes, also close the support one if it's open.
    const handleMainOpenChange = (isOpen: boolean) => {
        if (!isOpen) {
            setIsSupportOpen(false);
        }
        onOpenChange(isOpen);
    }

    return (
        <>
            <Dialog open={open} onOpenChange={handleMainOpenChange}>
                <DialogContent className="sm:max-w-md">
                     <DialogHeader>
                        <DialogTitle>Welcome Back</DialogTitle>
                        <DialogDescription>Enter your credentials to access your dashboard.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <LoginForm />
                    </div>
                    <div className="text-center text-sm text-muted-foreground pt-4 border-t">
                        Having trouble?{' '}
                        <Button variant="link" className="p-0 h-auto" onClick={() => setIsSupportOpen(true)}>Contact Support</Button>
                    </div>
                </DialogContent>
            </Dialog>
            
            <Dialog open={isSupportOpen} onOpenChange={setIsSupportOpen}>
                 <SupportDialog />
            </Dialog>
        </>
    );
}
=======
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LoginForm } from './LoginForm';
import { SupportDialog } from './SupportDialog';
import { Button } from '../ui/button';

interface AuthDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function AuthDialog({ open, onOpenChange }: AuthDialogProps) {
    const [isSupportOpen, setIsSupportOpen] = useState(false);

    // When the main auth dialog closes, also close the support one if it's open.
    const handleMainOpenChange = (isOpen: boolean) => {
        if (!isOpen) {
            setIsSupportOpen(false);
        }
        onOpenChange(isOpen);
    }

    return (
        <>
            <Dialog open={open} onOpenChange={handleMainOpenChange}>
                <DialogContent className="sm:max-w-md">
                     <DialogHeader>
                        <DialogTitle>Welcome Back</DialogTitle>
                        <DialogDescription>Enter your credentials to access your dashboard.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <LoginForm />
                    </div>
                    <div className="text-center text-sm text-muted-foreground pt-4 border-t">
                        Having trouble?{' '}
                        <Button variant="link" className="p-0 h-auto" onClick={() => setIsSupportOpen(true)}>Contact Support</Button>
                    </div>
                </DialogContent>
            </Dialog>
            
            <Dialog open={isSupportOpen} onOpenChange={setIsSupportOpen}>
                 <SupportDialog />
            </Dialog>
        </>
    );
}
>>>>>>> 8c2f2c7ee9c25fe21fb0f2e265f70b5d1d4e553a
