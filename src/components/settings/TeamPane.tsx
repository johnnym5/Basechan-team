'use client';

import { useState, useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase, useAuth } from '@/firebase';
import { collection, query, where, doc, deleteDoc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Trash2, Edit, Loader2, Search, KeyRound } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import { Input } from '../ui/input';
import { InviteUserDialog } from './InviteUserDialog';
import { EditUserDialog } from './EditUserDialog';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { sendPasswordResetEmail } from 'firebase/auth';
import { Permissions } from '@/hooks/usePermissions';


interface TeamPaneProps {
    currentUserProfile: UserProfile;
    permissions: Permissions;
}

export function TeamPane({ currentUserProfile, permissions }: TeamPaneProps) {
    const firestore = useFirestore();
    const auth = useAuth();
    const { toast } = useToast();
    const [isInviteOpen, setIsInviteOpen] = useState(false);
    const [userToEdit, setUserToEdit] = useState<UserProfile | null>(null);
    const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const usersQuery = useMemoFirebase(() =>
        firestore ? query(collection(firestore, 'users'), where('orgId', '==', currentUserProfile.orgId)) : null
    , [firestore, currentUserProfile.orgId]);

    const { data: users, isLoading } = useCollection<UserProfile>(usersQuery);
    
    const filteredUsers = useMemo(() => {
        if (!users) return [];
        if (!searchTerm) return users;
        return users.filter(user => 
            user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.position.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [users, searchTerm]);

    // Admins cannot be deleted
    const canBeDeleted = (user: UserProfile) => {
        return user.position !== "Organization Administrator" && user.id !== currentUserProfile.id;
    }

    const handlePasswordReset = async (user: UserProfile) => {
        if (!auth || !user.email) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not send reset email. User email not found.' });
            return;
        }

        try {
            await sendPasswordResetEmail(auth, user.email);
            toast({
                title: 'Password Reset Email Sent',
                description: `An email has been sent to ${user.email} with instructions to reset their password.`,
            });
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Failed to Send Email',
                description: error.message,
            });
        }
    };
    
    const handleDeleteUser = async () => {
        if (!userToDelete || !firestore) return;
        
        setIsDeleting(true);
        try {
            // STEP 1 (BACKEND SIMULATION): Delete from Firebase Authentication
            console.warn(`[SIMULATION] Deleting user from Firebase Auth: ${userToDelete.email} (${userToDelete.id}). Implement a backend function for this.`);

            // STEP 2 (CLIENT): Delete user profile from Firestore Database
            await deleteDoc(doc(firestore, 'users', userToDelete.id));

            toast({
                title: 'User Deleted',
                description: `${userToDelete.fullName} has been permanently removed from the application.`,
            });
            setUserToDelete(null);
        } catch (error: any) {
             toast({
                variant: 'destructive',
                title: 'Deletion Failed',
                description: `Could not delete user from database. Error: ${error.message}`,
            });
        } finally {
            setIsDeleting(false);
        }
    };
    
    return (
        <>
            <div className="flex justify-between items-center mb-4 gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search team by name, email, role..."
                        className="pl-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                {permissions.canManageStaff && (
                    <InviteUserDialog open={isInviteOpen} onOpenChange={setIsInviteOpen} currentUserProfile={currentUserProfile}>
                        <Button onClick={() => setIsInviteOpen(true)}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Invite User
                        </Button>
                    </InviteUserDialog>
                )}
            </div>

            <div className="border rounded-lg bg-card text-card-foreground shadow-sm">
                <div className="grid grid-cols-11 gap-4 p-4 border-b bg-muted/20 rounded-t-lg">
                    <div className="col-span-3 text-sm font-semibold text-muted-foreground">IDENTITY</div>
                    <div className="col-span-2 text-sm font-semibold text-muted-foreground">ROLE</div>
                    <div className="col-span-2 text-sm font-semibold text-muted-foreground">USERNAME</div>
                    <div className="col-span-2 text-sm font-semibold text-muted-foreground">PASSWORD</div>
                    <div className="col-span-2 text-sm font-semibold text-muted-foreground text-right">ACTIONS</div>
                </div>

                <div className="divide-y divide-border">
                    {isLoading && Array.from({length: 3}).map((_, i) => (
                        <div key={i} className="p-4"><Skeleton className="h-10 w-full" /></div>
                    ))}
                    {!isLoading && filteredUsers.map(user => (
                        <div key={user.id} className="grid grid-cols-11 gap-4 p-3 items-center">
                            <div className="col-span-3 flex items-center gap-3 truncate">
                                <Avatar className="h-8 w-8">
                                    <AvatarFallback>{user.fullName.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                                </Avatar>
                                <div className="truncate">
                                    <div className="font-medium truncate">{user.fullName}</div>
                                    <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                                </div>
                            </div>
                            <div className="col-span-2">
                                <Badge variant="secondary" className="text-xs uppercase">{user.position}</Badge>
                            </div>
                            <div className="col-span-2 font-mono text-sm text-muted-foreground truncate">{user.username}</div>
                            <div className="col-span-2 font-mono text-sm text-muted-foreground">••••••••</div>
                            <div className="col-span-2 flex items-center justify-end gap-1">
                                {permissions.canManageStaff && (
                                    <>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-primary/70 hover:text-primary" onClick={() => setUserToEdit(user)}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        {user.id !== currentUserProfile.id && (
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-500/70 hover:text-amber-500" onClick={() => handlePasswordReset(user)}>
                                                <KeyRound className="h-4 w-4" />
                                            </Button>
                                        )}
                                        {canBeDeleted(user) && (
                                             <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/70 hover:text-destructive" onClick={() => setUserToDelete(user)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                     {!isLoading && filteredUsers.length === 0 && (
                        <div className="text-center text-sm text-muted-foreground py-16">
                            {searchTerm ? "No users match your search." : "No users found in this organization."}
                        </div>
                    )}
                </div>
            </div>
             <p className="text-xs text-muted-foreground mt-2">
                Passwords are shown as •••••••• for security. Actual passwords are encrypted and cannot be viewed. Use the key icon to send a password reset email to a user.
            </p>

            {userToEdit && (
                <EditUserDialog 
                    open={!!userToEdit}
                    onOpenChange={(isOpen) => !isOpen && setUserToEdit(null)}
                    userToEdit={userToEdit}
                />
            )}
            
            {userToDelete && (
                 <AlertDialog open={!!userToDelete} onOpenChange={(isOpen) => !isOpen && setUserToDelete(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will permanently delete {userToDelete.fullName}'s profile from the database and simulate the deletion of their authentication account. This action cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteUser} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                                {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Delete User
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </>
    )
}
