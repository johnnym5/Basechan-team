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
  FormDescription,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Send, Rocket, ThumbsUp, Meh, Construction, ListTodo, AlertCircle, Target, Sparkles } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useFirestore, useCollection, addDocumentNonBlocking, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { DailyReport, UserProfile, Task } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { format } from 'date-fns';
import { ScrollArea } from '../ui/scroll-area';
import { sanitizeInput, cn } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const formSchema = z.object({
  accomplishments: z.string().min(10, { message: 'Accomplishments must be at least 10 characters.' }),
  blockers: z.string().optional(),
  nextFocus: z.string().min(5, { message: 'Next focus must be at least 5 characters.' }),
  pulse: z.enum(['GREAT', 'PRODUCTIVE', 'AVERAGE', 'STRUGGLING'], {
    required_error: "Please select your daily pulse.",
  }),
  completedTasks: z.array(z.object({
      taskId: z.string(),
      title: z.string(),
      notes: z.string().optional(),
  })).optional(),
});

type FormData = z.infer<typeof formSchema>;

interface SubmitDailyReportProps {
  userProfile: UserProfile;
  onSuccess?: () => void;
}

const PULSE_OPTIONS = [
    { value: 'GREAT', label: 'Great', icon: Rocket, color: 'text-emerald-500' },
    { value: 'PRODUCTIVE', label: 'Productive', icon: ThumbsUp, color: 'text-blue-500' },
    { value: 'AVERAGE', label: 'Average', icon: Meh, color: 'text-amber-500' },
    { value: 'STRUGGLING', label: 'Struggling', icon: Construction, color: 'text-rose-500' },
];

