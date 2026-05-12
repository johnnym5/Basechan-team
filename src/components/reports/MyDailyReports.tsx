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
import { CheckCircle2 } from 'lucide-react';

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

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Report History</CardTitle>
        <CardDescription>Your last 10 submitted reports.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        )}
        {!isLoading && reports?.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-10">
            You haven't submitted any reports yet.
          </p>
        )}
        <Accordion type="single" collapsible className="w-full">
          {reports?.map((report) => (
            <AccordionItem value={report.id} key={report.id}>
              <AccordionTrigger>
                <div className="flex justify-between w-full pr-4">
                  <span className="font-semibold">
                    Report for {format(new Date(report.reportDate), 'PPP')}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(report.createdAt), { addSuffix: true })}
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{report.content}</p>
                {report.completedTasks && report.completedTasks.length > 0 && (
                    <div>
                        <h4 className="font-semibold text-sm mb-2">Tasks Mentioned:</h4>
                        <ul className="space-y-1 list-disc pl-5">
                            {report.completedTasks.map(task => (
                                <li key={task.taskId} className="text-sm flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-primary" />
                                    {task.title}
                                </li>
                            ))}
                        </ul>
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
