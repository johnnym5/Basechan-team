
'use client';

import { useState, useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase, useAuth } from '@/firebase';
import { collection, query, where, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Trash2, Edit, Loader2, Search, KeyRound, Monitor, Smartphone, Camera, MonitorPlay } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import { Input } from '../ui/input';
import { InviteUserDialog } from './InviteUserDialog';
import { EditUserDialog } from './EditUserDialog';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { sendPasswordResetEmail } from 'firebase/auth';
import { Permissions } from '@/hooks/usePermissions';
import { formatDistanceToNow } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { uiEmitter } from '@/lib/ui-emitter';

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
    const [isProcessingCommand, setIsProcessingCommand] = useState<string | null>(null);

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

    const handleRequestScreenshot = async (user: UserProfile) => {
        if (!firestore) return;
        if (user.deviceType !== 'PC') {
            toast({ variant: 'destructive', title: 'Action Denied', description: 'Remote capture is strictly restricted to PC nodes.' });
            return;
        }

        setIsProcessingCommand(user.id);
        try {
            const userRef = doc(firestore, 'users', user.id);
            await updateDoc(userRef, { pendingCommand: 'SCREENSHOT' });
            toast({ title: 'Signal Dispatched', description: `Requesting telemetry from ${user.fullName.split(' ')[0]}'s node.` });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Signal Failed', description: e.message });
        } finally {
            setTimeout(() => setIsProcessingCommand(null), 2000);
        }
    };

    const handleRequestLiveMonitor = async (user: UserProfile) => {
        if (!firestore) return;
        if (user.deviceType !== 'PC') {
            toast({ variant: 'destructive', title: 'Action Denied', description: 'Live monitoring is strictly restricted to PC nodes.' });
            return;
        }

        setIsProcessingCommand(user.id);
        try {
            const userRef = doc(firestore, 'users', user.id);
            await updateDoc(userRef, { pendingCommand: 'SCREEN_SHARE' });
            uiEmitter.emit('open-live-monitor-dialog', { targetUserId: user.id, targetUserName: user.fullName });
            toast({ title: 'Live Signal Initializing', description: `Establishing telemetry link with ${user.fullName.split(' ')[0]}.` });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Signal Failed', description: e.message });
        } finally {
            setTimeout(() => setIsProcessingCommand(null), 1000);
        }
    };

    const handlePasswordReset = async (user: UserProfile) => {
        if (!auth || !user.email) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not send reset email. User email not found.' });
            return;
        }
        try {
            await sendPasswordResetEmail(auth, user.email);
            toast({ title: 'Reset Dispatched', description: `Instructions sent to ${user.email}.` });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Dispatch Failed', description: error.message });
        }
    };
    
    const handleDeleteUser = async () => {
        if (!userToDelete || !firestore) return;
        setIsDeleting(true);
        try {
            await deleteDoc(doc(firestore, 'users', userToDelete.id));
            toast({ title: 'User Purged', description: `${userToDelete.fullName} removed from mainframe.` });
            setUserToDelete(null);
        } catch (error: any) {
             toast({ variant: 'destructive', title: 'Purge Failed', description: error.message });
        } finally {
            setIsDeleting(false);
        }
    };
    
    return (
        <TooltipProvider delayDuration={0}>
            <div className="flex justify-between items-center mb-4 gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search team by name, email, role..."
                        className="pl-8 rounded-xl h-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                {permissions.canManageStaff && (
                    <Button onClick={() => setIsInviteOpen(true)} className="rounded-xl h-10 px-4 font-bold">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Invite User
                    </Button>
                )}
            </div>

            <div className="border border-white/5 rounded-2xl bg-card/30 backdrop-blur-xl shadow-xl overflow-hidden">
                <div className="grid grid-cols-12 gap-4 p-4 border-b bg-secondary/20 font-black text-[9px] uppercase tracking-widest text-muted-foreground">
                    <div className="col-span-4">Identity & Status</div>
                    <div className="col-span-2">Department / Role</div>
                    <div className="col-span-2">Node Environment</div>
                    <div className="col-span-4 text-right">Operational Control</div>
                </div>

                <div className="divide-y divide-white/5">
                    {isLoading && Array.from({length: 3}).map((_, i) => (
                        <div key={i} className="p-4"><Skeleton className="h-12 w-full rounded-xl" /></div>
                    ))}
                    {!isLoading && filteredUsers.map(user => (
                        <div key={user.id} className="grid grid-cols-12 gap-4 p-3 items-center hover:bg-white/5 transition-colors">
                            <div className="col-span-4 flex items-center gap-3 truncate">
                                <Avatar className="h-10 w-10 border-2 border-white/10">
                                    <AvatarFallback className="font-black bg-secondary text-xs">{user.fullName.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                                </Avatar>
                                <div className="truncate">
                                    <div className="font-bold text-sm truncate flex items-center gap-2">
                                        {user.fullName}
                                        {user.status === 'ONLINE' && <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                                    </div>
                                    <div className="text-[10px] text-muted-foreground truncate uppercase font-bold tracking-tighter">
                                        Last seen: {user.lastSeen ? formatDistanceToNow(new Date(user.lastSeen), { addSuffix: true }) : 'N/A'}
                                    </div>
                                </div>
                            </div>
                            <div className="col-span-2 space-y-1">
                                <Badge variant="secondary" className="text-[8px] font-black uppercase tracking-tighter whitespace-nowrap bg-primary/10 text-primary border-primary/20">{user.position}</Badge>
                                <p className="text-[8px] opacity-50 truncate font-bold uppercase">{user.departmentName}</p>
                            </div>
                            <div className="col-span-2">
                                {user.deviceType === 'PC' ? (
                                    <div className="flex items-center gap-2 text-primary">
                                        <Monitor className="h-4 w-4" />
                                        <span className="text-[10px] font-black tracking-widest">PC</span>
                                    </div>
                                ) : user.deviceType === 'MOBILE' ? (
                                    <div className="flex items-center gap-2 text-amber-500">
                                        <Smartphone className="h-4 w-4" />
                                        <span className="text-[10px] font-black tracking-widest">MOBILE</span>
                                    </div>
                                ) : (
                                    <span className="text-[9px] opacity-30 uppercase font-black">Unknown</span>
                                )}
                            </div>
                            <div className="col-span-4 flex items-center justify-end gap-1.5">
                                {permissions.canManageStaff && (
                                    <>
                                        {user.deviceType === 'PC' && user.status === 'ONLINE' && (
                                            <>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button 
                                                            variant="outline" 
                                                            size="icon" 
                                                            className="h-9 w-9 rounded-xl border-white/10 hover:bg-emerald-500/10 hover:text-emerald-500" 
                                                            onClick={() => handleRequestLiveMonitor(user)}
                                                            disabled={isProcessingCommand === user.id}
                                                        >
                                                            {isProcessingCommand === user.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <MonitorPlay className="h-4 w-4" />}
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent className="apple-glass-darker border-none text-[9px] font-black uppercase">Live Monitor Feed</TooltipContent>
                                                </Tooltip>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button 
                                                            variant="outline" 
                                                            size="icon" 
                                                            className="h-9 w-9 rounded-xl border-white/10 hover:bg-primary/10 hover:text-primary" 
                                                            onClick={() => handleRequestScreenshot(user)}
                                                            disabled={isProcessingCommand === user.id}
                                                        >
                                                            {isProcessingCommand === user.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent className="apple-glass-darker border-none text-[9px] font-black uppercase">Capture PC Screen</TooltipContent>
                                                </Tooltip>
                                            </>
                                        )}
                                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-primary/70 hover:text-primary hover:bg-primary/10" onClick={() => setUserToEdit(user)}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        {user.id !== currentUserProfile.id && (
                                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-amber-500/70 hover:text-amber-500 hover:bg-amber-500/10" onClick={() => handlePasswordReset(user)}>
                                                <KeyRound className="h-4 w-4" />
                                            </Button>
                                        )}
                                        {user.position !== "Organization Administrator" && user.id !== currentUserProfile.id && (
                                             <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-destructive/70 hover:text-destructive hover:bg-destructive/10" onClick={() => setUserToDelete(user)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                     {!isLoading && filteredUsers.length === 0 && (
                        <div className="text-center text-sm text-muted-foreground py-16 uppercase font-black tracking-widest opacity-20">
                            Zero matches in sector
                        </div>
                    )}
                </div>
            </div>

            {userToEdit && (
                <EditUserDialog 
                    open={!!userToEdit}
                    onOpenChange={(isOpen) => !isOpen && setUserToEdit(null)}
                    userToEdit={userToEdit}
                />
            )}
            
            <InviteUserDialog open={isInviteOpen} onOpenChange={setIsInviteOpen} currentUserProfile={currentUserProfile} />

            {userToDelete && (
                 <AlertDialog open={!!userToDelete} onOpenChange={(isOpen) => !isOpen && setUserToDelete(null)}>
                    <AlertDialogContent className="apple-glass-darker border-none rounded-[2rem] p-8">
                        <AlertDialogHeader className="space-y-4 text-center">
                            <div className="mx-auto p-4 rounded-full bg-destructive/10 w-fit">
                                <Trash2 className="h-8 w-8 text-destructive" />
                            </div>
                            <AlertDialogTitle className="text-2xl font-black font-headline tracking-tighter">Terminate Authorization?</AlertDialogTitle>
                            <AlertDialogDescription className="text-xs font-bold uppercase tracking-widest">
                                Deleting {userToDelete.fullName} will purge all node assignments and audit history. This action is irreversible.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="flex-col sm:flex-col gap-3 mt-6">
                            <AlertDialogAction onClick={handleDeleteUser} disabled={isDeleting} className="w-full h-14 bg-destructive text-white rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl shadow-destructive/20 hover:bg-destructive/90 transition-all active:scale-95">
                                {isDeleting ? <Loader2 className="mr-2 animate-spin h-4 w-4" /> : "Confirm Termination"}
                            </AlertDialogAction>
                            <AlertDialogCancel className="w-full h-10 border-none text-[10px] font-black uppercase tracking-widest opacity-60 hover:opacity-100 hover:bg-transparent transition-all">Abort Command</AlertDialogCancel>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </TooltipProvider>
    )
}
