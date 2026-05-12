'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '../ui/skeleton';
import type { DailyReport, UserProfile } from '@/lib/types';
import { useFirestore } from '@/firebase';
import { collection, query, where, orderBy, limit, getDocs, startAfter, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from "@/components/ui/table"
import { format, formatDistanceToNow } from 'date-fns';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
  } from "@/components/ui/dialog"
import { useState, useEffect } from 'react';
import { CheckCircle2, Loader2, ChevronDown } from 'lucide-react';
import { Button } from '../ui/button';


interface TeamDailyReportsProps {
  userProfile: UserProfile;
}

export function TeamDailyReports({ userProfile }: TeamDailyReportsProps) {
  const firestore = useFirestore();
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [selectedReport, setSelectedReport] = useState<DailyReport | null>(null);

  const fetchReports = async (loadMore = false) => {
    if (!firestore || !userProfile) return;

    if (loadMore) setIsFetchingMore(true);
    else setIsLoading(true);

    try {
        const reportsRef = collection(firestore, 'daily_reports');
        let q = query(
            reportsRef, 
            where('orgId', '==', userProfile.orgId), 
            orderBy('createdAt', 'desc'), 
            limit(15)
        );

        if (loadMore && lastDoc) {
            q = query(
                reportsRef, 
                where('orgId', '==', userProfile.orgId), 
                orderBy('createdAt', 'desc'), 
                startAfter(lastDoc), 
                limit(15)
            );
        }

        const snap = await getDocs(q);
        const newReports = snap.docs.map(d => ({ id: d.id, ...d.data() } as DailyReport));

        if (loadMore) {
            setReports(prev => [...prev, ...newReports]);
        } else {
            setReports(newReports);
        }

        setLastDoc(snap.docs[snap.docs.length - 1] || null);
        setHasMore(snap.docs.length === 15);

    } catch (e) {
        console.error("Failed to fetch team reports:", e);
    } finally {
        setIsLoading(false);
        setIsFetchingMore(false);
    }
  };

  useEffect(() => {
      fetchReports();
  }, [firestore, userProfile?.orgId]);

  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle>Team Daily Reports</CardTitle>
        <CardDescription>Review recent activity logs submitted by personnel.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Staff Member</TableHead>
                    <TableHead>Summary</TableHead>
                    <TableHead className="text-right">Submitted</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {isLoading ? (
                    Array.from({length: 5}).map((_, i) => (
                        <TableRow key={i}><TableCell colSpan={4}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                    ))
                ) : reports.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center h-24 text-muted-foreground">No reports found.</TableCell></TableRow>
                ) : (
                    reports.map(report => (
                        <TableRow key={report.id} onClick={() => setSelectedReport(report)} className="cursor-pointer hover:bg-secondary/20 transition-colors">
                            <TableCell className="font-medium text-xs">{format(new Date(report.reportDate), 'PPP')}</TableCell>
                            <TableCell className="text-xs font-semibold">{report.userName}</TableCell>
                            <TableCell className="text-muted-foreground truncate max-w-xs text-xs">{report.content}</TableCell>
                            <TableCell className="text-right text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(report.createdAt), {addSuffix: true})}</TableCell>
                        </TableRow>
                    ))
                )}
            </TableBody>
        </Table>
        
        {hasMore && !isLoading && (
            <div className="pt-6 flex justify-center">
                 <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => fetchReports(true)} 
                    disabled={isFetchingMore}
                    className="rounded-full px-8"
                >
                    {isFetchingMore ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ChevronDown className="h-4 w-4 mr-2" />}
                    Load More Reports
                </Button>
            </div>
        )}
      </CardContent>
    </Card>

    {selectedReport && (
        <Dialog open={!!selectedReport} onOpenChange={(isOpen) => !isOpen && setSelectedReport(null)}>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                <DialogTitle>Report from {selectedReport.userName}</DialogTitle>
                <DialogDescription>
                    Submitted on {format(new Date(selectedReport.createdAt), 'PPP, p')}
                </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                    <h4 className="font-semibold text-sm uppercase tracking-widest text-primary">Summary</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-secondary/10 p-4 rounded-xl">{selectedReport.content}</p>
                    
                    {selectedReport.completedTasks && selectedReport.completedTasks.length > 0 && (
                        <div className="space-y-2">
                            <h4 className="font-semibold text-sm uppercase tracking-widest text-primary">Tasks Involved</h4>
                            <div className="grid gap-2">
                                {selectedReport.completedTasks.map(task => (
                                    <div key={task.taskId} className="flex items-center gap-3 p-2 rounded-lg border bg-background/50 text-xs">
                                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                        {task.title}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )}
    </>
  );
}
