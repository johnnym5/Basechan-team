
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useUser, useDoc, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { collection, query, where, orderBy, doc, deleteDoc } from 'firebase/firestore';
import type { UserProfile, ExternalDisplay } from '@/lib/types';
import { usePermissions } from '@/hooks/usePermissions';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
    MonitorDot, 
    Plus, 
    MoreVertical, 
    Trash2, 
    ArrowLeft, 
    ExternalLink,
    Maximize2,
    RefreshCw,
    Loader2,
    Layout
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { AddDashboardDialog } from './AddDashboardDialog';
import { cn } from '@/lib/utils';

export function WebDashboardPageContent({ initialPayload }: { initialPayload?: { displayId?: string } }) {
    const { user: authUser } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    const [selectedDisplayId, setSelectedDisplayId] = useState<string | null>(null);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [iframeKey, setIframeKey] = useState(0);

    const userProfileRef = useMemoFirebase(() => 
        firestore && authUser ? doc(firestore, 'users', authUser.uid) : null
    , [firestore, authUser]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);
    const permissions = usePermissions(userProfile);

    const displaysQuery = useMemoFirebase(() => {
        if (!firestore || !userProfile) return null;
        return query(
            collection(firestore, 'external_displays'),
            where('orgId', '==', userProfile.orgId),
            orderBy('createdAt', 'desc')
        );
    }, [firestore, userProfile]);

    const { data: displays, isLoading: isDisplaysLoading } = useCollection<ExternalDisplay>(displaysQuery);

    const selectedDisplay = useMemo(() => {
        if (!selectedDisplayId || !displays) return null;
        return displays.find(d => d.id === selectedDisplayId);
    }, [selectedDisplayId, displays]);

    useEffect(() => {
        if (initialPayload?.displayId) {
            setSelectedDisplayId(initialPayload.displayId);
        }
    }, [initialPayload]);

    const handleDelete = async (id: string, title: string) => {
        if (!firestore || !permissions.canManageDisplays) return;
        try {
            await deleteDoc(doc(firestore, 'external_displays', id));
            toast({ title: 'Display Terminated', description: `"${title}" has been removed.` });
            if (selectedDisplayId === id) setSelectedDisplayId(null);
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

    if (selectedDisplay) {
        return (
            <div className="flex flex-col h-[calc(100vh-6rem)] animate-in fade-in zoom-in-95 duration-500">
                <div className="flex items-center justify-between mb-4 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => setSelectedDisplayId(null)}>
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div>
                            <h2 className="text-xl font-bold font-headline">{selectedDisplay.title}</h2>
                            <p className="text-xs text-muted-foreground uppercase tracking-widest font-black">Live Data Stream</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" className="rounded-xl" onClick={() => setIframeKey(k => k + 1)}>
                            <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" className="rounded-xl" asChild>
                            <a href={selectedDisplay.url} target="_blank" rel="noopener noreferrer">
                                <Maximize2 className="h-4 w-4" />
                            </a>
                        </Button>
                    </div>
                </div>
                <div className="flex-1 rounded-3xl border border-white/10 overflow-hidden bg-black/20 shadow-2xl relative">
                    <iframe 
                        key={iframeKey}
                        src={selectedDisplay.url} 
                        className="w-full h-full border-none"
                        allowFullScreen
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-700">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-headline tracking-tight flex items-center gap-3">
                        <MonitorDot className="h-8 w-8 text-primary" />
                        Live Displays
                    </h1>
                    <p className="text-muted-foreground">Monitor real-time Excel dashboards, PowerBI reports, and web metrics.</p>
                </div>
                {permissions.canManageDisplays && (
                    <Button onClick={() => setIsAddOpen(true)} className="rounded-xl h-12 px-6 font-bold shadow-lg shadow-primary/20">
                        <Plus className="mr-2 h-5 w-5" /> Integrate Display
                    </Button>
                )}
            </div>

            {displays?.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 text-center opacity-40 border-2 border-dashed rounded-[3rem] bg-secondary/10">
                    <Layout className="h-20 w-20 mb-6" />
                    <h3 className="text-xl font-bold font-headline uppercase tracking-widest">No Active Feeds</h3>
                    <p className="text-sm max-w-xs mt-2 font-medium">Integrate your published Excel Online dashboards or web reports to see them here.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {displays?.map(display => (
                        <Card 
                            key={display.id} 
                            className="apple-glass group hover:bg-white/5 transition-all cursor-pointer overflow-hidden border-none"
                            onClick={() => setSelectedDisplayId(display.id)}
                        >
                            <CardHeader className="pb-4">
                                <div className="flex items-start justify-between">
                                    <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                                        <MonitorDot className="h-6 w-6" />
                                    </div>
                                    {permissions.canManageDisplays && (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="apple-glass-darker border-none">
                                                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDelete(display.id, display.title);
                                                }}>
                                                    <Trash2 className="mr-2 h-4 w-4" /> Terminate Stream
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    )}
                                </div>
                                <CardTitle className="mt-4 text-lg">{display.title}</CardTitle>
                                <CardDescription className="line-clamp-2 text-xs leading-relaxed">{display.description || 'No description provided.'}</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-2">
                                <div className="flex items-center justify-between mt-4">
                                    <span className="text-[10px] font-black uppercase tracking-tighter opacity-50 truncate max-w-[150px]">
                                        {display.url}
                                    </span>
                                    <div className="h-8 w-8 rounded-full bg-secondary/50 flex items-center justify-center">
                                        <ExternalLink className="h-3 w-3 text-muted-foreground" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <AddDashboardDialog 
                open={isAddOpen} 
                onOpenChange={setIsAddOpen} 
                userProfile={userProfile!} 
            />
        </div>
    );
}
