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
import type { Announcement, UserProfile, Notification } from "@/lib/types";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { ScrollArea } from "../ui/scroll-area";
import { Checkbox } from "../ui/checkbox";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { sanitizeInput } from "@/lib/utils";

const formSchema = z.object({
  title: z.string().min(5, { message: "Title must be at least 5 characters." }),
  content: z.string().min(10, { message: "Content must be at least 10 characters." }),
  isPinned: z.boolean().default(false),
  visibility: z.enum(["ALL", "RESTRICTED"]).default("ALL"),
  visibleTo: z.array(z.string()).optional(),
});

type FormData = z.infer<typeof formSchema>;

interface NewAnnouncementFormProps {
  userProfile: UserProfile;
  onSuccess?: () => void;
}

export function NewAnnouncementForm({ userProfile, onSuccess }: NewAnnouncementFormProps) {
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
    if (!firestore) return;
    setIsLoading(true);

    const visibleToArray = values.visibility === 'ALL'
      ? ['ALL']
      : values.visibleTo || [];

    if (values.visibility === 'RESTRICTED' && visibleToArray.length === 0) {
        toast({ variant: "destructive", title: "Validation Error", description: "Select at least one member." });
        setIsLoading(false);
        return;
    }

    try {
      const now = new Date().toISOString();
      const newAnnouncement: Omit<Announcement, 'id'> = {
        orgId: userProfile.orgId,
        title: sanitizeInput(values.title),
        content: sanitizeInput(values.content),
        isPinned: values.isPinned,
        authorId: userProfile.id,
        authorName: userProfile.fullName,
        createdAt: now,
        viewedBy: [],
        visibleTo: visibleToArray,
      };

      const annRef = await addDocumentNonBlocking(collection(firestore, 'announcements'), newAnnouncement);

      if (annRef) {
          const targetUserIds = values.visibility === 'ALL'
            ? users?.map(u => u.id).filter(id => id !== userProfile.id) || []
            : values.visibleTo?.filter(id => id !== userProfile.id) || [];

          for (const userId of targetUserIds) {
              const notification: Omit<Notification, 'id'> = {
                  orgId: userProfile.orgId,
                  userId: userId,
                  title: `Broadcast: ${newAnnouncement.title}`,
                  description: newAnnouncement.content.substring(0, 100) + '...',
                  href: `/?panel=announcement&id=${annRef.id}`,
                  isRead: false,
                  createdAt: now,
              };
              addDocumentNonBlocking(collection(firestore, 'notifications'), notification);
          }
      }

      toast({ title: "Announcement Posted", description: "Broadcast live." });
      form.reset();
      if (onSuccess) onSuccess();
    } catch (error: any) {
        toast({ variant: "destructive", title: "Failed", description: error.message });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control} name="title" render={({ field }) => (
            <FormItem>
                <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-60">Headline</FormLabel>
                <FormControl><Input placeholder="Brief title..." {...field} className="h-10 rounded-xl" /></FormControl>
                <FormMessage />
            </FormItem>
        )}/>
        <FormField control={form.control} name="content" render={({ field }) => (
            <FormItem>
                <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-60">Details</FormLabel>
                <FormControl><Textarea placeholder="Broadcast content..." {...field} className="rounded-xl min-h-[80px]" /></FormControl>
                <FormMessage />
            </FormItem>
        )}/>

        <FormField control={form.control} name="visibility" render={({ field }) => (
            <FormItem className="space-y-3">
                <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-60">Visibility</FormLabel>
                <FormControl>
                    <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex space-x-4">
                        <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="ALL" /></FormControl><FormLabel className="text-xs font-bold">All Staff</FormLabel></FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="RESTRICTED" /></FormControl><FormLabel className="text-xs font-bold">Restricted</FormLabel></FormItem>
                    </RadioGroup>
                </FormControl>
            <FormMessage /></FormItem>
        )}/>

        {visibility === 'RESTRICTED' && (
            <FormField control={form.control} name="visibleTo" render={() => (
                <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-60">Target Members</FormLabel>
                    <ScrollArea className="h-40 rounded-xl border bg-background/50"><div className="p-3 space-y-1">
                    {areUsersLoading ? <Loader2 className="animate-spin h-4 w-4 mx-auto" /> : users?.filter(u => u.id !== userProfile.id).map((user) => (
                        <FormField key={user.id} control={form.control} name="visibleTo"
                            render={({ field }) => (
                                <FormItem key={user.id} className="flex flex-row items-center space-x-3 space-y-0 cursor-pointer p-2 hover:bg-secondary rounded-lg transition-all">
                                    <FormControl><Checkbox checked={field.value?.includes(user.id)} onCheckedChange={(checked) => {
                                        return checked ? field.onChange([...(field.value || []), user.id]) : field.onChange(field.value?.filter((value) => value !== user.id))
                                    }} /></FormControl>
                                    <Avatar className="h-6 w-6"><AvatarFallback className="text-[8px]">{user.fullName.split(' ').map(n=>n[0]).join('')}</AvatarFallback></Avatar>
                                    <FormLabel className="text-[10px] font-bold flex-1 cursor-pointer">{user.fullName}</FormLabel>
                                </FormItem>
                            )}
                        />
                    ))}
                    </div></ScrollArea>
                <FormMessage /></FormItem>
            )}/>
        )}

        <FormField control={form.control} name="isPinned" render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-xl border-2 border-dashed p-3">
                <div className="space-y-0.5"><FormLabel className="text-[10px] font-black uppercase tracking-widest">Pin Broadast</FormLabel><FormDescription className="text-[8px] font-bold">Sticky at top.</FormDescription></div>
                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange}/></FormControl>
            </FormItem>
        )}/>
        <Button type="submit" className="w-full h-12 rounded-xl font-black uppercase tracking-widest" disabled={isLoading}>
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Megaphone className="mr-2 h-4 w-4" />}
          Dispatch Broadcast
        </Button>
      </form>
    </Form>
  );
}
