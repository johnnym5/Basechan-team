'use client';
import { useUser, useDoc, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { useState, useEffect, useCallback } from 'react';
import { BookCopy } from 'lucide-react';
import { doc, collection, query, where, limit } from 'firebase/firestore';
import type { UserProfile, Attendance } from '@/lib/types';
import { useSystemConfig } from '@/hooks/useSystemConfig';
import { hexToHslString, cn } from '@/lib/utils';
import { useTheme } from 'next-themes';
import { BottomNavBar } from '@/components/layout/BottomNavBar';
import AppHeader from '@/components/layout/AppHeader';
import { uiEmitter } from '@/lib/ui-emitter';
import { Button } from '@/components/ui/button';
import { usePermissions } from '@/hooks/usePermissions';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { AuthDialog } from '@/components/auth/AuthDialog';
import { format } from 'date-fns';
import { mainNavItems } from '@/lib/nav-items';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useIdleTimer } from '@/hooks/useIdleTimer';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

// Heavy dialogs are grouped into a single dynamically loaded component
const GlobalDialogs = dynamic(() => import('@/components/layout/GlobalDialogs').then(m => m.GlobalDialogs), { 
  ssr: false,
  loading: () => null
});

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { theme } = useTheme();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
  const [isAnyDialogOpen, setIsAnyDialogOpen] = useState(false);
  const [today, setToday] = useState('');

  const isLoggedIn = !!user;

  useEffect(() => {
    if (isLoggedIn) setIsAuthDialogOpen(false);
  }, [isLoggedIn]);

  useEffect(() => {
      setToday(format(new Date(), 'yyyy-MM-dd'));
  }, []);

  const userProfileRef = useMemoFirebase(() => 
    firestore && user ? doc(firestore, 'users', user.uid) : null
  , [firestore, user]);
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);
  
  const attendanceQuery = useMemoFirebase(() => {
    if (!user || !firestore || !today) return null;
    return query(
      collection(firestore, 'attendance'),
      where('userId', '==', user.uid),
      where('date', '==', today),
      limit(1)
    );
  }, [user, firestore, today]);
  const { data: attendanceData } = useCollection<Attendance>(attendanceQuery);
  const attendanceRecord = attendanceData?.[0] || null;

  // Global Idle Tracking
  const { isIdle } = useIdleTimer(attendanceRecord);

  const permissions = usePermissions(userProfile);
  const { config } = useSystemConfig(userProfile?.orgId);

  useEffect(() => {
    const root = document.documentElement;
    const defaultPrimary = '222 83% 53%';
    const defaultAccent = '217.2 32.6% 17.5%';
    
    if (config?.branding_color) {
      const hslString = hexToHslString(config.branding_color);
      if (hslString) root.style.setProperty('--primary', hslString);
    } else {
      root.style.setProperty('--primary', defaultPrimary);
    }

    if (config?.accent_color) {
      const hslString = hexToHslString(config.accent_color);
      if (hslString) root.style.setProperty('--accent', hslString);
    } else {
      root.style.setProperty('--accent', defaultAccent);
    }
  }, [config, theme]);

  const handleDialogClick = (dialog: string) => {
    uiEmitter.emit(`open-${dialog}-dialog` as any);
  };

  return (
    <>
      <AuthDialog open={isAuthDialogOpen} onOpenChange={setIsAuthDialogOpen} />

      <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
        <SheetContent side="left" className="p-0 w-72 md:hidden">
            <VisuallyHidden>
              <SheetHeader>
                <SheetTitle>Main Menu</SheetTitle>
                <SheetDescription>Navigation links for the application.</SheetDescription>
              </SheetHeader>
            </VisuallyHidden>
            <div className="flex flex-col h-full bg-background">
                <div className="p-6 border-b flex items-center gap-2">
                    <BookCopy className="h-6 w-6 text-primary" />
                    <h2 className="font-bold text-lg">Basechan Staff</h2>
                </div>
                <ScrollArea className="flex-1">
                    <div className="p-4 space-y-2">
                         {mainNavItems.map((item, idx) => {
                            if ('isSeparator' in item) return <div key={idx} className="h-px bg-border my-2" />;
                            if ('permission' in item && userProfile && !permissions[item.permission as keyof typeof permissions]) return null;

                            return (
                                <Button
                                    key={item.label}
                                    variant="ghost"
                                    className="w-full justify-start gap-3"
                                    onClick={() => {
                                        setIsMobileSidebarOpen(false);
                                        if ('href' in item) {
                                            router.push(item.href);
                                        } else {
                                            handleDialogClick(item.dialog!);
                                        }
                                    }}
                                >
                                    <item.icon className="h-5 w-5" />
                                    {item.label}
                                </Button>
                            );
                        })}
                    </div>
                </ScrollArea>
            </div>
        </SheetContent>
      </Sheet>

      <div className="relative min-h-screen flex flex-col bg-background">
            <AppHeader
                userProfile={userProfile || null}
                onMenuClick={() => setIsMobileSidebarOpen(true)}
                isLoggedIn={isLoggedIn}
                attendanceRecord={attendanceRecord}
                systemConfig={config || null}
            />
            <main className={cn(
                "flex-1 transition-all duration-500 ease-in-out",
                isAnyDialogOpen ? "md:scale-[0.98] md:px-6" : "w-full md:px-10",
                "py-6 pb-28 md:pb-10 min-h-screen"
            )}>
                {children}
            </main>
            {isLoggedIn && <BottomNavBar onFabClick={() => uiEmitter.emit('open-fab-menu' as any)} />}
      </div>

      {isLoggedIn && userProfile && (
        <GlobalDialogs 
            userProfile={userProfile} 
            permissions={permissions} 
            onAnyDialogOpenChange={setIsAnyDialogOpen}
        />
      )}
    </>
  );
}