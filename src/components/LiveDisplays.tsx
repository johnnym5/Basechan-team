
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useUser, useDoc, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { collection, query, where, doc, deleteDoc, or, and } from 'firebase/firestore';
import type { UserProfile, ExternalDisplay } from '@/lib/types';
import { usePermissions } from '@/hooks/usePermissions';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
    MonitorDot, 
    Plus, 
    MoreVertical, 
    Trash2, 
    ExternalLink,
    Maximize2,
    RefreshCw,
    Globe,
    Lock,
    ShieldAlert,
    Grid,
    LayoutTemplate,
    Pencil
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { AddDashboardDialog } from './dashboards/AddDashboardDialog';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export function LiveDisplays({ initialPayload }: { initialPayload?: { displayId?: string } }) {
    const { user: authUser } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    const [gridLayout, setGridLayout] = useState<"1x1" | "2x2">("1x1");
    const [isAutoRefresh, setIsAutoRefresh] = useState(false);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [editDisplay, setEditDisplay] = useState<ExternalDisplay | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);

    const userProfileRef = useMemoFirebase(() => 
        firestore && authUser ? doc(firestore, 'users', authUser.uid) : null
    , [firestore, authUser]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);
    const permissions = usePermissions(userProfile);

    const displaysQuery = useMemoFirebase(() => {
        if (!firestore || !userProfile) return null;
        if (permissions.canManageDisplays) {
            return query(
                collection(firestore, 'external_displays'),
                where('orgId', '==', userProfile.orgId)
            );
        } else {
            return query(
                collection(firestore, 'external_displays'),
                and(
                    where('orgId', '==', userProfile.orgId),
                    or(
                        where('displayMode', '==', 'GLOBAL'),
                        where('createdBy', '==', userProfile.id)
                    )
                )
            );
        }
    }, [firestore, userProfile, permissions.canManageDisplays]);

    const { data: displays, isLoading: isDisplaysLoading } = useCollection<ExternalDisplay>(displaysQuery);

    const sortedDisplays = useMemo(() => {
        if (!displays) return [];
        return [...displays].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [displays]);

    // Auto-refresh logic
    useEffect(() => {
        if (!isAutoRefresh) return;
        const interval = setInterval(() => {
            setRefreshKey(k => k + 1);
        }, 60000); // Refresh every minute
        return () => clearInterval(interval);
    }, [isAutoRefresh]);

    const handleEdit = (display: ExternalDisplay) => {
        setEditDisplay(display);
        setIsAddOpen(true);
    };

    const handleDelete = async (id: string, title: string) => {
        if (!firestore) return;
        try {
            await deleteDoc(doc(firestore, 'external_displays', id));
            toast({ title: 'Display Terminated', description: `"${title}" has been removed.` });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        }
    };

    if (isProfileLoading || isDisplaysLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-10 w-64" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({length: 3}).map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-2xl" />)}
                </div>
            </div>
        );
    }

    if (!permissions.canAccessDisplays) {
        return (
             <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-background">
                <ShieldAlert className="w-16 h-16 text-destructive mb-4" />
                <h1 className="text-2xl font-bold font-headline text-foreground">Access Denied</h1>
                <p className="text-muted-foreground mt-2">The Live Displays module is currently disabled for your account or organization.</p>
              </div>
        );
    }

    return (
        <div className="flex flex-col h-full space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-700">

            {/* PAGE HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black font-headline tracking-tighter uppercase flex items-center gap-3">
                        <Globe className="h-8 w-8 text-primary" />
                        Live Displays
                    </h1>
                    <p className="text-sm text-muted-foreground font-medium">Monitor real-time documents, dashboards, and web-based telemetry nodes.</p>
                </div>

                {/* ACTION TOOLBAR */}
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setGridLayout(prev => prev === "1x1" ? "2x2" : "1x1")}
                        className="rounded-xl h-10 px-4 font-black uppercase text-[10px] tracking-widest border-border/50"
                    >
                        <Grid className="w-4 h-4 mr-2" /> Layout: {gridLayout}
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsAutoRefresh(!isAutoRefresh)}
                        className={cn(
                            "rounded-xl h-10 px-4 font-black uppercase text-[10px] tracking-widest border-border/50 transition-all",
                            isAutoRefresh ? "bg-primary/10 text-primary border-primary/20" : ""
                        )}
                    >
                        <RefreshCw className={cn("w-4 h-4 mr-2", isAutoRefresh && "animate-spin")} />
                        Auto-Refresh: {isAutoRefresh ? "On" : "Off"}
                    </Button>
                    {permissions.canManageDisplays && (
                        <Button
                            onClick={() => { setEditDisplay(null); setIsAddOpen(true); }}
                            className="rounded-xl h-10 px-6 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20 bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                            <Plus className="mr-2 h-4 w-4" /> Integrate Feed
                        </Button>
                    )}
                </div>
            </div>

            {/* PADDED BORDER SYSTEM (THE GLASS CARD) */}
            <div className="flex-1 bg-card/80 backdrop-blur-sm border border-border rounded-[2.5rem] shadow-2xl p-6 min-h-[60vh] flex flex-col overflow-hidden relative">

                {sortedDisplays.length === 0 ? (
                    /* PREMIUM EMPTY STATE */
                    <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-border/50 rounded-[2rem] p-12 text-center bg-background/30">
                        <div className="w-20 h-20 bg-secondary/50 rounded-full flex items-center justify-center mb-6 shadow-inner">
                            <LayoutTemplate className="w-10 h-10 text-muted-foreground opacity-50" />
                        </div>
                        <h3 className="text-xl font-black font-headline uppercase tracking-tight text-foreground mb-2">No Active Feeds</h3>
                        <p className="text-sm text-muted-foreground max-w-sm mb-8 font-medium leading-relaxed">
                            Integrate your Word Online docs, Excel dashboards, or any secure web tool to monitor them here in real-time.
                        </p>
                        {permissions.canManageDisplays && (
                            <Button
                                onClick={() => setIsAddOpen(true)}
                                className="h-12 px-8 rounded-2xl font-black uppercase text-[11px] tracking-widest bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                            >
                                Add Your First Feed
                            </Button>
                        )}
                    </div>
                ) : (
                    /* FEED GRID RENDERER */
                    <div className={cn(
                        "grid gap-6 flex-1 h-full overflow-y-auto pr-2 custom-scrollbar",
                        gridLayout === '2x2' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'
                    )}>
                        {sortedDisplays.map(feed => (
                            <FeedViewer
                                key={`${feed.id}-${refreshKey}`}
                                feed={feed}
                                canManage={permissions.canManageDisplays}
                                onEdit={() => handleEdit(feed)}
                                onDelete={() => handleDelete(feed.id, feed.title)}
                            />
                        ))}
                    </div>
                )}
            </div>

            <AddDashboardDialog 
                open={isAddOpen} 
                onOpenChange={setIsAddOpen} 
                userProfile={userProfile!} 
                editDisplay={editDisplay}
            />
        </div>
    );
}

