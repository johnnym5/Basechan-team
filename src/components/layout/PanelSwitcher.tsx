'use client';
import { mainNavItems } from '@/lib/nav-items';
import { usePermissions } from '@/hooks/usePermissions';
import { useUser, useDoc, useMemoFirebase, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { uiEmitter } from '@/lib/ui-emitter';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useRouter } from 'next/navigation';
import type { UserProfile } from '@/lib/types';

export function PanelSwitcher() {
    const { user } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    const userProfileRef = useMemoFirebase(() => 
        firestore && user ? doc(firestore, 'users', user.uid) : null
    , [firestore, user]);
    const { data: userProfile } = useDoc<UserProfile>(userProfileRef);
    const permissions = usePermissions(userProfile);

    const handleSwitch = (item: any) => {
        uiEmitter.emit('close-all-dialogs');
        if ('href' in item) {
            router.push(item.href);
        } else if (item.dialog) {
            // Small delay to allow the current panel to retract smoothly
            setTimeout(() => {
                uiEmitter.emit(`open-${item.dialog}-dialog` as any);
            }, 100);
        }
    };

    return (
        <div className="w-full border-b bg-card/20 backdrop-blur-sm">
            <ScrollArea className="w-full whitespace-nowrap">
                <div className="flex gap-3 p-4 md:px-8">
                    {mainNavItems.map((item, idx) => {
                        if ('isSeparator' in item) return null;
                        if ('permission' in item && userProfile && !permissions[item.permission as keyof typeof permissions]) return null;

                        return (
                            <Button
                                key={idx}
                                variant="outline"
                                className="h-14 w-28 md:h-16 md:w-32 flex flex-col items-center justify-center gap-1 rounded-xl bg-background/50 border-primary/20 hover:bg-primary/10 hover:border-primary transition-all group shrink-0"
                                onClick={() => handleSwitch(item)}
                            >
                                <item.icon className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                                <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-muted-foreground group-hover:text-foreground">{item.label}</span>
                            </Button>
                        );
                    })}
                </div>
                <ScrollBar orientation="horizontal" />
            </ScrollArea>
        </div>
    );
}
