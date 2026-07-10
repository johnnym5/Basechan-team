<<<<<<< HEAD

'use client';

import { useState, useMemo } from 'react';
import { useUser, useDoc, useFirestore, useMemoFirebase, useCollection, addDocumentNonBlocking } from '@/firebase';
import { collection, query, where, orderBy, doc, deleteDoc } from 'firebase/firestore';
import type { UserProfile, LibraryItem } from '@/lib/types';
import { usePermissions } from '@/hooks/usePermissions';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
    Folder, 
    FileText, 
    Upload, 
    Plus, 
    MoreVertical, 
    Trash2, 
    ArrowLeft, 
    Search,
    BookOpen,
    Download,
    Loader2
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { useFileUpload } from '@/hooks/useFileUpload';
import { Progress } from '@/components/ui/progress';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export function LibraryPageContent() {
    const { user: authUser } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const { isUploading, uploadProgress, uploadFile } = useFileUpload();

    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isCreatingFolder, setIsCreatingFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');

    const userProfileRef = useMemoFirebase(() => 
        firestore && authUser ? doc(firestore, 'users', authUser.uid) : null
    , [firestore, authUser]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);
    const permissions = usePermissions(userProfile);

    const itemsQuery = useMemoFirebase(() => {
        if (!firestore || !userProfile) return null;
        return query(
            collection(firestore, 'library_items'),
            where('orgId', '==', userProfile.orgId),
            orderBy('createdAt', 'desc')
        );
    }, [firestore, userProfile]);

    const { data: allItems, isLoading: isItemsLoading } = useCollection<LibraryItem>(itemsQuery);

    const currentItems = useMemo(() => {
        if (!allItems) return [];
        return allItems.filter(item => (item.parentFolderId || null) === currentFolderId);
    }, [allItems, currentFolderId]);

    const filteredItems = useMemo(() => {
        if (!searchTerm) return currentItems;
        const term = searchTerm.toLowerCase();
        // If searching, search globally across all items, not just current folder
        return (allItems || []).filter(item => 
            item.name.toLowerCase().includes(term) ||
            item.creatorName.toLowerCase().includes(term)
        );
    }, [currentItems, allItems, searchTerm]);

    const currentFolder = useMemo(() => {
        if (!currentFolderId || !allItems) return null;
        return allItems.find(item => item.id === currentFolderId);
    }, [currentFolderId, allItems]);

    const handleCreateFolder = async () => {
        if (!newFolderName.trim() || !userProfile || !firestore) return;
        setIsCreatingFolder(true);
        try {
            const newItem: Omit<LibraryItem, 'id'> = {
                orgId: userProfile.orgId,
                name: newFolderName.trim(),
                type: 'FOLDER',
                parentFolderId: currentFolderId,
                createdBy: userProfile.id,
                creatorName: userProfile.fullName,
                createdAt: new Date().toISOString(),
            };
            await addDocumentNonBlocking(collection(firestore, 'library_items'), newItem);
            setNewFolderName('');
            setIsCreatingFolder(false);
            toast({ title: 'Folder Created', description: `"${newFolderName}" has been added.` });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        } finally {
            setIsCreatingFolder(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !userProfile || !firestore) return;

        try {
            const filePath = `library/${userProfile.orgId}/${Date.now()}_${file.name}`;
            const downloadUrl = await uploadFile(file, filePath);

            const newItem: Omit<LibraryItem, 'id'> = {
                orgId: userProfile.orgId,
                name: file.name,
                type: 'FILE',
                parentFolderId: currentFolderId,
                url: downloadUrl,
                mimeType: file.type,
                size: file.size,
                createdBy: userProfile.id,
                creatorName: userProfile.fullName,
                createdAt: new Date().toISOString(),
            };

            await addDocumentNonBlocking(collection(firestore, 'library_items'), newItem);
            toast({ title: 'File Uploaded', description: `"${file.name}" is now available.` });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Upload Failed', description: e.message });
        } finally {
            // Reset input
            e.target.value = '';
        }
    };

    const handleDeleteItem = async (item: LibraryItem) => {
        if (!firestore || !permissions.canManageLibrary) return;
        try {
            await deleteDoc(doc(firestore, 'library_items', item.id));
            toast({ title: 'Item Removed', description: `${item.name} deleted.` });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        }
    };

    if (isProfileLoading || isItemsLoading) {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <Skeleton className="h-10 w-64" />
                    <Skeleton className="h-10 w-32" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {Array.from({length: 8}).map((_, i) => <Skeleton key={i} className="h-40 w-full rounded-xl" />)}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-20">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-headline tracking-tight flex items-center gap-3">
                        <BookOpen className="h-8 w-8 text-primary" />
                        Knowledge Base
                    </h1>
                    <p className="text-muted-foreground">Standard Operating Procedures, policies, and onboarding resources.</p>
                </div>
                {permissions.canManageLibrary && (
                    <div className="flex items-center gap-2">
                         <div className="relative">
                            <Input
                                type="file"
                                className="hidden"
                                id="library-upload"
                                onChange={handleFileUpload}
                                disabled={isUploading}
                            />
                            <Button asChild disabled={isUploading} variant="outline" className="rounded-xl">
                                <label htmlFor="library-upload" className="cursor-pointer">
                                    {isUploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="mr-2 h-4 w-4" />}
                                    Upload Document
                                </label>
                            </Button>
                        </div>
                        <Button onClick={() => setIsCreatingFolder(true)} disabled={isCreatingFolder} className="rounded-xl">
                            <Plus className="mr-2 h-4 w-4" /> New Folder
                        </Button>
                    </div>
                )}
            </div>

            {isUploading && (
                <div className="space-y-2 p-4 bg-primary/5 border border-primary/20 rounded-xl animate-in fade-in slide-in-from-top-2">
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-primary">
                        <span>Uploading Resource...</span>
                        <span>{Math.round(uploadProgress)}%</span>
                    </div>
                    <Progress value={uploadProgress} className="h-1.5" />
                </div>
            )}

            <Card className="bg-card/50 backdrop-blur-xl border-white/5">
                <CardHeader className="pb-4 border-b border-white/5">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            {currentFolderId && (
                                <Button variant="ghost" size="icon" className="rounded-lg" onClick={() => setCurrentFolderId(currentFolder?.parentFolderId || null)}>
                                    <ArrowLeft className="h-4 w-4" />
                                </Button>
                            )}
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Directory</span>
                                <span className="font-bold text-lg leading-none">
                                    {currentFolder ? currentFolder.name : 'Root Repository'}
                                </span>
                            </div>
                        </div>
                        <div className="relative w-full sm:max-w-xs">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Search library..." 
                                className="pl-10 h-10 rounded-full bg-background/50 border-white/5"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pt-6">
                    {isCreatingFolder && (
                        <div className="flex items-center gap-3 p-3 mb-6 border border-primary/20 rounded-xl bg-primary/5 animate-in zoom-in-95">
                            <Folder className="h-6 w-6 text-primary" />
                            <Input 
                                placeholder="Enter folder name..." 
                                autoFocus
                                className="h-10 border-none bg-transparent focus-visible:ring-0"
                                value={newFolderName}
                                onChange={(e) => setNewFolderName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleCreateFolder();
                                    if (e.key === 'Escape') setIsCreatingFolder(false);
                                }}
                            />
                            <div className="flex items-center gap-2">
                                <Button size="sm" variant="ghost" className="h-8" onClick={() => setIsCreatingFolder(false)}>Cancel</Button>
                                <Button size="sm" className="h-8 rounded-lg" onClick={handleCreateFolder}>Create</Button>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredItems.length === 0 && !isCreatingFolder && (
                            <div className="col-span-full py-24 text-center text-muted-foreground">
                                <div className="rounded-full bg-secondary/30 p-8 w-fit mx-auto mb-6">
                                    <BookOpen className="h-12 w-12 opacity-20" />
                                </div>
                                <p className="font-bold text-lg text-foreground">No resources found</p>
                                <p className="text-sm max-w-xs mx-auto">This directory is currently empty. Use the buttons above to populate your knowledge base.</p>
                            </div>
                        )}
                        {filteredItems.map(item => (
                            <div 
                                key={item.id}
                                className={cn(
                                    "group relative flex flex-col p-5 rounded-2xl border border-white/5 bg-background/40 hover:bg-background/80 transition-all hover:shadow-2xl cursor-pointer overflow-hidden",
                                    item.type === 'FOLDER' && "hover:border-primary/20"
                                )}
                                onClick={() => item.type === 'FOLDER' ? setCurrentFolderId(item.id) : null}
                            >
                                <div className="flex items-start justify-between mb-5">
                                    {item.type === 'FOLDER' ? (
                                        <div className="rounded-xl bg-primary/10 p-3 shadow-inner">
                                            <Folder className="h-7 w-7 text-primary" />
                                        </div>
                                    ) : (
                                        <div className="rounded-xl bg-secondary/50 p-3">
                                            <FileText className="h-7 w-7 text-muted-foreground" />
                                        </div>
                                    )}
                                    <div className="flex items-center gap-1">
                                        {item.type === 'FILE' && item.url && (
                                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg" asChild onClick={(e) => e.stopPropagation()}>
                                                <Link href={item.url} target="_blank" rel="noopener noreferrer">
                                                    <Download className="h-4 w-4" />
                                                </Link>
                                            </Button>
                                        )}
                                        {permissions.canManageLibrary && (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={(e) => e.stopPropagation()}>
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="rounded-xl">
                                                    <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive rounded-lg" onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteItem(item);
                                                    }}>
                                                        <Trash2 className="mr-2 h-4 w-4" /> Delete Item
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-1.5 flex-1">
                                    <h4 className="font-bold text-sm truncate pr-4 text-gray-200 group-hover:text-white transition-colors" title={item.name}>
                                        {item.name}
                                    </h4>
                                    <div className="flex items-center gap-3 text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                                        <span className={cn(item.type === 'FOLDER' ? "text-primary/70" : "text-slate-500")}>
                                            {item.type}
                                        </span>
                                        {item.size && (
                                            <>
                                                <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                                                <span>{(item.size / 1024 / 1024).toFixed(2)} MB</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-between text-[10px] text-muted-foreground">
                                    <div className="flex items-center gap-1.5">
                                        <div className="h-4 w-4 rounded-full bg-secondary flex items-center justify-center text-[8px] font-bold">
                                            {item.creatorName.charAt(0)}
                                        </div>
                                        <span>{item.creatorName.split(' ')[0]}</span>
                                    </div>
                                    <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
=======

'use client';

import { useState, useMemo } from 'react';
import { useUser, useDoc, useFirestore, useMemoFirebase, useCollection, addDocumentNonBlocking } from '@/firebase';
import { collection, query, where, orderBy, doc, deleteDoc } from 'firebase/firestore';
import type { UserProfile, LibraryItem } from '@/lib/types';
import { usePermissions } from '@/hooks/usePermissions';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
    Folder, 
    FileText, 
    Upload, 
    Plus, 
    MoreVertical, 
    Trash2, 
    ArrowLeft, 
    Search,
    BookOpen,
    Download,
    Loader2
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { useFileUpload } from '@/hooks/useFileUpload';
import { Progress } from '@/components/ui/progress';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export function LibraryPageContent() {
    const { user: authUser } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const { isUploading, uploadProgress, uploadFile } = useFileUpload();

    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isCreatingFolder, setIsCreatingFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');

    const userProfileRef = useMemoFirebase(() => 
        firestore && authUser ? doc(firestore, 'users', authUser.uid) : null
    , [firestore, authUser]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);
    const permissions = usePermissions(userProfile);

    const itemsQuery = useMemoFirebase(() => {
        if (!firestore || !userProfile) return null;
        return query(
            collection(firestore, 'library_items'),
            where('orgId', '==', userProfile.orgId),
            orderBy('createdAt', 'desc')
        );
    }, [firestore, userProfile]);

    const { data: allItems, isLoading: isItemsLoading } = useCollection<LibraryItem>(itemsQuery);

    const currentItems = useMemo(() => {
        if (!allItems) return [];
        return allItems.filter(item => (item.parentFolderId || null) === currentFolderId);
    }, [allItems, currentFolderId]);

    const filteredItems = useMemo(() => {
        if (!searchTerm) return currentItems;
        const term = searchTerm.toLowerCase();
        // If searching, search globally across all items, not just current folder
        return (allItems || []).filter(item => 
            item.name.toLowerCase().includes(term) ||
            item.creatorName.toLowerCase().includes(term)
        );
    }, [currentItems, allItems, searchTerm]);

    const currentFolder = useMemo(() => {
        if (!currentFolderId || !allItems) return null;
        return allItems.find(item => item.id === currentFolderId);
    }, [currentFolderId, allItems]);

    const handleCreateFolder = async () => {
        if (!newFolderName.trim() || !userProfile || !firestore) return;
        setIsCreatingFolder(true);
        try {
            const newItem: Omit<LibraryItem, 'id'> = {
                orgId: userProfile.orgId,
                name: newFolderName.trim(),
                type: 'FOLDER',
                parentFolderId: currentFolderId,
                createdBy: userProfile.id,
                creatorName: userProfile.fullName,
                createdAt: new Date().toISOString(),
            };
            await addDocumentNonBlocking(collection(firestore, 'library_items'), newItem);
            setNewFolderName('');
            setIsCreatingFolder(false);
            toast({ title: 'Folder Created', description: `"${newFolderName}" has been added.` });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        } finally {
            setIsCreatingFolder(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !userProfile || !firestore) return;

        try {
            const filePath = `library/${userProfile.orgId}/${Date.now()}_${file.name}`;
            const downloadUrl = await uploadFile(file, filePath);

            const newItem: Omit<LibraryItem, 'id'> = {
                orgId: userProfile.orgId,
                name: file.name,
                type: 'FILE',
                parentFolderId: currentFolderId,
                url: downloadUrl,
                mimeType: file.type,
                size: file.size,
                createdBy: userProfile.id,
                creatorName: userProfile.fullName,
                createdAt: new Date().toISOString(),
            };

            await addDocumentNonBlocking(collection(firestore, 'library_items'), newItem);
            toast({ title: 'File Uploaded', description: `"${file.name}" is now available.` });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Upload Failed', description: e.message });
        } finally {
            // Reset input
            e.target.value = '';
        }
    };

    const handleDeleteItem = async (item: LibraryItem) => {
        if (!firestore || !permissions.canManageLibrary) return;
        try {
            await deleteDoc(doc(firestore, 'library_items', item.id));
            toast({ title: 'Item Removed', description: `${item.name} deleted.` });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        }
    };

    if (isProfileLoading || isItemsLoading) {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <Skeleton className="h-10 w-64" />
                    <Skeleton className="h-10 w-32" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {Array.from({length: 8}).map((_, i) => <Skeleton key={i} className="h-40 w-full rounded-xl" />)}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-20">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-headline tracking-tight flex items-center gap-3">
                        <BookOpen className="h-8 w-8 text-primary" />
                        Knowledge Base
                    </h1>
                    <p className="text-muted-foreground">Standard Operating Procedures, policies, and onboarding resources.</p>
                </div>
                {permissions.canManageLibrary && (
                    <div className="flex items-center gap-2">
                         <div className="relative">
                            <Input
                                type="file"
                                className="hidden"
                                id="library-upload"
                                onChange={handleFileUpload}
                                disabled={isUploading}
                            />
                            <Button asChild disabled={isUploading} variant="outline" className="rounded-xl">
                                <label htmlFor="library-upload" className="cursor-pointer">
                                    {isUploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="mr-2 h-4 w-4" />}
                                    Upload Document
                                </label>
                            </Button>
                        </div>
                        <Button onClick={() => setIsCreatingFolder(true)} disabled={isCreatingFolder} className="rounded-xl">
                            <Plus className="mr-2 h-4 w-4" /> New Folder
                        </Button>
                    </div>
                )}
            </div>

            {isUploading && (
                <div className="space-y-2 p-4 bg-primary/5 border border-primary/20 rounded-xl animate-in fade-in slide-in-from-top-2">
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-primary">
                        <span>Uploading Resource...</span>
                        <span>{Math.round(uploadProgress)}%</span>
                    </div>
                    <Progress value={uploadProgress} className="h-1.5" />
                </div>
            )}

            <Card className="bg-card/50 backdrop-blur-xl border-white/5">
                <CardHeader className="pb-4 border-b border-white/5">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            {currentFolderId && (
                                <Button variant="ghost" size="icon" className="rounded-lg" onClick={() => setCurrentFolderId(currentFolder?.parentFolderId || null)}>
                                    <ArrowLeft className="h-4 w-4" />
                                </Button>
                            )}
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Directory</span>
                                <span className="font-bold text-lg leading-none">
                                    {currentFolder ? currentFolder.name : 'Root Repository'}
                                </span>
                            </div>
                        </div>
                        <div className="relative w-full sm:max-w-xs">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Search library..." 
                                className="pl-10 h-10 rounded-full bg-background/50 border-white/5"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pt-6">
                    {isCreatingFolder && (
                        <div className="flex items-center gap-3 p-3 mb-6 border border-primary/20 rounded-xl bg-primary/5 animate-in zoom-in-95">
                            <Folder className="h-6 w-6 text-primary" />
                            <Input 
                                placeholder="Enter folder name..." 
                                autoFocus
                                className="h-10 border-none bg-transparent focus-visible:ring-0"
                                value={newFolderName}
                                onChange={(e) => setNewFolderName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleCreateFolder();
                                    if (e.key === 'Escape') setIsCreatingFolder(false);
                                }}
                            />
                            <div className="flex items-center gap-2">
                                <Button size="sm" variant="ghost" className="h-8" onClick={() => setIsCreatingFolder(false)}>Cancel</Button>
                                <Button size="sm" className="h-8 rounded-lg" onClick={handleCreateFolder}>Create</Button>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredItems.length === 0 && !isCreatingFolder && (
                            <div className="col-span-full py-24 text-center text-muted-foreground">
                                <div className="rounded-full bg-secondary/30 p-8 w-fit mx-auto mb-6">
                                    <BookOpen className="h-12 w-12 opacity-20" />
                                </div>
                                <p className="font-bold text-lg text-foreground">No resources found</p>
                                <p className="text-sm max-w-xs mx-auto">This directory is currently empty. Use the buttons above to populate your knowledge base.</p>
                            </div>
                        )}
                        {filteredItems.map(item => (
                            <div 
                                key={item.id}
                                className={cn(
                                    "group relative flex flex-col p-5 rounded-2xl border border-white/5 bg-background/40 hover:bg-background/80 transition-all hover:shadow-2xl cursor-pointer overflow-hidden",
                                    item.type === 'FOLDER' && "hover:border-primary/20"
                                )}
                                onClick={() => item.type === 'FOLDER' ? setCurrentFolderId(item.id) : null}
                            >
                                <div className="flex items-start justify-between mb-5">
                                    {item.type === 'FOLDER' ? (
                                        <div className="rounded-xl bg-primary/10 p-3 shadow-inner">
                                            <Folder className="h-7 w-7 text-primary" />
                                        </div>
                                    ) : (
                                        <div className="rounded-xl bg-secondary/50 p-3">
                                            <FileText className="h-7 w-7 text-muted-foreground" />
                                        </div>
                                    )}
                                    <div className="flex items-center gap-1">
                                        {item.type === 'FILE' && item.url && (
                                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg" asChild onClick={(e) => e.stopPropagation()}>
                                                <Link href={item.url} target="_blank" rel="noopener noreferrer">
                                                    <Download className="h-4 w-4" />
                                                </Link>
                                            </Button>
                                        )}
                                        {permissions.canManageLibrary && (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={(e) => e.stopPropagation()}>
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="rounded-xl">
                                                    <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive rounded-lg" onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteItem(item);
                                                    }}>
                                                        <Trash2 className="mr-2 h-4 w-4" /> Delete Item
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-1.5 flex-1">
                                    <h4 className="font-bold text-sm truncate pr-4 text-gray-200 group-hover:text-white transition-colors" title={item.name}>
                                        {item.name}
                                    </h4>
                                    <div className="flex items-center gap-3 text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                                        <span className={cn(item.type === 'FOLDER' ? "text-primary/70" : "text-slate-500")}>
                                            {item.type}
                                        </span>
                                        {item.size && (
                                            <>
                                                <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                                                <span>{(item.size / 1024 / 1024).toFixed(2)} MB</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-between text-[10px] text-muted-foreground">
                                    <div className="flex items-center gap-1.5">
                                        <div className="h-4 w-4 rounded-full bg-secondary flex items-center justify-center text-[8px] font-bold">
                                            {item.creatorName.charAt(0)}
                                        </div>
                                        <span>{item.creatorName.split(' ')[0]}</span>
                                    </div>
                                    <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
>>>>>>> 8c2f2c7ee9c25fe21fb0f2e265f70b5d1d4e553a