export function SubmitDailyReport({ userProfile, onSuccess }: SubmitDailyReportProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const today = format(new Date(), 'yyyy-MM-dd');
  const DRAFT_KEY = `report-draft-${userProfile.id}`;

  // Fetch tasks that could have been worked on today
  const tasksQuery = useMemoFirebase(() => 
    firestore ? query(
        collection(firestore, 'tasks'),
        where('orgId', '==', userProfile.orgId),
        where('assignedTo', '==', userProfile.id),
        where('status', 'in', ['ACTIVE', 'AWAITING_REVIEW'])
    ) : null, 
  [firestore, userProfile.id, userProfile.orgId]);
  const { data: activeTasks, isLoading: areTasksLoading } = useCollection<Task>(tasksQuery);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      accomplishments: '',
      blockers: '',
      nextFocus: '',
      pulse: 'PRODUCTIVE',
      completedTasks: [],
    },
  });

  // 1. Auto-save / Load Draft
  useEffect(() => {
    const draft = localStorage.getItem(DRAFT_KEY);
    if (draft) {
        try {
            const parsed = JSON.parse(draft);
            form.reset(parsed);
        } catch (e) {
            console.warn("Failed to load report draft");
        }
    }
  }, [form, DRAFT_KEY]);

  useEffect(() => {
    const subscription = form.watch((value) => {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(value));
    });
    return () => subscription.unsubscribe();
  }, [form.watch, DRAFT_KEY]);

  async function onSubmit(values: FormData) {
    setIsSubmitting(true);

    try {
        // Consolidate into the legacy 'content' field for backwards compatibility while storing structured fields
        const consolidatedContent = `
DAILY PULSE: ${values.pulse}

ACCOMPLISHMENTS:
${values.accomplishments}

BLOCKERS:
${values.blockers || 'None'}

TOMORROW'S FOCUS:
${values.nextFocus}
        `.trim();

        const newReport: Omit<DailyReport, 'id'> = {
            orgId: userProfile.orgId,
            userId: userProfile.id,
            userName: userProfile.fullName,
            reportDate: today,
            accomplishments: sanitizeInput(values.accomplishments),
            blockers: sanitizeInput(values.blockers || ''),
            nextFocus: sanitizeInput(values.nextFocus),
            pulse: values.pulse,
            content: consolidatedContent,
            completedTasks: values.completedTasks || [],
            createdAt: new Date().toISOString(),
        };

        if (!firestore) return;
        await addDocumentNonBlocking(collection(firestore, 'daily_reports'), newReport);

        toast({ title: 'Report Submitted', description: 'Your daily intelligence has been synchronized.' });

        // Clear draft
        localStorage.removeItem(DRAFT_KEY);
        form.reset({
            accomplishments: '',
            blockers: '',
            nextFocus: '',
            pulse: 'PRODUCTIVE',
            completedTasks: [],
        });

        if (onSuccess) onSuccess();

    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Submission Failed', description: e.message });
    } finally {
        setIsSubmitting(false);
    }
  }

  const handleTaskToggle = (task: Task, checked: boolean) => {
      const current = form.getValues('completedTasks') || [];
      if (checked) {
          form.setValue('completedTasks', [...current, { taskId: task.id, title: task.title, notes: '' }]);
      } else {
          form.setValue('completedTasks', current.filter(t => t.taskId !== task.id));
      }
  };

  const updateTaskNotes = (taskId: string, notes: string) => {
      const current = form.getValues('completedTasks') || [];
      form.setValue('completedTasks', current.map(t => t.taskId === taskId ? { ...t, notes } : t));
  };

  return (
    <Card className="apple-glass border-none shadow-2xl overflow-hidden">
      <CardHeader className="bg-primary/5 border-b border-white/5">
        <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Synchronize Daily Intelligence
        </CardTitle>
        <CardDescription>Documenting achievements and blockers for {format(new Date(), 'PPP')}.</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

            {/* 1. Daily Pulse */}
            <div className="space-y-4">
                <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-50">Daily Pulse (Morale Tracker)</FormLabel>
                <FormField
                    control={form.control}
                    name="pulse"
                    render={({ field }) => (
                        <FormItem className="space-y-3">
                            <FormControl>
                                <RadioGroup
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                    className="grid grid-cols-2 md:grid-cols-4 gap-4"
                                >
                                    {PULSE_OPTIONS.map((option) => (
                                        <FormItem key={option.value} className="flex items-center space-y-0">
                                            <FormControl>
                                                <RadioGroupItem value={option.value} className="sr-only" />
                                            </FormControl>
                                            <FormLabel className={cn(
                                                "flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border border-white/5 bg-secondary/10 cursor-pointer transition-all hover:bg-white/5 w-full",
                                                field.value === option.value ? "border-primary bg-primary/10 ring-1 ring-primary" : ""
                                            )}>
                                                <option.icon className={cn("h-6 w-6", option.color)} />
                                                <span className="text-[10px] font-black uppercase tracking-tight">{option.label}</span>
                                            </FormLabel>
                                        </FormItem>
                                    ))}
                                </RadioGroup>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            {/* 2. Structured Summaries */}
            <div className="grid grid-cols-1 gap-6">
                <FormField
                    control={form.control}
                    name="accomplishments"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="flex items-center gap-2">
                                <ThumbsUp className="h-3 w-3 text-emerald-500" />
                                Today's Accomplishments
                            </FormLabel>
                            <FormControl>
                                <Textarea
                                    placeholder="List your key wins and completed objectives..."
                                    className="bg-black/20 border-white/5 rounded-2xl min-h-[120px] focus-visible:ring-primary/20"
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="blockers"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="flex items-center gap-2">
                                <Construction className="h-3 w-3 text-rose-500" />
                                Critical Blockers
                            </FormLabel>
                            <FormControl>
                                <Textarea
                                    placeholder="Anything preventing mission success? (Optional)"
                                    className="bg-rose-500/5 border-rose-500/20 rounded-2xl min-h-[100px] focus-visible:ring-rose-500/20"
                                    {...field}
                                />
                            </FormControl>
                            <FormDescription className="text-[9px] uppercase tracking-tighter opacity-40">Admins will receive an alert for critical blockers.</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="nextFocus"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="flex items-center gap-2">
                                <Target className="h-3 w-3 text-primary" />
                                Tomorrow's Focus
                            </FormLabel>
                            <FormControl>
                                <Input
                                    placeholder="Primary objective for the next duty cycle..."
                                    className="bg-black/20 border-white/5 rounded-xl h-12 focus-visible:ring-primary/20"
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            {/* 3. Task Intelligence */}
            <div className="space-y-4">
                <FormLabel className="flex items-center gap-2">
                    <ListTodo className="h-3 w-3 text-primary" />
                    Mission Updates (Task Tracking)
                </FormLabel>
                <div className="p-4 rounded-[2rem] bg-secondary/10 border border-white/5">
                    <ScrollArea className="h-48 pr-4">
                        {areTasksLoading && <div className="flex justify-center py-8"><Loader2 className="animate-spin h-6 w-6 text-primary" /></div>}
                        {!areTasksLoading && activeTasks?.length === 0 && (
                            <div className="py-12 text-center text-muted-foreground opacity-30 italic text-sm">No active missions detected.</div>
                        )}
                        <div className="space-y-3">
                            {activeTasks?.map((task) => {
                                const selectedTask = form.watch('completedTasks')?.find(t => t.taskId === task.id);
                                return (
                                    <div key={task.id} className={cn(
                                        "p-4 rounded-2xl border transition-all",
                                        selectedTask ? "bg-primary/5 border-primary/20" : "bg-black/10 border-white/5"
                                    )}>
                                        <div className="flex items-start gap-4">
                                            <Checkbox
                                                checked={!!selectedTask}
                                                onCheckedChange={(checked) => handleTaskToggle(task, !!checked)}
                                                className="mt-1"
                                            />
                                            <div className="flex-1 space-y-3">
                                                <div className="flex justify-between items-start gap-2">
                                                    <p className="text-sm font-bold leading-tight">{task.title}</p>
                                                    <Badge variant="outline" className="text-[8px] uppercase">{task.status}</Badge>
                                                </div>
                                                {selectedTask && (
                                                    <Input
                                                        placeholder="Brief status update or blockers for this task..."
                                                        className="h-9 bg-background/50 border-white/5 text-xs rounded-lg"
                                                        value={selectedTask.notes || ''}
                                                        onChange={(e) => updateTaskNotes(task.id, e.target.value)}
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </ScrollArea>
                </div>
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full h-14 rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 m3-interactive">
              {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <Send className="mr-2 h-5 w-5" />}
              Submit Report
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
