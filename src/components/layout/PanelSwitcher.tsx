'use client';
import { mainNavItems } from '@/lib/nav-items';
import { usePermissions } from '@/hooks/usePermissions';
import { useUser, useDoc, useMemoFirebase, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { uiEmitter } from '@/lib/ui-emitter';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useRouter, useSearchParams } from 'next/navigation';
import type { UserProfile } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useRef } from 'react';

interface PanelSwitcherProps {
    isVertical?: boolean;
}

export function PanelSwitcher({ isVertical }: PanelSwitcherProps) {
    const { user } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    const searchParams = useSearchParams();
    const longPressTimer = useRef<NodeJS.Timeout | null>(null);

    const userProfileRef = useMemoFirebase(() => 
        firestore && user ? doc(firestore, 'users', user.uid) : null
    , [firestore, user]);
    const { data: userProfile } = useDoc<UserProfile>(userProfileRef);
    const permissions = usePermissions(userProfile);

    const handleSwitch = (item: any, modal = false) => {
        uiEmitter.emit('close-all-dialogs');
        if ('href' in item && !modal) {
            router.push(item.href);
        } else if (item.dialog) {
            setTimeout(() => {
                uiEmitter.emit(`open-${item.dialog}-dialog` as any, { modal });
            }, 50);
        }
    };

    const handleContextMenu = (e: React.MouseEvent, item: any) => {
        e.preventDefault();
        handleSwitch(item, true);
    };

    const handleTouchStart = (item: any) => {
        longPressTimer.current = setTimeout(() => {
            handleSwitch(item, true);
        }, 600);
    };

    const handleTouchEnd = () => {
        if (longPressTimer.current) clearTimeout(longPressTimer.current);
    };

    if (isVertical) {
        return (
            <TooltipProvider delayDuration={0}>
                <div className="flex flex-col gap-2 w-full">
                    {mainNavItems.map((item, idx) => {
                        if ('isSeparator' in item) return <div key={idx} className="h-px bg-white/5 my-2 mx-2" />;
                        if ('permission' in item && userProfile && !permissions[item.permission as keyof typeof permissions]) return null;

                        const isActive = searchParams.get('panel') === item.dialog;

                        return (
                            <Tooltip key={idx}>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className={cn(
                                            "h-11 w-full justify-start gap-3 rounded-xl transition-all group border-none shadow-none",
                                            isActive 
                                                ? "bg-primary/20 text-primary" 
                                                : "bg-transparent hover:bg-primary/10 text-muted-foreground"
                                        )}
                                        onClick={() => handleSwitch(item, false)}
                                        onContextMenu={(e) => handleContextMenu(e, item)}
                                        onTouchStart={() => handleTouchStart(item)}
                                        onTouchEnd={handleTouchEnd}
                                    >
                                        <item.icon className={cn("h-5 w-5 shrink-0 transition-colors", isActive ? "text-primary" : "group-hover:text-primary")} />
                                        <span className={cn(
                                            "text-[10px] font-black uppercase tracking-widest transition-opacity duration-300 overflow-hidden whitespace-nowrap",
                                            "opacity-0 group-hover:opacity-100"
                                        )}>
                                            {item.label}
                                        </span>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="apple-glass-darker border-none px-3 py-1.5 text-[10px] font-black uppercase tracking-widest">
                                    {item.label} (R-Click for Modal)
                                </TooltipContent>
                            </Tooltip>
                        );
                    })}
                </div>
            </TooltipProvider>
        )
    }

    return (
        <div className="w-full bg-transparent">
            <ScrollArea className="w-full whitespace-nowrap">
                <div className="flex gap-2 p-3 px-4 md:px-8">
                    {mainNavItems.map((item, idx) => {
                        if ('isSeparator' in item) return null;
                        if ('permission' in item && userProfile && !permissions[item.permission as keyof typeof permissions]) return null;

                        const isActive = searchParams.get('panel') === item.dialog;

                        return (
                            <Button
                                key={idx}
                                variant="outline"
                                className={cn(
                                    "h-10 px-4 flex items-center gap-2 rounded-xl transition-all group shrink-0 border-white/5",
                                    isActive 
                                        ? "bg-primary/20 text-primary border-primary/30 shadow-lg shadow-primary/10" 
                                        : "bg-background/40 hover:bg-primary/10 hover:border-primary/20"
                                )}
                                onClick={() => handleSwitch(item, false)}
                                onContextMenu={(e) => handleContextMenu(e, item)}
                                onTouchStart={() => handleTouchStart(item)}
                                onTouchEnd={handleTouchEnd}
                            >
                                <item.icon className={cn("h-4 w-4 transition-colors", isActive ? "text-primary" : "text-muted-foreground group-hover:text-primary")} />
                                <span className={cn(
                                    "text-[9px] font-black uppercase tracking-widest",
                                    isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                                )}>
                                    {item.label}
                                </span>
                            </Button>
                        );
                    })}
                </div>
                <ScrollBar orientation="horizontal" className="hidden" />
            </ScrollArea>
        </div>
    );
}