function FeedViewer({
    feed,
    canManage,
    onEdit,
    onDelete
}: {
    feed: ExternalDisplay;
    canManage: boolean;
    onEdit: () => void;
    onDelete: () => void;
}) {
    return (
        <div className="relative rounded-[2rem] overflow-hidden border border-border/50 group bg-background/50 shadow-sm transition-all hover:border-primary/30 min-h-[450px] flex flex-col">
            {/* Overlay Header for Feed Name & Actions */}
            <div className="absolute top-0 w-full bg-background/90 backdrop-blur-md text-[10px] p-3 flex justify-between items-center border-b border-border/50 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="font-black uppercase tracking-widest text-foreground">{feed.title}</span>
                    {feed.displayMode === 'PRIVATE' && <Lock className="w-3 h-3 text-muted-foreground" />}
                </div>
                <div className="flex items-center gap-2">
                    {canManage && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-secondary">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="apple-glass-darker border-none">
                                <DropdownMenuItem onClick={onEdit} className="text-[10px] font-bold uppercase tracking-widest p-3">
                                    <Pencil className="mr-2 h-3.5 w-3.5" /> Edit Parameters
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={onDelete} className="text-[10px] font-bold uppercase tracking-widest p-3 text-destructive focus:text-destructive">
                                    <Trash2 className="mr-2 h-3.5 w-3.5" /> Terminate Link
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-secondary" asChild>
                        <a href={feed.url} target="_blank" rel="noopener noreferrer">
                            <Maximize2 className="h-4 w-4" />
                        </a>
                    </Button>
                </div>
            </div>

            {/* SECURE IFRAME */}
            <div className="flex-1 w-full relative bg-black/5">
                <iframe
                    src={feed.url}
                    className="w-full h-full border-none"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                    title={feed.title}
                    allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                />
            </div>

            {/* Footer Status Bar */}
            <div className="bg-secondary/20 border-t border-border/50 px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Globe className="w-3 h-3 text-muted-foreground" />
                    <span className="text-[9px] font-mono opacity-40 truncate max-w-[200px]">{feed.url}</span>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[8px] h-4 font-black px-1.5 border-border/50">
                        {feed.displayMode}
                    </Badge>
                </div>
            </div>
        </div>
    );
}
