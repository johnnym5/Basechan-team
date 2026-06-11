"use client";

import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import type { Task, UserProfile, WorkbookRole } from "@/lib/types";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useFirestore, useCollection, updateDocumentNonBlocking, useMemoFirebase } from "@/firebase";
import { doc, collection, query, where } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "../ui/scroll-area";
import { Avatar, AvatarFallback } from "../ui/avatar";

interface ShareTaskDialogProps {
  task: Task;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserProfile: UserProfile;
}

const FormSchema = z.object({
  sharedUsers: z.array(z.string()),
});


export function ShareTaskDialog({ task, open, onOpenChange, currentUserProfile }: ShareTaskDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const usersQuery = useMemoFirebase(() => 
    query(collection(firestore, 'users'), where('orgId', '==', currentUserProfile.orgId))
  , [firestore, currentUserProfile.orgId]);
  const { data: users, isLoading: areUsersLoading } = useCollection<UserProfile>(usersQuery);

  const form = useForm<z.infer<typeof FormSchema>>({
    defaultValues: {
      sharedUsers: task.sharedWith || [],
    },
  });
  
   useEffect(() => {
    form.reset({ sharedUsers: task.sharedWith || [] });
  }, [task, form]);

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    setIsSubmitting(true);
    const taskRef = doc(firestore, 'tasks', task.id);

    try {
        updateDocumentNonBlocking(taskRef, {
            sharedWith: data.sharedUsers
        });
        toast({
            title: "Task Shared",
            description: "The task has been shared with the selected users.",
        });
        onOpenChange(false);
    } catch(error: any) {
        toast({
            variant: "destructive",
            title: "Error",
            description: error.message,
        });
    } finally {
        setIsSubmitting(false);
    }
  }
  
  const selectableUsers = users?.filter(u => u.id !== task.assignedTo);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Task</DialogTitle>
          <DialogDescription>
            Share "{task.title}" with other team members.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
             <FormField
                control={form.control}
                name="sharedUsers"
                render={() => (
                    <FormItem>
                         <div className="mb-4">
                            <FormLabel className="text-base">Team Members</FormLabel>
                        </div>
                        <ScrollArea className="h-64">
                        {areUsersLoading ? <Loader2 className="animate-spin" /> : selectableUsers?.map((item) => {
                            return (
                            <FormField
                                key={item.id}
                                control={form.control}
                                name="sharedUsers"
                                render={({ field }) => {
                                    return (
                                    <FormItem
                                        key={item.id}
                                        className="flex flex-row items-center space-x-3 space-y-0 p-2 rounded-md hover:bg-secondary"
                                    >
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
                                         <Avatar className="h-8 w-8">
                                            <AvatarFallback>{item.fullName.split(" ").map(n=>n[0]).join('')}</AvatarFallback>
                                        </Avatar>
                                        <FormLabel className="font-normal flex-1 cursor-pointer">
                                           {item.fullName}
                                        </FormLabel>
                                    </FormItem>
                                    )
                                }}
                            />
                        )})}
                        </ScrollArea>
                    </FormItem>
                )}
             />

             <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="animate-spin" />}
                    Update Sharing
                </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
