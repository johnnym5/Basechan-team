"use client";

import { useForm, Controller } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import type { Task, UserProfile, WorkbookRole } from "@/lib/types";
import { useState, useEffect } from "react";
import { Loader2, UserPlus, X, ShieldCheck } from "lucide-react";
import { useFirestore, useCollection, updateDocumentNonBlocking, useMemoFirebase } from "@/firebase";
import { doc, collection, query, where } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "../ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Separator } from "../ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Workbook } from "@/lib/types";

interface ShareWorkbookDialogProps {
  workbook: Workbook;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserProfile: UserProfile;
}

interface SharedUser extends UserProfile {
    role: WorkbookRole;
}

const roles: WorkbookRole[] = ["VIEWER", "EDITOR", "MANAGER"];

export function ShareWorkbookDialog({ workbook, open, onOpenChange, currentUserProfile }: ShareWorkbookDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [sharedUsers, setSharedUsers] = useState<SharedUser[]>([]);
  const [owner, setOwner] = useState<UserProfile | null>(null);

  const usersQuery = useMemoFirebase(() => 
    query(collection(firestore, 'users'), where('orgId', '==', currentUserProfile.orgId))
  , [firestore, currentUserProfile.orgId]);
  const { data: allUsers, isLoading: areUsersLoading } = useCollection<UserProfile>(usersQuery);

  useEffect(() => {
    if (allUsers) {
      const ownerProfile = allUsers.find(u => u.id === workbook.createdBy);
      if(ownerProfile) setOwner(ownerProfile);

      const collaborators = (workbook.sharedWith || [])
        .map(share => {
            const userProfile = allUsers.find(u => u.id === share.userId);
            return userProfile ? { ...userProfile, role: share.role } : null;
        })
        .filter((u): u is SharedUser => u !== null);
      
      setSharedUsers(collaborators);
    }
  }, [allUsers, workbook]);


  const availableUsers = allUsers?.filter(
    u => u.id !== workbook.createdBy && !sharedUsers.some(su => su.id === u.id)
  ) || [];
  
  const [invitee, setInvitee] = useState<string | null>(null);
  const [inviteeRole, setInviteeRole] = useState<WorkbookRole>('VIEWER');

  const handleAddUser = () => {
    if (!invitee) return;
    const userToAdd = allUsers?.find(u => u.id === invitee);
    if (userToAdd) {
        setSharedUsers(prev => [...prev, { ...userToAdd, role: inviteeRole }]);
        setInvitee(null);
    }
  };

  const handleRemoveUser = (userId: string) => {
    setSharedUsers(prev => prev.filter(u => u.id !== userId));
  }

  const handleRoleChange = (userId: string, newRole: WorkbookRole) => {
    setSharedUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
  }

  async function onSubmit() {
    setIsSubmitting(true);
    const workbookRef = doc(firestore, 'workbooks', workbook.id);

    const newSharedWith = sharedUsers.map(u => ({ userId: u.id, role: u.role }));
    const newVisibleTo = [workbook.createdBy, ...sharedUsers.map(u => u.id)];
    
    try {
        updateDocumentNonBlocking(workbookRef, {
            sharedWith: newSharedWith,
            visibleTo: newVisibleTo,
        });
        toast({
            title: "Permissions Updated",
            description: "Workbook sharing settings have been saved.",
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
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Share "{workbook.title}"</DialogTitle>
          <DialogDescription>
            Manage who has access to this workbook.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
            <div className="space-y-2">
                <h4 className="font-medium text-sm">People with access</h4>
                <ScrollArea className="h-48 pr-4">
                    <div className="space-y-2">
                        {owner && (
                            <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8"><AvatarFallback>{owner.fullName.split(" ").map(n=>n[0]).join('')}</AvatarFallback></Avatar>
                                <div className="flex-1">
                                    <p className="font-semibold text-sm">{owner.fullName}</p>
                                    <p className="text-xs text-muted-foreground">{owner.email}</p>
                                </div>
                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                    <ShieldCheck className="h-4 w-4 text-primary"/> Owner
                                </div>
                            </div>
                        )}
                         {sharedUsers.map(user => (
                             <div key={user.id} className="flex items-center gap-3">
                                <Avatar className="h-8 w-8"><AvatarFallback>{user.fullName.split(" ").map(n=>n[0]).join('')}</AvatarFallback></Avatar>
                                <div className="flex-1">
                                    <p className="font-semibold text-sm">{user.fullName}</p>
                                    <p className="text-xs text-muted-foreground">{user.email}</p>
                                </div>
                                 <Select value={user.role} onValueChange={(val: WorkbookRole) => handleRoleChange(user.id, val)}>
                                    <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {roles.map(r => <SelectItem key={r} value={r} className="text-xs">{r}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleRemoveUser(user.id)}><X className="h-4 w-4"/></Button>
                            </div>
                         ))}
                    </div>
                </ScrollArea>
            </div>
            <Separator />
            <div className="space-y-2">
                <h4 className="font-medium text-sm">Invite new members</h4>
                 <div className="flex items-center gap-2">
                    <Select onValueChange={setInvitee} value={invitee || undefined}>
                        <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Select a user..." />
                        </SelectTrigger>
                        <SelectContent>
                            {areUsersLoading ? <SelectItem value="loading" disabled>Loading...</SelectItem> :
                                availableUsers.map(user => <SelectItem key={user.id} value={user.id}>{user.fullName}</SelectItem>)
                            }
                        </SelectContent>
                    </Select>
                     <Select onValueChange={(val: WorkbookRole) => setInviteeRole(val)} value={inviteeRole}>
                        <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                        <SelectContent>
                             {roles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Button onClick={handleAddUser} disabled={!invitee}>
                        <UserPlus className="mr-2" /> Add
                    </Button>
                </div>
            </div>
        </div>
        <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={onSubmit} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="animate-spin mr-2" />}
                Save Changes
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
