'use client';
import { mainNavItems } from '@/lib/nav-items';
import { usePermissions } from '@/hooks/usePermissions';
import { useUser, useDoc, useMemoFirebase, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { uiEmitter } from '@/lib/ui-emitter';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export function PanelSwitcher() {
    const { user } = useUser();
    const firestore = useFirestore();
    const userProfileRef = useMemoFirebase(() => 
        firestore && user ? doc(firestore, 'users', user.uid) : null
    , [firestore, user]);
    const { data: userProfile } = useDoc<any>(userProfileRef);
    const permissions = usePermissions(userProfile);

    const handleSwitch = (item: any) => {
        uiEmitter.emit('close-all-dialogs');
        if ('href' in item) {
            window.location.href = item.href;
        } else if (item.dialog) {
            uiEmitter.emit(`open-${item.dialog}-dialog` as any);
        }
    };

    return (
        <div className="w-full border-b bg-card/20 backdrop-blur-sm">
            <ScrollArea className="w-full whitespace-nowrap">
                <div className="flex gap-4 p-4 md:px-8">
                    {mainNavItems.map((item, idx) => {
                        if ('isSeparator' in item) return null;
                        if ('permission' in item && userProfile && !permissions[item.permission as keyof typeof permissions]) return null;

                        return (
                            <Button
                                key={idx}
                                variant="outline"
                                className="h-16 w-32 flex flex-col items-center justify-center gap-1 rounded-xl bg-background/50 border-primary/20 hover:bg-primary/10 hover:border-primary transition-all group shrink-0"
                                onClick={() => handleSwitch(item)}
                            >
                                <item.icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground group-hover:text-foreground">{item.label}</span>
                            </Button>
                        );
                    })}
                </div>
                <ScrollBar orientation="horizontal" />
            </ScrollArea>
        </div>
    );
}
