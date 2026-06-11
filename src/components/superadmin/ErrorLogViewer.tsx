
'use client';

import { useFirestore } from '@/firebase';
import { collection, query, orderBy, limit, getDocs, startAfter, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import type { ErrorLog } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Skeleton } from '../ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { AlertTriangle, User, Code, FileText, Globe, Loader2, ChevronDown } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { useState, useEffect } from 'react';
import { Button } from '../ui/button';

export function ErrorLogViewer() {
    const firestore = useFirestore();
    const [errors, setErrors] = useState<ErrorLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFetchingMore, setIsFetchingMore] = useState(false);
    const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
    const [hasMore, setHasMore] = useState(true);

    const fetchErrors = async (loadMore = false) => {
        if (!firestore) return;
        
        if (loadMore) setIsFetchingMore(true);
        else setIsLoading(true);

        try {
            const errorsRef = collection(firestore, 'error_logs');
            let q = query(errorsRef, orderBy('timestamp', 'desc'), limit(20));

            if (loadMore && lastDoc) {
                q = query(errorsRef, orderBy('timestamp', 'desc'), startAfter(lastDoc), limit(20));
            }

            const snap = await getDocs(q);
            const newErrors = snap.docs.map(d => ({ id: d.id, ...d.data() } as ErrorLog));
            
            if (loadMore) {
                setErrors(prev => [...prev, ...newErrors]);
            } else {
                setErrors(newErrors);
            }

            setLastDoc(snap.docs[snap.docs.length - 1] || null);
            setHasMore(snap.docs.length === 20);

        } catch (error) {
            console.error("Failed to fetch errors:", error);
        } finally {
            setIsLoading(false);
            setIsFetchingMore(false);
        }
    };

    useEffect(() => {
        fetchErrors();
    }, [firestore]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Application Error Logs</CardTitle>
                <CardDescription>System telemetry and exception tracking.</CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[500px] border rounded-lg p-2 bg-background/50">
                     {isLoading ? (
                        <div className="space-y-2 p-2">
                            {Array.from({length: 5}).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                        </div>
                    ) : errors.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-10">
                            No errors logged yet.
                        </p>
                    ) : (
                        <div className="space-y-2">
                            <Accordion type="single" collapsible className="w-full">
                                {errors.map((error) => (
                                    <AccordionItem value={error.id} key={error.id} className="border-b-0">
                                        <AccordionTrigger className="p-3 hover:bg-secondary/50 rounded-md group">
                                            <div className="flex justify-between items-center w-full">
                                                <div className="flex items-center gap-3 text-left">
                                                    <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
                                                    <div className="truncate">
                                                        <p className="font-semibold text-xs truncate group-hover:text-destructive transition-colors">{error.errorMessage}</p>
                                                        <p className="text-[10px] text-muted-foreground">
                                                            {formatDistanceToNow(new Date(error.timestamp), { addSuffix: true })}
                                                        </p>
                                                    </div>
                                                </div>
                                                 <p className="text-[10px] text-muted-foreground font-mono truncate hidden sm:block pr-4 opacity-50">{error.path}</p>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="p-4 bg-muted/30 rounded-md">
                                            <div className="space-y-4 text-xs font-mono">
                                                <div className="flex items-start gap-2">
                                                    <User className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                                                    <p><strong className="font-sans text-foreground">User:</strong> {error.userName || 'N/A'} ({error.userId || 'N/A'})</p>
                                                </div>
                                                 <div className="flex items-start gap-2">
                                                    <Globe className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                                                    <p><strong className="font-sans text-foreground">Path:</strong> {error.path}</p>
                                                </div>
                                                <div>
                                                    <h4 className="font-sans text-sm font-semibold mb-2 flex items-center gap-2"><FileText className="h-4 w-4" /> Stack Trace</h4>
                                                    <pre className="whitespace-pre-wrap bg-background p-2 rounded-md max-h-48 overflow-y-auto text-[10px] text-muted-foreground">{error.stackTrace}</pre>
                                                </div>
                                                {error.componentStack && error.componentStack !== 'No component stack available' && (
                                                    <div>
                                                        <h4 className="font-sans text-sm font-semibold mb-2 flex items-center gap-2"><Code className="h-4 w-4" /> Component Stack</h4>
                                                        <pre className="whitespace-pre-wrap bg-background p-2 rounded-md max-h-48 overflow-y-auto text-[10px] text-muted-foreground">{error.componentStack}</pre>
                                                    </div>
                                                )}
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                            
                            {hasMore && (
                                <div className="p-4 flex justify-center border-t border-dashed">
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        onClick={() => fetchErrors(true)} 
                                        disabled={isFetchingMore}
                                        className="text-xs text-muted-foreground hover:text-primary"
                                    >
                                        {isFetchingMore ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <ChevronDown className="h-3 w-3 mr-2" />}
                                        Load Older Logs
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
