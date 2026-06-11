"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useFirestore, useCollection, addDocumentNonBlocking, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import type { Chat, UserProfile } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { sanitizeInput } from "@/lib/utils";
import { ScrollArea } from "../ui/scroll-area";
import { Avatar, AvatarFallback } from "../ui/avatar";

const formSchema = z.object({
  name: z.string().min(3, { message: "Channel name must be at least 3 characters." }),
  participants: z.array(z.string()).min(1, "You must select at least one other member."),
});

type FormData = z.infer<typeof formSchema>;

interface CreateChannelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserProfile: UserProfile;
}

export function CreateChannelDialog({ open, onOpenChange, currentUserProfile }: CreateChannelDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const usersQuery = useMemoFirebase(() => 
    query(collection(firestore, 'users'), where('orgId', '==', currentUserProfile.orgId))
  , [firestore, currentUserProfile.orgId]);
  const { data: allUsers, isLoading: areUsersLoading } = useCollection<UserProfile>(usersQuery);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", participants: [] },
  });

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) form.reset();
    onOpenChange(isOpen);
  };

  async function onSubmit(values: FormData) {
    if (!firestore || !allUsers) return;
    setIsLoading(true);

    const allParticipantIds = [currentUserProfile.id, ...values.participants];
    const participantProfiles = allParticipantIds.reduce((acc, id) => {
        const user = allUsers.find(u => u.id === id);
        if (user) acc[id] = { fullName: user.fullName };
        return acc;
    }, {} as Chat['participantProfiles']);

    try {
        const newChannel: Omit<Chat, 'id'> = {
            orgId: currentUserProfile.orgId,
            type: 'CHANNEL',
            name: sanitizeInput(values.name),
            createdBy: currentUserProfile.id,
            participants: allParticipantIds,
            participantProfiles,
            updatedAt: new Date().toISOString(),
        };

        await addDocumentNonBlocking(collection(firestore, 'chats'), newChannel);
        
        toast({ title: "Channel Created", description: `Channel #${values.name} is now ready.` });
        handleOpenChange(false);
    } catch (error: any) {
        toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
        setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Channel</DialogTitle>
          <DialogDescription>
            Start a new group conversation with your team.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Channel Name</FormLabel>
                            <FormControl><Input placeholder="e.g., project-pegasus" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="participants"
                    render={() => (
                        <FormItem>
                            <FormLabel>Add Members</FormLabel>
                            <ScrollArea className="h-48 rounded-md border">
                                <div className="p-4 space-y-2">
                                {areUsersLoading ? <Loader2 className="animate-spin" /> : allUsers?.filter(u => u.id !== currentUserProfile.id).map((user) => (
                                    <FormField
                                        key={user.id}
                                        control={form.control}
                                        name="participants"
                                        render={({ field }) => {
                                            return (
                                                <FormItem key={user.id} className="flex flex-row items-center space-x-3 space-y-0 cursor-pointer p-2 hover:bg-secondary rounded-md">
                                                    <FormControl><Checkbox checked={field.value?.includes(user.id)} onCheckedChange={(checked) => {
                                                        return checked ? field.onChange([...field.value, user.id]) : field.onChange(field.value?.filter((value) => value !== user.id))
                                                    }} /></FormControl>
                                                    <Avatar className="h-8 w-8">
                                                        <AvatarFallback>{user.fullName.split(' ').map(n=>n[0]).join('')}</AvatarFallback>
                                                    </Avatar>
                                                    <FormLabel className="font-normal flex-1 cursor-pointer">{user.fullName}</FormLabel>
                                                </FormItem>
                                            )
                                        }}
                                    />
                                ))}
                                </div>
                            </ScrollArea>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Channel
                </Button>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
