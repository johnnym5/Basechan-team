<<<<<<< HEAD

"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useFirestore, useUser, updateDocumentNonBlocking, addDocumentNonBlocking } from "@/firebase";
import { doc, arrayUnion, collection } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import type { Task, UserProfile, ActivityEntry, Notification } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { sanitizeInput } from "@/lib/utils";

const formSchema = z.object({
  brief: z.string().min(10, { message: "Brief must be at least 10 characters." }),
});

type FormData = z.infer<typeof formSchema>;

interface CompletionBriefDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task;
  userProfile: UserProfile;
}

export function CompletionBriefDialog({ isOpen, onOpenChange, task, userProfile }: CompletionBriefDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { brief: "" },
  });

  async function onSubmit(values: FormData) {
    if (!firestore) return;
    setIsLoading(true);

    try {
        const taskRef = doc(firestore, 'tasks', task.id);
        const now = new Date().toISOString();
        const nextStatus = 'AWAITING_REVIEW';
        
        const commentEntry: ActivityEntry = {
            type: 'COMMENT',
            actorId: userProfile.id,
            actorName: userProfile.fullName,
            timestamp: now,
            text: sanitizeInput(values.brief),
        };
        
        const logEntry: ActivityEntry = {
            type: 'LOG',
            actorId: userProfile.id,
            actorName: userProfile.fullName,
            timestamp: now,
            text: `submitted the mission for review.`,
            fromStatus: task.status,
            toStatus: nextStatus,
        };

        updateDocumentNonBlocking(taskRef, {
            status: nextStatus,
            activity: arrayUnion(commentEntry, logEntry)
        });

        if (userProfile.id !== task.createdBy) {
            const notification: Omit<Notification, 'id'> = {
                orgId: userProfile.orgId,
                userId: task.createdBy,
                title: 'Mission Awaiting Review',
                description: `${userProfile.fullName} has submitted "${task.title}" for your review.`,
                href: `/tasks?taskId=${task.id}`,
                isRead: false,
                createdAt: now,
            };
            addDocumentNonBlocking(collection(firestore, 'notifications'), notification);
        }

      toast({ title: "Task Submitted for Review", description: "Your completion brief has been logged." });
      form.reset();
      onOpenChange(false);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Submit Completion Brief</DialogTitle>
          <DialogDescription>
            Provide a summary of the work you completed for the task: "{task.title}".
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <FormField
                    control={form.control}
                    name="brief"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Completion Brief</FormLabel>
                        <FormControl>
                            <Textarea placeholder="Describe the outcome and any relevant details..." {...field} rows={5} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Submit for Review
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
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useFirestore, useUser, updateDocumentNonBlocking, addDocumentNonBlocking } from "@/firebase";
import { doc, arrayUnion, collection } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import type { Task, UserProfile, ActivityEntry, Notification } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { sanitizeInput } from "@/lib/utils";

const formSchema = z.object({
  brief: z.string().min(10, { message: "Brief must be at least 10 characters." }),
});

type FormData = z.infer<typeof formSchema>;

interface CompletionBriefDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task;
  userProfile: UserProfile;
}

export function CompletionBriefDialog({ isOpen, onOpenChange, task, userProfile }: CompletionBriefDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { brief: "" },
  });

  async function onSubmit(values: FormData) {
    if (!firestore) return;
    setIsLoading(true);

    try {
        const taskRef = doc(firestore, 'tasks', task.id);
        const now = new Date().toISOString();
        const nextStatus = 'AWAITING_REVIEW';
        
        const commentEntry: ActivityEntry = {
            type: 'COMMENT',
            actorId: userProfile.id,
            actorName: userProfile.fullName,
            timestamp: now,
            text: sanitizeInput(values.brief),
        };
        
        const logEntry: ActivityEntry = {
            type: 'LOG',
            actorId: userProfile.id,
            actorName: userProfile.fullName,
            timestamp: now,
            text: `submitted the mission for review.`,
            fromStatus: task.status,
            toStatus: nextStatus,
        };

        updateDocumentNonBlocking(taskRef, {
            status: nextStatus,
            activity: arrayUnion(commentEntry, logEntry)
        });

        if (userProfile.id !== task.createdBy) {
            const notification: Omit<Notification, 'id'> = {
                orgId: userProfile.orgId,
                userId: task.createdBy,
                title: 'Mission Awaiting Review',
                description: `${userProfile.fullName} has submitted "${task.title}" for your review.`,
                href: `/tasks?taskId=${task.id}`,
                isRead: false,
                createdAt: now,
            };
            addDocumentNonBlocking(collection(firestore, 'notifications'), notification);
        }

      toast({ title: "Task Submitted for Review", description: "Your completion brief has been logged." });
      form.reset();
      onOpenChange(false);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Submit Completion Brief</DialogTitle>
          <DialogDescription>
            Provide a summary of the work you completed for the task: "{task.title}".
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <FormField
                    control={form.control}
                    name="brief"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Completion Brief</FormLabel>
                        <FormControl>
                            <Textarea placeholder="Describe the outcome and any relevant details..." {...field} rows={5} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Submit for Review
                </Button>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
>>>>>>> 8c2f2c7ee9c25fe21fb0f2e265f70b5d1d4e553a
