
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useUser, useDoc, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { collection, query, where, orderBy, doc, deleteDoc } from 'firebase/firestore';
import type { UserProfile, ExternalDisplay } from '@/lib/types';
import { usePermissions } from '@/hooks/usePermissions';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
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
    Layout,
    Globe,
    Layers,
    Pencil,
    ListOrdered,
    ArrowDownAZ,
    ArrowUpAZ,
    Clock,
    Check,
    Search
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { AddDashboardDialog } from './AddDashboardDialog';
import { cn } from '@/lib/utils';
import { ScrollArea } from '../ui/scroll-area';

export function WebDashboardPageContent({ initialPayload }: { initialPayload?: { displayId?: string } }) {
    const { user: authUser } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    const [selectedDisplayId, setSelectedDisplayId] = useState<string | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [displayToEdit, setDisplayToEdit] = useState<ExternalDisplay | null>(null);
    const [iframeKey, setIframeKey] = useState(0);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortOption, setSortOption] = useState<{ field: 'createdAt' | 'title'; direction: 'asc' | 'desc' }>({ field: 'createdAt', direction: 'desc' });

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
            orderBy(sortOption.field, sortOption.direction)
        );
    }, [firestore, userProfile, sortOption]);

    const { data: displays, isLoading: isDisplaysLoading } = useCollection<ExternalDisplay>(displaysQuery);

    const filteredDisplays = useMemo(() => {
        if (!displays) return [];
        if (!searchTerm.trim()) return displays;

        const lowercasedFilter = searchTerm.toLowerCase();
        return displays.filter(display =>
            display.title.toLowerCase().includes(lowercasedFilter) ||
            (display.description && display.description.toLowerCase().includes(lowercasedFilter))
        );
    }, [displays, searchTerm]);

    const selectedDisplay = useMemo(() => {
        if (!selectedDisplayId || !displays) return null;
        return displays.find(d => d.id === selectedDisplayId);
    }, [selectedDisplayId, displays]);

    useEffect(() => {
        if (initialPayload?.displayId) {
            setSelectedDisplayId(initialPayload.displayId);
        }
    }, [initialPayload]);

    const toggleSelection = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const areAllFilteredSelected = filteredDisplays.length > 0 && filteredDisplays.every(d => selectedIds.includes(d.id));

    const toggleSelectAll = () => {
        const filteredIds = filteredDisplays.map(d => d.id);
        if (areAllFilteredSelected) {
            setSelectedIds(prev => prev.filter(id => !filteredIds.includes(id)));
        } else {
            setSelectedIds(prev => [...new Set([...prev, ...filteredIds])]);
        }
    };

    const handleBulkDelete = async () => {
        if (!firestore || !permissions.canManageDisplays || selectedIds.length === 0) return;

        if (!window.confirm(`Are you sure you want to terminate ${selectedIds.length} selected feed(s)?`)) {
            return;
        }

        try {
            const deletePromises = selectedIds.map(id => deleteDoc(doc(firestore, 'external_displays', id)));
            await Promise.all(deletePromises);
            toast({ title: 'Feeds Terminated', description: `${selectedIds.length} feed(s) have been removed.` });
            setSelectedIds([]);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        }
    };

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
                    {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-2xl" />)}
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
                        {/* Display Switcher for easy jumping between feeds */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="rounded-xl gap-2">
                                    <Layers className="h-4 w-4" />
                                    <span className="hidden sm:inline">Switch Feed</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="apple-glass-darker border-none w-64">
                                <ScrollArea className="h-64">
                                    <div className="p-1 space-y-1">
                                        {displays?.map(d => (
                                            <DropdownMenuItem
                                                key={d.id}
                                                onClick={() => setSelectedDisplayId(d.id)}
                                                className={cn(
                                                    "rounded-lg cursor-pointer",
                                                    d.id === selectedDisplayId && "bg-primary/10 text-primary font-bold"
                                                )}
                                            >
                                                <MonitorDot className="h-4 w-4 mr-2" />
                                                <span className="truncate">{d.title}</span>
                                            </DropdownMenuItem>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </DropdownMenuContent>
                        </DropdownMenu>

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
                        <Globe className="h-8 w-8 text-primary" />
                        Live Displays
                    </h1>
                    <p className="text-muted-foreground">Monitor real-time documents, dashboards, and web-based telemetry nodes.</p>
                </div>
                {permissions.canManageDisplays && (
                    <Button onClick={() => { setDisplayToEdit(null); setIsFormOpen(true); }} className="rounded-xl h-12 px-6 font-bold shadow-lg shadow-primary/20 shrink-0">
                        <Plus className="mr-2 h-5 w-5" /> Integrate Feed
                    </Button>
                )}
            </div>

            <div className="flex flex-col md:flex-row items-center gap-4">
                <div className="relative w-full md:max-w-sm">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search feeds..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="rounded-xl h-12 pl-10 w-full bg-background/50 border-white/5"
                    />
                </div>
                <div className="flex-1" /> {/* Spacer */}
                <div className="flex items-center gap-2 self-end md:self-center">
                    {filteredDisplays.length > 0 && permissions.canManageDisplays && (
                        <div className="flex items-center gap-4">
                            {selectedIds.length > 0 && (
                                <Button variant="destructive" onClick={handleBulkDelete} className="rounded-xl h-12 animate-in fade-in zoom-in-95">
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete ({selectedIds.length})
                                </Button>
                            )}
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="select-all"
                                    checked={!!areAllFilteredSelected}
                                    onCheckedChange={toggleSelectAll}
                                    aria-label="Select all"
                                />
                                <label htmlFor="select-all" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
                                    All
                                </label>
                            </div>
                        </div>
                    )}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="rounded-xl h-12 gap-2">
                                <ListOrdered className="h-5 w-5" />
                                <span className="hidden sm:inline">Sort by</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="apple-glass-darker border-none">
                            <DropdownMenuItem onClick={() => setSortOption({ field: 'createdAt', direction: 'desc' })}>
                                <Clock className="mr-2 h-4 w-4" />
                                <span>Date (Newest)</span>
                                {sortOption.field === 'createdAt' && sortOption.direction === 'desc' && <Check className="ml-auto h-4 w-4" />}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSortOption({ field: 'createdAt', direction: 'asc' })}>
                                <Clock className="mr-2 h-4 w-4" />
                                <span>Date (Oldest)</span>
                                {sortOption.field === 'createdAt' && sortOption.direction === 'asc' && <Check className="ml-auto h-4 w-4" />}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSortOption({ field: 'title', direction: 'asc' })}>
                                <ArrowDownAZ className="mr-2 h-4 w-4" />
                                <span>Title (A-Z)</span>
                                {sortOption.field === 'title' && sortOption.direction === 'asc' && <Check className="ml-auto h-4 w-4" />}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSortOption({ field: 'title', direction: 'desc' })}>
                                <ArrowUpAZ className="mr-2 h-4 w-4" />
                                <span>Title (Z-A)</span>
                                {sortOption.field === 'title' && sortOption.direction === 'desc' && <Check className="ml-auto h-4 w-4" />}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {displays && displays.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 text-center opacity-40 border-2 border-dashed rounded-[3rem] bg-secondary/10">
                    <Layout className="h-20 w-20 mb-6" />
                    <h3 className="text-xl font-bold font-headline uppercase tracking-widest">No Active Feeds</h3>
                    <p className="text-sm max-w-xs mt-2 font-medium">
                        {permissions.canManageDisplays
                            ? "Integrate your Word Online docs, Excel dashboards, or any secure web tool to see them here."
                            : "No dashboards have been published by the administration yet."}
                    </p>
                </div>
            ) : filteredDisplays.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 text-center opacity-40 border-2 border-dashed rounded-[3rem] bg-secondary/10">
                    <Search className="h-20 w-20 mb-6" />
                    <h3 className="text-xl font-bold font-headline uppercase tracking-widest">No Feeds Found</h3>
                    <p className="text-sm max-w-xs mt-2 font-medium">Your search for "{searchTerm}" did not match any feeds.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredDisplays.map(display => (
                        <Card
                            key={display.id}
                            className={cn(
                                "apple-glass group hover:bg-white/5 transition-all cursor-pointer overflow-hidden border-none",
                                selectedIds.includes(display.id) && "ring-2 ring-primary"
                            )}
                            onClick={() => setSelectedDisplayId(display.id)}
                        >
                            <CardHeader className="pb-4">
                                <div className="flex items-start justify-between">
                                    <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                                        <MonitorDot className="h-6 w-6" />
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {permissions.canManageDisplays && (
                                            <Checkbox
                                                checked={selectedIds.includes(display.id)}
                                                onCheckedChange={() => toggleSelection(display.id)}
                                                onClick={(e) => e.stopPropagation()}
                                                aria-label={`Select ${display.title}`}
                                                className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity data-[state=checked]:opacity-100"
                                            />
                                        )}
                                        {permissions.canManageDisplays && (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="apple-glass-darker border-none">
                                                    <DropdownMenuItem onClick={(e) => {
                                                        e.stopPropagation();
                                                        setDisplayToEdit(display);
                                                        setIsFormOpen(true);
                                                    }}>
                                                        <Pencil className="mr-2 h-4 w-4" /> Edit Details
                                                    </DropdownMenuItem>
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

            {permissions.canManageDisplays && (
                <AddDashboardDialog
                    open={isFormOpen}
                    onOpenChange={(open) => {
                        setIsFormOpen(open);
                        if (!open) setDisplayToEdit(null);
                    }}
                    userProfile={userProfile!}
                    displayToEdit={displayToEdit}
                />
            )}
        </div>
    );
}
