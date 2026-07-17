"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Send } from 'lucide-react';
import { useState } from 'react';
import { useFirestore, useCollection, addDocumentNonBlocking, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { DailyReport, UserProfile, Task } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { format } from 'date-fns';
import { ScrollArea } from '../ui/scroll-area';
import { sanitizeInput } from '@/lib/utils';


const formSchema = z.object({
  content: z.string().min(10, { message: 'Report must be at least 10 characters.' }),
  completedTasks: z.array(z.string()).optional(),
});

type FormData = z.infer<typeof formSchema>;

interface SubmitDailyReportProps {
  userProfile: UserProfile;
}

export function SubmitDailyReport({ userProfile }: SubmitDailyReportProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const today = format(new Date(), 'yyyy-MM-dd');

  // Fetch tasks that could have been worked on today
  const tasksQuery = useMemoFirebase(() => 
    query(
        collection(firestore, 'tasks'),
        where('assignedTo', '==', userProfile.id),
        where('status', 'in', ['ACTIVE', 'AWAITING_REVIEW'])
    ), 
  [firestore, userProfile.id]);
  const { data: activeTasks, isLoading: areTasksLoading } = useCollection<Task>(tasksQuery);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      content: '',
      completedTasks: [],
    },
  });

  async function onSubmit(values: FormData) {
    setIsSubmitting(true);

    const completedTaskDetails = activeTasks
      ?.filter(task => values.completedTasks?.includes(task.id))
      .map(task => ({ taskId: task.id, title: task.title }));

    try {
        const newReport: Omit<DailyReport, 'id'> = {
            orgId: userProfile.orgId,
            userId: userProfile.id,
            userName: userProfile.fullName,
            reportDate: today,
            content: sanitizeInput(values.content),
            completedTasks: completedTaskDetails || [],
            createdAt: new Date().toISOString(),
        };

        await addDocumentNonBlocking(collection(firestore, 'daily_reports'), newReport);

        toast({ title: 'Report Submitted', description: 'Your daily report has been sent to your manager.' });
        form.reset();

    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Submission Failed', description: e.message });
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Submit Daily Report</CardTitle>
        <CardDescription>Summarize your work for today, {format(new Date(), 'PPP')}.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Summary of Activities</FormLabel>
                  <FormControl>
                    <Textarea placeholder="What did you accomplish today? Any blockers?" {...field} rows={6} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="completedTasks"
              render={() => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel>Completed/Progressed Tasks</FormLabel>
                  </div>
                  <ScrollArea className="h-32">
                    {areTasksLoading && <Loader2 className="animate-spin" />}
                    {activeTasks?.map((item) => (
                        <FormField
                        key={item.id}
                        control={form.control}
                        name="completedTasks"
                        render={({ field }) => (
                            <FormItem key={item.id} className="flex flex-row items-start space-x-3 space-y-0 p-2">
                            <FormControl>
                                <Checkbox
                                checked={field.value?.includes(item.id)}
                                onCheckedChange={(checked) => {
                                    return checked
                                    ? field.onChange([...(field.value || []), item.id])
                                    : field.onChange(
                                        (field.value || [])?.filter(
                                        (value) => value !== item.id
                                        )
                                    )
                                }}
                                />
                            </FormControl>
                            <FormLabel className="text-sm font-normal flex-1 cursor-pointer">
                                {item.title}
                            </FormLabel>
                            </FormItem>
                        )}
                        />
                    ))}
                    {!areTasksLoading && activeTasks?.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center pt-8">No active tasks found.</p>
                    )}
                  </ScrollArea>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? <Loader2 className="animate-spin" /> : <Send className="mr-2" />}
              Submit Report
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
