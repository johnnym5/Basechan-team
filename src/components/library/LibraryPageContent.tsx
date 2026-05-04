'use client';

import { useState, useMemo } from 'react';
import { useUser, useDoc, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
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
    Download
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { useFileUpload } from '@/hooks/useFileUpload';
import { Progress } from '@/components/ui/progress';
import { addDocumentNonBlocking } from '@/firebase';
import Link from 'next/link';

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
            orderBy('name', 'asc')
        );
    }, [firestore, userProfile]);

    const { data: allItems, isLoading: isItemsLoading } = useCollection<LibraryItem>(itemsQuery);

    const currentItems = useMemo(() => {
        if (!allItems) return [];
        return allItems.filter(item => item.parentFolderId === currentFolderId);
    }, [allItems, currentFolderId]);

    const filteredItems = useMemo(() => {
        if (!searchTerm) return currentItems;
        return currentItems.filter(item => 
            item.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [currentItems, searchTerm]);

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
                name: newFolderName,
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
            toast({ title: 'File Uploaded', description: `"${file.name}" is now available in the library.` });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Upload Failed', description: e.message });
        }
    };

    const handleDeleteItem = async (item: LibraryItem) => {
        if (!firestore || !permissions.canManageLibrary) return;
        try {
            await deleteDoc(doc(firestore, 'library_items', item.id));
            toast({ title: 'Item Removed', description: `${item.name} has been deleted.` });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        }
    };

    if (isProfileLoading || isItemsLoading) {
        return <Skeleton className="h-[600px] w-full" />;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-headline tracking-tight flex items-center gap-3">
                        <BookOpen className="h-8 w-8 text-primary" />
                        Knowledge Base
                    </h1>
                    <p className="text-muted-foreground">Organization onboarding, resources, and shared documents.</p>
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
                            <Button asChild disabled={isUploading} variant="outline">
                                <label htmlFor="library-upload" className="cursor-pointer">
                                    <Upload className="mr-2 h-4 w-4" /> Upload
                                </label>
                            </Button>
                        </div>
                        <Button onClick={() => setIsCreatingFolder(true)} disabled={isCreatingFolder}>
                            <Plus className="mr-2 h-4 w-4" /> New Folder
                        </Button>
                    </div>
                )}
            </div>

            {isUploading && (
                <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                        <span>Uploading...</span>
                        <span>{Math.round(uploadProgress)}%</span>
                    </div>
                    <Progress value={uploadProgress} className="h-1" />
                </div>
            )}

            <Card className="bg-card/50 backdrop-blur-xl">
                <CardHeader className="pb-4">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            {currentFolderId && (
                                <Button variant="ghost" size="icon" onClick={() => setCurrentFolderId(currentFolder?.parentFolderId || null)}>
                                    <ArrowLeft className="h-4 w-4" />
                                </Button>
                            )}
                            <div className="font-semibold text-lg">
                                {currentFolder ? currentFolder.name : 'Root Directory'}
                            </div>
                        </div>
                        <div className="relative w-full sm:max-w-xs">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Search resources..." 
                                className="pl-10 bg-background/50"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {isCreatingFolder && (
                        <div className="flex items-center gap-2 p-2 mb-4 border rounded-lg bg-secondary/20">
                            <Folder className="h-5 w-5 text-primary" />
                            <Input 
                                placeholder="Folder name..." 
                                autoFocus
                                className="h-8"
                                value={newFolderName}
                                onChange={(e) => setNewFolderName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleCreateFolder();
                                    if (e.key === 'Escape') setIsCreatingFolder(false);
                                }}
                            />
                            <Button size="sm" variant="ghost" onClick={() => setIsCreatingFolder(false)}>Cancel</Button>
                            <Button size="sm" onClick={handleCreateFolder}>Create</Button>
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredItems.length === 0 && !isCreatingFolder && (
                            <div className="col-span-full py-20 text-center text-muted-foreground">
                                <div className="rounded-full bg-secondary/50 p-6 w-fit mx-auto mb-4">
                                    <BookOpen className="h-10 w-10 opacity-20" />
                                </div>
                                <p className="font-semibold">No resources here</p>
                                <p className="text-sm">Explore other folders or search for documents.</p>
                            </div>
                        )}
                        {filteredItems.map(item => (
                            <div 
                                key={item.id}
                                className="group relative flex flex-col p-4 rounded-xl border bg-background/50 hover:bg-background transition-all hover:shadow-md cursor-pointer overflow-hidden"
                                onClick={() => item.type === 'FOLDER' ? setCurrentFolderId(item.id) : null}
                            >
                                <div className="flex items-start justify-between mb-4">
                                    {item.type === 'FOLDER' ? (
                                        <div className="rounded-lg bg-primary/10 p-3">
                                            <Folder className="h-6 w-6 text-primary" />
                                        </div>
                                    ) : (
                                        <div className="rounded-lg bg-secondary p-3">
                                            <FileText className="h-6 w-6 text-muted-foreground" />
                                        </div>
                                    )}
                                    <div className="flex items-center gap-1">
                                        {item.type === 'FILE' && item.url && (
                                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" asChild onClick={(e) => e.stopPropagation()}>
                                                <Link href={item.url} target="_blank" rel="noopener noreferrer">
                                                    <Download className="h-4 w-4" />
                                                </Link>
                                            </Button>
                                        )}
                                        {permissions.canManageLibrary && (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive" onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteItem(item);
                                                    }}>
                                                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <h4 className="font-semibold text-sm truncate pr-6" title={item.name}>{item.name}</h4>
                                    <div className="flex items-center justify-between text-[10px] text-muted-foreground uppercase tracking-widest">
                                        <span>{item.type}</span>
                                        {item.size && <span>{(item.size / 1024 / 1024).toFixed(2)} MB</span>}
                                    </div>
                                </div>
                                <div className="mt-4 pt-4 border-t text-[10px] text-muted-foreground flex justify-between">
                                    <span>By {item.creatorName.split(' ')[0]}</span>
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
