"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2, Megaphone } from "lucide-react";
import { useState } from "react";
import { useFirestore, addDocumentNonBlocking, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import type { Announcement, UserProfile } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { ScrollArea } from "../ui/scroll-area";
import { Checkbox } from "../ui/checkbox";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { sanitizeInput } from "@/lib/utils";

const formSchema = z.object({
  title: z.string().min(5, { message: "Title must be at least 5 characters long." }),
  content: z.string().min(10, { message: "Content must be at least 10 characters long." }),
  isPinned: z.boolean().default(false),
  visibility: z.enum(["ALL", "RESTRICTED"]).default("ALL"),
  visibleTo: z.array(z.string()).optional(),
});

type FormData = z.infer<typeof formSchema>;

interface NewAnnouncementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userProfile: UserProfile;
}

export function NewAnnouncementDialog({ open, onOpenChange, userProfile }: NewAnnouncementDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const usersQuery = useMemoFirebase(() =>
    firestore ? query(collection(firestore, 'users'), where('orgId', '==', userProfile.orgId)) : null,
  [firestore, userProfile.orgId]);
  const { data: users, isLoading: areUsersLoading } = useCollection<UserProfile>(usersQuery);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      content: "",
      isPinned: false,
      visibility: "ALL",
      visibleTo: [],
    },
  });

  const visibility = form.watch("visibility");

  async function onSubmit(values: FormData) {
    setIsLoading(true);

    const visibleToArray = values.visibility === 'ALL'
      ? ['ALL']
      : values.visibleTo || [];
    
    if (values.visibility === 'RESTRICTED' && visibleToArray.length === 0) {
        toast({
            variant: "destructive",
            title: "Validation Error",
            description: "Please select at least one member for restricted visibility.",
        });
        setIsLoading(false);
        return;
    }

    try {
      const newAnnouncement: Omit<Announcement, 'id'> = {
        orgId: userProfile.orgId,
        title: sanitizeInput(values.title),
        content: sanitizeInput(values.content),
        isPinned: values.isPinned,
        authorId: userProfile.id,
        authorName: userProfile.fullName,
        createdAt: new Date().toISOString(),
        viewedBy: [],
        visibleTo: visibleToArray,
      };

      await addDocumentNonBlocking(collection(firestore, 'announcements'), newAnnouncement);

      toast({
        title: "Announcement Posted",
        description: "Your announcement is now visible to the organization.",
      });

      form.reset();
      onOpenChange(false);
    } catch (error: any) {
      if (error.code !== 'permission-denied') {
        toast({
          variant: "destructive",
          title: "Failed to post announcement",
          description: error.message || "An unexpected error occurred.",
        });
      }
    } finally {
      setIsLoading(false);
    }
  }
  
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
        form.reset();
    }
    onOpenChange(isOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Announcement</DialogTitle>
          <DialogDescription>
            Broadcast a message to everyone in your organization.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem><FormLabel>Title</FormLabel><FormControl><Input placeholder="e.g., Office Closed on Monday" {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="content" render={({ field }) => (
                <FormItem><FormLabel>Content</FormLabel><FormControl><Textarea placeholder="Provide the full details..." {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            
            <FormField control={form.control} name="visibility" render={({ field }) => (
                <FormItem className="space-y-3"><FormLabel>Visibility</FormLabel>
                    <FormControl>
                        <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex space-x-4">
                            <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="ALL" /></FormControl><FormLabel className="font-normal">All Staff</FormLabel></FormItem>
                            <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="RESTRICTED" /></FormControl><FormLabel className="font-normal">Specific Members</FormLabel></FormItem>
                        </RadioGroup>
                    </FormControl>
                <FormMessage /></FormItem>
            )}/>

            {visibility === 'RESTRICTED' && (
                <FormField control={form.control} name="visibleTo" render={() => (
                    <FormItem><FormLabel>Select Members</FormLabel>
                        <ScrollArea className="h-40 rounded-md border"><div className="p-4 space-y-2">
                        {areUsersLoading ? <Loader2 className="animate-spin" /> : users?.filter(u => u.id !== userProfile.id).map((user) => (
                            <FormField key={user.id} control={form.control} name="visibleTo"
                                render={({ field }) => (
                                    <FormItem key={user.id} className="flex flex-row items-center space-x-3 space-y-0 cursor-pointer p-2 hover:bg-secondary rounded-md">
                                        <FormControl><Checkbox checked={field.value?.includes(user.id)} onCheckedChange={(checked) => {
                                            return checked ? field.onChange([...(field.value || []), user.id]) : field.onChange(field.value?.filter((value) => value !== user.id))
                                        }} /></FormControl>
                                        <Avatar className="h-8 w-8"><AvatarFallback>{user.fullName.split(' ').map(n=>n[0]).join('')}</AvatarFallback></Avatar>
                                        <FormLabel className="font-normal flex-1 cursor-pointer">{user.fullName}</FormLabel>
                                    </FormItem>
                                )}
                            />
                        ))}
                        </div></ScrollArea>
                    <FormMessage /></FormItem>
                )}/>
            )}

            <FormField control={form.control} name="isPinned" render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5"><FormLabel>Pin Announcement</FormLabel><FormDescription>Pinned items stay at the top and track views.</FormDescription></div>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange}/></FormControl>
                </FormItem>
            )}/>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Megaphone className="mr-2 h-4 w-4" />}
              Post Announcement
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
