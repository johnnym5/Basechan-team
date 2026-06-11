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
import { CheckCircle2, Loader2, ChevronDown, ArrowRight, ExternalLink, ListTodo, Fingerprint, BookOpen } from 'lucide-react';
import { Button } from '../ui/button';
import { uiEmitter } from '@/lib/ui-emitter';
import { cn } from '@/lib/utils';


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

  const handleJumpToTask = (taskId: string) => {
      setSelectedReport(null);
      uiEmitter.emit('open-tasks-dialog', { taskId });
  };

  const handleJumpToWorkstation = (station: 'attendance' | 'workbooks') => {
      setSelectedReport(null);
      uiEmitter.emit(`open-${station}-dialog` as any);
  };

  return (
    <>
    <Card className="apple-glass border-none shadow-xl">
      <CardHeader>
        <CardTitle>Team Daily Reports</CardTitle>
        <CardDescription>Review recent activity logs submitted by personnel.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
            <TableHeader>
                <TableRow className="border-white/5">
                    <TableHead className="text-[9px] font-black uppercase tracking-widest">Date</TableHead>
                    <TableHead className="text-[9px] font-black uppercase tracking-widest">Staff Member</TableHead>
                    <TableHead className="text-[9px] font-black uppercase tracking-widest">Summary</TableHead>
                    <TableHead className="text-right text-[9px] font-black uppercase tracking-widest">Submitted</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {isLoading ? (
                    Array.from({length: 5}).map((_, i) => (
                        <TableRow key={i} className="border-white/5"><TableCell colSpan={4}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                    ))
                ) : reports.length === 0 ? (
                    <TableRow className="border-none"><TableCell colSpan={4} className="text-center h-24 text-muted-foreground uppercase font-black text-[9px] tracking-widest opacity-30">No reports found.</TableCell></TableRow>
                ) : (
                    reports.map(report => (
                        <TableRow 
                            key={report.id} 
                            onClick={() => setSelectedReport(report)} 
                            className="cursor-pointer hover:bg-primary/5 transition-colors border-white/5 group"
                        >
                            <TableCell className="font-bold text-[10px]">{format(new Date(report.reportDate), 'PP')}</TableCell>
                            <TableCell className="text-[10px] font-bold text-primary group-hover:underline">{report.userName}</TableCell>
                            <TableCell className="text-muted-foreground truncate max-w-xs text-[10px] font-medium">{report.content}</TableCell>
                            <TableCell className="text-right text-[9px] font-black uppercase text-muted-foreground">{formatDistanceToNow(new Date(report.createdAt), {addSuffix: true})}</TableCell>
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
                    className="rounded-full px-8 h-9"
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
            <DialogContent className="max-w-2xl apple-glass-darker border-none rounded-[2.5rem] p-8">
                <DialogHeader className="space-y-4">
                    <div className="flex items-start justify-between">
                        <div>
                            <DialogTitle className="text-2xl font-black font-headline tracking-tighter">Report: {selectedReport.userName}</DialogTitle>
                            <DialogDescription className="text-[10px] font-black uppercase tracking-widest mt-1">
                                Filed {format(new Date(selectedReport.createdAt), 'PPP, p')}
                            </DialogDescription>
                        </div>
                        <div className="flex gap-2">
                             <Button variant="outline" size="sm" className="h-8 rounded-xl px-3 border-white/10 hover:bg-primary/10 hover:text-primary transition-all group" onClick={() => handleJumpToWorkstation('attendance')}>
                                <Fingerprint className="h-3 w-3 mr-2" />
                                <span className="text-[8px] font-black uppercase">Personnel Station</span>
                            </Button>
                             <Button variant="outline" size="sm" className="h-8 rounded-xl px-3 border-white/10 hover:bg-primary/10 hover:text-primary transition-all group" onClick={() => handleJumpToWorkstation('workbooks')}>
                                <BookOpen className="h-3 w-3 mr-2" />
                                <span className="text-[8px] font-black uppercase">Data Grid</span>
                            </Button>
                        </div>
                    </div>
                </DialogHeader>

                <div className="space-y-6 py-6 overflow-y-auto max-h-[60vh] custom-scrollbar pr-2">
                    <div className="space-y-2">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                            <ExternalLink className="h-3 w-3" />
                            Activity Summary
                        </h4>
                        <div className="p-5 rounded-2xl bg-secondary/20 border border-white/5 text-[11px] leading-relaxed font-medium whitespace-pre-wrap">
                            {selectedReport.content}
                        </div>
                    </div>
                    
                    {selectedReport.completedTasks && selectedReport.completedTasks.length > 0 && (
                        <div className="space-y-2">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                <ListTodo className="h-3 w-3" />
                                Associated Missions
                            </h4>
                            <div className="grid grid-cols-1 gap-2">
                                {selectedReport.completedTasks.map(task => (
                                    <div 
                                        key={task.taskId} 
                                        onClick={() => handleJumpToTask(task.taskId)}
                                        className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-background/50 hover:bg-primary/5 cursor-pointer group transition-all active:scale-[0.98]"
                                    >
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
                                                <CheckCircle2 className="h-3.5 w-3.5" />
                                            </div>
                                            <span className="text-[10px] font-black uppercase tracking-tight truncate">{task.title}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                                            <span className="text-[8px] font-black uppercase">Inspect Mission</span>
                                            <ArrowRight className="h-3 w-3" />
                                        </div>
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
