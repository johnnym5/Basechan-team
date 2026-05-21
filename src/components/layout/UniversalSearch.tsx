'use client';

import { useState, useEffect, useCallback } from 'react';
import { useFirestore } from '@/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import type { UserProfile, Task, Requisition, Workbook } from '@/lib/types';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';

import { Search, User, Briefcase, ListTodo, BookOpenCheck, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { uiEmitter } from '@/lib/ui-emitter';


interface UniversalSearchProps {
    userProfile: UserProfile;
}

interface SearchResult {
    type: 'User' | 'Task' | 'Requisition' | 'Workbook';
    id: string;
    title: string;
    description: string;
    onClick: () => void;
}

const ICONS = {
    User: <User className="h-4 w-4 text-muted-foreground" />,
    Task: <ListTodo className="h-4 w-4 text-muted-foreground" />,
    Requisition: <Briefcase className="h-4 w-4 text-muted-foreground" />,
    Workbook: <BookOpenCheck className="h-4 w-4 text-muted-foreground" />,
};


export function UniversalSearch({ userProfile }: UniversalSearchProps) {
    const [open, setOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const firestore = useFirestore();
    const { isSuperAdmin } = useSuperAdmin();

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
        };

        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, []);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 300);

        return () => {
            clearTimeout(handler);
        };
    }, [searchTerm]);

    useEffect(() => {
        if (open) {
            // Prefocus the input
            setTimeout(() => {
                const input = document.getElementById('universal-search-input');
                if (input) input.focus();
            }, 100);
        } else {
            // Reset on close
            setSearchTerm('');
            setResults([]);
        }
    }, [open]);

    const performSearch = useCallback(async (term: string) => {
        if (!term || term.length < 2 || !firestore) {
            setResults([]);
            return;
        }
        setIsLoading(true);

        const buildQuery = (collectionName: string, searchField: string) => {
            const baseQuery = query(collection(firestore, collectionName),
                where(searchField, '>=', term),
                where(searchField, '<=', term + '\uf8ff'),
                limit(5));
            
            if (isSuperAdmin) {
                return baseQuery;
            }
            return query(baseQuery, where('orgId', '==', userProfile.orgId));
        };

        try {
            const [usersSnap, tasksSnap, reqsSnap, workbooksSnap] = await Promise.all([
                getDocs(buildQuery('users', 'fullName')),
                getDocs(buildQuery('tasks', 'title')),
                getDocs(buildQuery('requisitions', 'title')),
                getDocs(buildQuery('workbooks', 'title')),
            ]);

            const newResults: SearchResult[] = [];

            usersSnap.forEach(doc => {
                const data = doc.data() as UserProfile;
                newResults.push({ type: 'User', id: data.id, title: data.fullName, description: `User - ${data.position}`, onClick: () => uiEmitter.emit('open-settings-dialog') });
            });
            tasksSnap.forEach(doc => {
                const data = doc.data() as Task;
                newResults.push({ type: 'Task', id: data.id, title: data.title, description: `Task - Assigned to ${data.assignedToName}`, onClick: () => uiEmitter.emit('open-tasks-dialog', { taskId: data.id }) });
            });
            reqsSnap.forEach(doc => {
                const data = doc.data() as Requisition;
                newResults.push({ type: 'Requisition', id: data.id, title: data.title, description: `Requisition - ${data.serialNo}`, onClick: () => uiEmitter.emit('open-requisitions-dialog', { reqId: data.id }) });
            });
            workbooksSnap.forEach(doc => {
                const data = doc.data() as Workbook;
                newResults.push({ type: 'Workbook', id: data.id, title: data.title, description: `Workbook - Created by ${data.creatorName}`, onClick: () => uiEmitter.emit('open-workbooks-dialog', { workbookId: data.id }) });
            });

            setResults(newResults);

        } catch (error) {
            console.error("Search failed:", error);
        } finally {
            setIsLoading(false);
        }
    }, [firestore, userProfile.orgId, isSuperAdmin]);


    useEffect(() => {
        performSearch(debouncedSearchTerm);
    }, [debouncedSearchTerm, performSearch]);

    const handleSelectResult = (onClick: () => void) => {
        onClick();
        setOpen(false);
    };

    return (
        <>
            <Button
                variant="outline"
                className="relative h-9 w-full justify-start rounded-md px-4 text-sm text-muted-foreground sm:pr-12 md:w-40 lg:w-64"
                onClick={() => setOpen(true)}
            >
                <Search className="h-4 w-4 mr-2" />
                <span className="hidden lg:inline-flex">Search...</span>
                <span className="inline-flex lg:hidden">Search...</span>
                <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
                    <span className="text-xs">⌘</span>K
                </kbd>
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="p-0 top-[15vh] sm:top-[15vh] max-w-lg">
                    <DialogHeader className="sr-only">
                        <DialogTitle>Universal Search</DialogTitle>
                        <DialogDescription>Search for tasks, users, documents, and more.</DialogDescription>
                    </DialogHeader>
                    <div className="flex items-center border-b px-3">
                        <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                        <Input
                            id="universal-search-input"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search tasks, users, documents..."
                            className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                        />
                    </div>
                    <ScrollArea className="h-[300px]">
                        <div className="p-2">
                            {isLoading && (
                                <div className="flex items-center justify-center p-4">
                                    <Loader2 className="animate-spin text-muted-foreground" />
                                </div>
                            )}
                            {!isLoading && results.length > 0 && (
                                <div className="space-y-1">
                                    {results.map(result => (
                                        <div
                                            key={`${result.type}-${result.id}`}
                                            className="flex items-center gap-3 p-2 rounded-md text-sm hover:bg-accent cursor-pointer"
                                            onClick={() => handleSelectResult(result.onClick)}
                                        >
                                            {ICONS[result.type]}
                                            <div className="flex-1 truncate">
                                                <p className="text-foreground">{result.title}</p>
                                                <p className="text-muted-foreground text-xs">{result.description}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                             {!isLoading && debouncedSearchTerm.length > 1 && results.length === 0 && (
                                <p className="p-4 text-center text-sm text-muted-foreground">No results found.</p>
                            )}
                             {!isLoading && debouncedSearchTerm.length <= 1 && (
                                <p className="p-4 text-center text-sm text-muted-foreground">Start typing to search.</p>
                            )}
                        </div>
                    </ScrollArea>
                </DialogContent>
            </Dialog>
        </>
    )
}
