<<<<<<< HEAD
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useFirestore, useCollection, addDocumentNonBlocking, useMemoFirebase } from "@/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import type { Task, UserProfile, ActivityEntry, Notification } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "../ui/scroll-area";
import { Skeleton } from "../ui/skeleton";

const formSchema = z.object({
  taskId: z.string({ required_error: "Please select a task." }),
});

type FormData = z.infer<typeof formSchema>;

interface RequestAssistanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetUser: UserProfile;
  currentUserProfile: UserProfile;
}

export function RequestAssistanceDialog({ open, onOpenChange, targetUser, currentUserProfile }: RequestAssistanceDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const myTasksQuery = useMemoFirebase(() => 
    query(
      collection(firestore, 'tasks'),
      where('assignedTo', '==', currentUserProfile.id),
      where('status', 'in', ['QUEUED', 'ACTIVE'])
    )
  , [firestore, currentUserProfile.id]);
  const { data: myTasks, isLoading: areTasksLoading } = useCollection<Task>(myTasksQuery);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  async function onSubmit(values: FormData) {
    setIsSubmitting(true);

    const selectedTask = myTasks?.find(t => t.id === values.taskId);
    if (!selectedTask) {
        toast({ variant: 'destructive', title: 'Error', description: 'Selected task not found.' });
        setIsSubmitting(false);
        return;
    }
    
    if (!firestore) return;

    try {
        const tasksRef = collection(firestore, 'tasks');
        const q = query(tasksRef, where('orgId', '==', currentUserProfile.orgId));
        const orgTasksSnapshot = await getDocs(q);
        const newSerialNo = `TSK-${String(orgTasksSnapshot.size + 1).padStart(5, '0')}`;
        
        const now = new Date().toISOString();
        const initialActivity: ActivityEntry = {
            type: 'LOG',
            actorId: currentUserProfile.id,
            actorName: currentUserProfile.fullName,
            timestamp: now,
            text: `requested assistance from ${targetUser.fullName}.`,
        };
        
        const assistanceTask: Omit<Task, 'id'> = {
            serialNo: newSerialNo,
            orgId: currentUserProfile.orgId,
            title: `Assistance Request: ${selectedTask.title}`,
            description: `Requesting assistance for the mission: "${selectedTask.title}"`,
            assignedTo: targetUser.id,
            assignedToName: targetUser.fullName,
            priority: 'LEVEL_2',
            status: 'QUEUED',
            createdBy: currentUserProfile.id,
            createdAt: now,
            activity: [initialActivity],
            type: 'ASSISTANCE_REQUEST',
            relatedTaskId: selectedTask.id,
            requesterId: currentUserProfile.id,
            requesterName: currentUserProfile.fullName,
        };

        const taskDocRef = await addDocumentNonBlocking(collection(firestore, 'tasks'), assistanceTask);

        if (taskDocRef) {
            const notification: Omit<Notification, 'id'> = {
                orgId: currentUserProfile.orgId,
                userId: targetUser.id,
                title: 'Assistance Requested',
                description: `${currentUserProfile.fullName} requested your help on a task.`,
                href: `/tasks?taskId=${taskDocRef.id}`,
                isRead: false,
                createdAt: now,
            };
            addDocumentNonBlocking(collection(firestore, 'notifications'), notification);
        }
        
        toast({ title: "Request Sent", description: `Your request for assistance has been sent to ${targetUser.fullName}.`});
        form.reset();
        onOpenChange(false);
    } catch (error: any) {
        toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request Assistance</DialogTitle>
          <DialogDescription>
            Ask {targetUser.fullName} for help on one of your active missions.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                 <FormField
                    control={form.control}
                    name="taskId"
                    render={({ field }) => (
                        <FormItem className="space-y-3">
                            <FormLabel>Select a mission to share:</FormLabel>
                            <FormControl>
                                <ScrollArea className="h-48">
                                    <RadioGroup
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                        className="flex flex-col space-y-1 p-1"
                                    >
                                        {areTasksLoading && <Skeleton className="h-10 w-full" />}
                                        {!areTasksLoading && myTasks?.map(task => (
                                            <FormItem key={task.id} className="flex items-center space-x-3 space-y-0 p-2 rounded-md hover:bg-secondary">
                                                <FormControl>
                                                    <RadioGroupItem value={task.id} />
                                                </FormControl>
                                                <Label htmlFor={task.id} className="font-normal flex-1 cursor-pointer">{task.title}</Label>
                                            </FormItem>
                                        ))}
                                        {!areTasksLoading && myTasks?.length === 0 && (
                                            <p className="text-center text-sm text-muted-foreground pt-12">You have no active tasks to request assistance for.</p>
                                        )}
                                    </RadioGroup>
                                </ScrollArea>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <Button type="submit" className="w-full" disabled={isSubmitting || !form.formState.isValid}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Send Request
                </Button>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

=======
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useFirestore, useCollection, addDocumentNonBlocking, useMemoFirebase } from "@/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import type { Task, UserProfile, ActivityEntry, Notification } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "../ui/scroll-area";
import { Skeleton } from "../ui/skeleton";

const formSchema = z.object({
  taskId: z.string({ required_error: "Please select a task." }),
});

type FormData = z.infer<typeof formSchema>;

interface RequestAssistanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetUser: UserProfile;
  currentUserProfile: UserProfile;
}

export function RequestAssistanceDialog({ open, onOpenChange, targetUser, currentUserProfile }: RequestAssistanceDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const myTasksQuery = useMemoFirebase(() => 
    query(
      collection(firestore, 'tasks'),
      where('assignedTo', '==', currentUserProfile.id),
      where('status', 'in', ['QUEUED', 'ACTIVE'])
    )
  , [firestore, currentUserProfile.id]);
  const { data: myTasks, isLoading: areTasksLoading } = useCollection<Task>(myTasksQuery);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  async function onSubmit(values: FormData) {
    setIsSubmitting(true);

    const selectedTask = myTasks?.find(t => t.id === values.taskId);
    if (!selectedTask) {
        toast({ variant: 'destructive', title: 'Error', description: 'Selected task not found.' });
        setIsSubmitting(false);
        return;
    }
    
    if (!firestore) return;

    try {
        const tasksRef = collection(firestore, 'tasks');
        const q = query(tasksRef, where('orgId', '==', currentUserProfile.orgId));
        const orgTasksSnapshot = await getDocs(q);
        const newSerialNo = `TSK-${String(orgTasksSnapshot.size + 1).padStart(5, '0')}`;
        
        const now = new Date().toISOString();
        const initialActivity: ActivityEntry = {
            type: 'LOG',
            actorId: currentUserProfile.id,
            actorName: currentUserProfile.fullName,
            timestamp: now,
            text: `requested assistance from ${targetUser.fullName}.`,
        };
        
        const assistanceTask: Omit<Task, 'id'> = {
            serialNo: newSerialNo,
            orgId: currentUserProfile.orgId,
            title: `Assistance Request: ${selectedTask.title}`,
            description: `Requesting assistance for the mission: "${selectedTask.title}"`,
            assignedTo: targetUser.id,
            assignedToName: targetUser.fullName,
            priority: 'LEVEL_2',
            status: 'QUEUED',
            createdBy: currentUserProfile.id,
            createdAt: now,
            activity: [initialActivity],
            type: 'ASSISTANCE_REQUEST',
            relatedTaskId: selectedTask.id,
            requesterId: currentUserProfile.id,
            requesterName: currentUserProfile.fullName,
        };

        const taskDocRef = await addDocumentNonBlocking(collection(firestore, 'tasks'), assistanceTask);

        if (taskDocRef) {
            const notification: Omit<Notification, 'id'> = {
                orgId: currentUserProfile.orgId,
                userId: targetUser.id,
                title: 'Assistance Requested',
                description: `${currentUserProfile.fullName} requested your help on a task.`,
                href: `/tasks?taskId=${taskDocRef.id}`,
                isRead: false,
                createdAt: now,
            };
            addDocumentNonBlocking(collection(firestore, 'notifications'), notification);
        }
        
        toast({ title: "Request Sent", description: `Your request for assistance has been sent to ${targetUser.fullName}.`});
        form.reset();
        onOpenChange(false);
    } catch (error: any) {
        toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request Assistance</DialogTitle>
          <DialogDescription>
            Ask {targetUser.fullName} for help on one of your active missions.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                 <FormField
                    control={form.control}
                    name="taskId"
                    render={({ field }) => (
                        <FormItem className="space-y-3">
                            <FormLabel>Select a mission to share:</FormLabel>
                            <FormControl>
                                <ScrollArea className="h-48">
                                    <RadioGroup
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                        className="flex flex-col space-y-1 p-1"
                                    >
                                        {areTasksLoading && <Skeleton className="h-10 w-full" />}
                                        {!areTasksLoading && myTasks?.map(task => (
                                            <FormItem key={task.id} className="flex items-center space-x-3 space-y-0 p-2 rounded-md hover:bg-secondary">
                                                <FormControl>
                                                    <RadioGroupItem value={task.id} />
                                                </FormControl>
                                                <Label htmlFor={task.id} className="font-normal flex-1 cursor-pointer">{task.title}</Label>
                                            </FormItem>
                                        ))}
                                        {!areTasksLoading && myTasks?.length === 0 && (
                                            <p className="text-center text-sm text-muted-foreground pt-12">You have no active tasks to request assistance for.</p>
                                        )}
                                    </RadioGroup>
                                </ScrollArea>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <Button type="submit" className="w-full" disabled={isSubmitting || !form.formState.isValid}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Send Request
                </Button>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

>>>>>>> 8c2f2c7ee9c25fe21fb0f2e265f70b5d1d4e553a
    