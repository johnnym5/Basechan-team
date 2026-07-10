<<<<<<< HEAD
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useFirestore, updateDocumentNonBlocking, useCollection, useMemoFirebase } from "@/firebase";
import { doc, collection, query, where } from "firebase/firestore";
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

interface EditAnnouncementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  announcement: Announcement;
  userProfile: UserProfile | null;
}

export function EditAnnouncementDialog({ open, onOpenChange, announcement, userProfile }: EditAnnouncementDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const usersQuery = useMemoFirebase(() =>
    (firestore && userProfile) ? query(collection(firestore, 'users'), where('orgId', '==', userProfile.orgId)) : null,
  [firestore, userProfile]);
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
  
  useEffect(() => {
    if (announcement) {
        const isRestricted = !announcement.visibleTo.includes('ALL');
        form.reset({
            title: announcement.title,
            content: announcement.content,
            isPinned: announcement.isPinned,
            visibility: isRestricted ? 'RESTRICTED' : 'ALL',
            visibleTo: isRestricted ? announcement.visibleTo : [],
        })
    }
  }, [announcement, form]);

  async function onSubmit(values: FormData) {
    if (!firestore) return;
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
      const annRef = doc(firestore, 'announcements', announcement.id);
      updateDocumentNonBlocking(annRef, {
        title: sanitizeInput(values.title),
        content: sanitizeInput(values.content),
        isPinned: values.isPinned,
        visibleTo: visibleToArray,
      });

      toast({
        title: "Announcement Updated",
        description: "Your changes have been saved.",
      });

      onOpenChange(false);
    } catch (error: any) {
        if (error.code !== 'permission-denied') {
            toast({
                variant: "destructive",
                title: "Failed to update announcement",
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

  const visibility = form.watch("visibility");

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Announcement</DialogTitle>
          <DialogDescription>
            Make changes to your announcement.
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
                        {areUsersLoading ? <Loader2 className="animate-spin" /> : users?.filter(u => u.id !== userProfile?.id).map((user) => (
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
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save Changes"}
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useFirestore, updateDocumentNonBlocking, useCollection, useMemoFirebase } from "@/firebase";
import { doc, collection, query, where } from "firebase/firestore";
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

interface EditAnnouncementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  announcement: Announcement;
  userProfile: UserProfile | null;
}

export function EditAnnouncementDialog({ open, onOpenChange, announcement, userProfile }: EditAnnouncementDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const usersQuery = useMemoFirebase(() =>
    (firestore && userProfile) ? query(collection(firestore, 'users'), where('orgId', '==', userProfile.orgId)) : null,
  [firestore, userProfile]);
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
  
  useEffect(() => {
    if (announcement) {
        const isRestricted = !announcement.visibleTo.includes('ALL');
        form.reset({
            title: announcement.title,
            content: announcement.content,
            isPinned: announcement.isPinned,
            visibility: isRestricted ? 'RESTRICTED' : 'ALL',
            visibleTo: isRestricted ? announcement.visibleTo : [],
        })
    }
  }, [announcement, form]);

  async function onSubmit(values: FormData) {
    if (!firestore) return;
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
      const annRef = doc(firestore, 'announcements', announcement.id);
      updateDocumentNonBlocking(annRef, {
        title: sanitizeInput(values.title),
        content: sanitizeInput(values.content),
        isPinned: values.isPinned,
        visibleTo: visibleToArray,
      });

      toast({
        title: "Announcement Updated",
        description: "Your changes have been saved.",
      });

      onOpenChange(false);
    } catch (error: any) {
        if (error.code !== 'permission-denied') {
            toast({
                variant: "destructive",
                title: "Failed to update announcement",
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

  const visibility = form.watch("visibility");

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Announcement</DialogTitle>
          <DialogDescription>
            Make changes to your announcement.
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
                        {areUsersLoading ? <Loader2 className="animate-spin" /> : users?.filter(u => u.id !== userProfile?.id).map((user) => (
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
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save Changes"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
>>>>>>> 8c2f2c7ee9c25fe21fb0f2e265f70b5d1d4e553a
