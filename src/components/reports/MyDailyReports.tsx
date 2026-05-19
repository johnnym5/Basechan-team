'use client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Skeleton } from '../ui/skeleton';
import type { DailyReport, UserProfile } from '@/lib/types';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';
import { format, formatDistanceToNow } from 'date-fns';
import { CheckCircle2, ListTodo, ArrowRight } from 'lucide-react';
import { uiEmitter } from '@/lib/ui-emitter';
import { Button } from '../ui/button';

interface MyDailyReportsProps {
  userProfile: UserProfile;
}

export function MyDailyReports({ userProfile }: MyDailyReportsProps) {
  const firestore = useFirestore();

  const reportsQuery = useMemoFirebase(
    () =>
      query(
        collection(firestore, 'daily_reports'),
        where('userId', '==', userProfile.id),
        orderBy('createdAt', 'desc'),
        limit(10)
      ),
    [firestore, userProfile.id]
  );

  const { data: reports, isLoading } = useCollection<DailyReport>(reportsQuery);

  const handleJumpToTask = (taskId: string) => {
      uiEmitter.emit('open-tasks-dialog', { taskId });
  };

  return (
    <Card className="apple-glass border-none shadow-xl">
      <CardHeader>
        <CardTitle>My Report History</CardTitle>
        <CardDescription>Your last 10 submitted mission summaries.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        )}
        {!isLoading && reports?.length === 0 && (
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center py-10 opacity-30">
            Zero reports archived
          </p>
        )}
        <Accordion type="single" collapsible className="w-full space-y-2">
          {reports?.map((report) => (
            <AccordionItem value={report.id} key={report.id} className="border-none bg-secondary/10 rounded-2xl overflow-hidden">
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-secondary/20 transition-all text-left">
                <div className="flex justify-between w-full pr-4 items-center">
                  <span className="font-bold text-sm">
                    {format(new Date(report.reportDate), 'PPP')}
                  </span>
                  <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                    {formatDistanceToNow(new Date(report.createdAt), { addSuffix: true })}
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 space-y-6 animate-in fade-in slide-in-from-top-1 duration-300">
                <div className="space-y-1">
                    <p className="text-[9px] font-black uppercase tracking-widest text-primary">Summary Memo</p>
                    <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed bg-black/10 p-4 rounded-xl">{report.content}</p>
                </div>
                
                {report.completedTasks && report.completedTasks.length > 0 && (
                    <div className="space-y-2">
                        <h4 className="text-[9px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                            <ListTodo className="h-3 w-3" />
                            Mission Links
                        </h4>
                        <div className="grid grid-cols-1 gap-2">
                            {report.completedTasks.map(task => (
                                <button 
                                    key={task.taskId} 
                                    onClick={() => handleJumpToTask(task.taskId)}
                                    className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-background/50 hover:bg-primary/5 transition-all text-left group"
                                >
                                    <div className="flex items-center gap-3 truncate pr-4">
                                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                        <span className="text-[10px] font-bold truncate">{task.title}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="text-[8px] font-black uppercase">Open</span>
                                        <ArrowRight className="h-3 w-3" />
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
