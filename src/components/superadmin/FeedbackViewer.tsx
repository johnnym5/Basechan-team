'use client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useFirestore, useCollection, updateDocumentNonBlocking, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import type { Feedback } from '@/lib/types';
import { ScrollArea } from '../ui/scroll-area';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';

interface FeedbackViewerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function FeedbackViewer({ open, onOpenChange }: FeedbackViewerProps) {
    const firestore = useFirestore();

    const allFeedbackQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'feedback'), orderBy('createdAt', 'desc')) : null, [firestore]);
    const { data: allFeedback, isLoading } = useCollection<Feedback>(allFeedbackQuery);

    const handleMarkAsRead = (feedbackId: string) => {
        const feedbackRef = doc(firestore, 'feedback', feedbackId);
        updateDocumentNonBlocking(feedbackRef, { status: 'READ' });
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl h-[70vh] flex flex-col">
                 <DialogHeader>
                    <DialogTitle>User Feedback</DialogTitle>
                    <DialogDescription>Inbox for user-submitted feedback and issues.</DialogDescription>
                </DialogHeader>
                <ScrollArea className="flex-1 -mx-6 px-6">
                    <div className="space-y-4">
                        {isLoading && Array.from({length: 3}).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
                        {!isLoading && allFeedback?.map(item => (
                            <Card key={item.id} className={item.status === 'NEW' ? 'border-primary' : ''}>
                                <CardHeader>
                                    <CardTitle className="text-base">{item.name} <span className="text-sm font-normal text-muted-foreground">from {item.organizationName}</span></CardTitle>
                                    <CardDescription>{item.contactInfo}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm">{item.message}</p>
                                </CardContent>
                                <CardFooter className="flex justify-between items-center text-xs text-muted-foreground">
                                    <span>{formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}</span>
                                    {item.status === 'NEW' && (
                                        <Button size="sm" variant="outline" onClick={() => handleMarkAsRead(item.id)}>Mark as Read</Button>
                                    )}
                                </CardFooter>
                            </Card>
                        ))}
                        {!isLoading && (!allFeedback || allFeedback.length === 0) && <p className="text-center text-muted-foreground py-16">No feedback yet.</p>}
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    )
}
