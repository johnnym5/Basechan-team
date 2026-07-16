'use client';

import { useState, useMemo, useEffect } from 'react';
import { useFirestore, useAuth } from '@/firebase';
import { collection, query, where, doc, deleteDoc, updateDoc, getDocs } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Trash2, Edit, Loader2, Search, KeyRound, Monitor, Smartphone, Camera, MonitorPlay, ShieldCheck, LogOut } from 'lucide-react';
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

    const [users, setUsers] = useState<UserProfile[] | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchUsers = async () => {
        if (!firestore) return;
        setIsLoading(true);
        try {
            const q = query(collection(firestore, 'users'), where('orgId', '==', currentUserProfile.orgId));
            const snap = await getDocs(q);
            const results = snap.docs.map(doc => ({ ...doc.data(), id: doc.id }) as UserProfile);
            setUsers(results);
        } catch (e) {
            console.error("Error fetching users:", e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, [firestore, currentUserProfile.orgId]);
    
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
            toast({ variant: 'destructive', title: 'Action Denied', description: 'Screen capture is only available for Desktop users.' });
            return;
        }

        setIsProcessingCommand(user.id);
        try {
            const userRef = doc(firestore, 'users', user.id);
            await updateDoc(userRef, { pendingCommand: 'SCREENSHOT' });
            toast({ title: 'Request Sent', description: `Requesting a screenshot from ${user.fullName.split(' ')[0]}.` });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Failed', description: e.message });
        } finally {
            setTimeout(() => setIsProcessingCommand(null), 2000);
        }
    };

    const handleRequestLiveMonitor = async (user: UserProfile) => {
        if (!firestore) return;
        if (user.deviceType !== 'PC') {
            toast({ variant: 'destructive', title: 'Action Denied', description: 'Screen sharing is only available for Desktop users.' });
            return;
        }

        setIsProcessingCommand(user.id);
        try {
            const userRef = doc(firestore, 'users', user.id);
            await updateDoc(userRef, { pendingCommand: 'SCREEN_SHARE' });
            uiEmitter.emit('open-live-monitor-dialog', { targetUserId: user.id, targetUserName: user.fullName });
            toast({ title: 'Sharing Request Sent', description: `Connecting to ${user.fullName.split(' ')[0]}'s screen.` });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Failed', description: e.message });
        } finally {
            setTimeout(() => setIsProcessingCommand(null), 1000);
        }
    };

    const handlePasswordReset = async (user: UserProfile) => {
        if (!auth) {
            toast({ variant: 'destructive', title: 'System Error', description: 'Authentication service not initialized.' });
            return;
        }
        if (!user.email) {
            toast({ variant: 'destructive', title: 'Identity Error', description: 'No authorized email address found for this user.' });
            return;
        }

        setIsProcessingCommand(user.id);
        try {
            await sendPasswordResetEmail(auth, user.email);
            toast({ title: 'Instructions Dispatched', description: `A secure password reset link has been sent to ${user.email}.` });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Dispatch Failed', description: error.message || "The identity recovery sequence was interrupted." });
        } finally {
            setTimeout(() => setIsProcessingCommand(null), 1000);
        }
    };

    const handleForceLogout = async (user: UserProfile) => {
        if (!firestore) return;
        setIsProcessingCommand(user.id);
        try {
            const userRef = doc(firestore, 'users', user.id);
            await updateDoc(userRef, { pendingCommand: 'FORCE_LOGOUT' });
            toast({ title: 'Force Logout Sent', description: `${user.fullName.split(' ')[0]} will be signed out immediately.` });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Failed', description: e.message });
        } finally {
            setTimeout(() => setIsProcessingCommand(null), 2000);
        }
    };
    
    const handleDeleteUser = async () => {
        if (!userToDelete || !auth?.currentUser) return;
        setIsDeleting(true);
        try {
            const token = await auth.currentUser.getIdToken();
            const response = await fetch('/api/users/delete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ targetUserId: userToDelete.id })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to delete user');
            }

            toast({ title: 'User Removed', description: `${userToDelete.fullName} has been deleted.` });
            setUserToDelete(null);
            fetchUsers();
        } catch (error: any) {
             toast({ variant: 'destructive', title: 'Failed', description: error.message });
        } finally {
            setIsDeleting(false);
        }
    };
    
    return (
        <TooltipProvider delayDuration={0}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                <div className="flex flex-col gap-1">
                    <h3 className="text-xl font-black font-headline tracking-tighter uppercase flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-primary" />
                        Command Center
                    </h3>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Manage Team Authorization & Oversight</p>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Filter personnel..."
                            className="pl-8 rounded-xl h-10 border-white/5 bg-background/50 w-full"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    {permissions.canManageStaff && (
                        <Button onClick={() => setIsInviteOpen(true)} className="rounded-xl h-10 px-4 font-bold shadow-lg shadow-primary/20 w-full sm:w-auto shrink-0">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Member
                        </Button>
                    )}
                </div>
            </div>

            <div className="border border-white/5 rounded-2xl bg-card/30 backdrop-blur-xl shadow-xl overflow-hidden">
                <div className="hidden md:grid grid-cols-12 gap-4 p-4 border-b bg-secondary/20 font-black text-[9px] uppercase tracking-widest text-muted-foreground">
                    <div className="col-span-4">Staff Member</div>
                    <div className="col-span-2">Position / Sector</div>
                    <div className="col-span-2">Device Node</div>
                    <div className="col-span-4 text-right">Oversight Actions</div>
                </div>

                <div className="divide-y divide-white/5">
                    {isLoading && Array.from({length: 3}).map((_, i) => (
                        <div key={i} className="p-4"><Skeleton className="h-12 w-full rounded-xl" /></div>
                    ))}
                    {!isLoading && filteredUsers.map(user => (
                        <div key={user.id} className="flex flex-col md:grid md:grid-cols-12 gap-3 md:gap-4 p-4 md:p-3 items-start md:items-center hover:bg-white/5 transition-colors">
                            <div className="w-full md:col-span-4 flex items-center gap-3 truncate">
                                <Avatar className="h-10 w-10 border-2 border-white/10 shadow-inner shrink-0">
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
                            <div className="w-full md:col-span-2 flex items-center md:items-start justify-between md:justify-start gap-2">
                                <span className="md:hidden font-black text-[8px] uppercase tracking-widest text-muted-foreground opacity-50">Position / Sector</span>
                                <div className="flex flex-col items-end md:items-start space-y-1">
                                    <Badge variant="secondary" className="text-[8px] font-black uppercase tracking-tighter whitespace-nowrap bg-primary/10 text-primary border-primary/20">{user.position}</Badge>
                                    <p className="text-[8px] opacity-50 truncate font-bold uppercase">{user.departmentName}</p>
                                </div>
                            </div>
                            <div className="w-full md:col-span-2 flex items-center md:items-start justify-between md:justify-start gap-2">
                                <span className="md:hidden font-black text-[8px] uppercase tracking-widest text-muted-foreground opacity-50">Device Node</span>
                                {user.deviceType === 'PC' ? (
                                    <div className="flex items-center gap-2 text-primary">
                                        <Monitor className="h-4 w-4" />
                                        <span className="text-[10px] font-black tracking-widest">Desktop</span>
                                    </div>
                                ) : user.deviceType === 'MOBILE' ? (
                                    <div className="flex items-center gap-2 text-amber-500">
                                        <Smartphone className="h-4 w-4" />
                                        <span className="text-[10px] font-black tracking-widest">Mobile</span>
                                    </div>
                                ) : (
                                    <span className="text-[9px] opacity-30 uppercase font-black">N/A</span>
                                )}
                            </div>
                            <div className="w-full md:col-span-4 flex items-center justify-between md:justify-end gap-1.5 pt-3 md:pt-0 border-t md:border-none border-white/5">
                                <span className="md:hidden font-black text-[8px] uppercase tracking-widest text-muted-foreground opacity-50">Oversight Actions</span>
                                <div className="flex items-center gap-1.5">
                                    {permissions.canManageStaff && (
                                        <>
                                            {user.deviceType === 'PC' && user.status === 'ONLINE' && (
                                                <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-primary/5 border border-primary/10">
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button 
                                                                variant="ghost" 
                                                                size="icon" 
                                                                className="h-8 w-8 rounded-xl hover:bg-emerald-500/10 hover:text-emerald-500 transition-all active:scale-95" 
                                                                onClick={() => handleRequestLiveMonitor(user)}
                                                                disabled={isProcessingCommand === user.id}
                                                            >
                                                                {isProcessingCommand === user.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MonitorPlay className="h-3.5 w-3.5" />}
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent className="apple-glass-darker border-none text-[9px] font-black uppercase">Live Screen Stream</TooltipContent>
                                                    </Tooltip>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button 
                                                                variant="ghost" 
                                                                size="icon" 
                                                                className="h-8 w-8 rounded-xl hover:bg-primary/10 hover:text-primary transition-all active:scale-95" 
                                                                onClick={() => handleRequestScreenshot(user)}
                                                                disabled={isProcessingCommand === user.id}
                                                            >
                                                                {isProcessingCommand === user.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent className="apple-glass-darker border-none text-[9px] font-black uppercase">Capture Immediate Screenshot</TooltipContent>
                                                    </Tooltip>
                                                </div>
                                            )}
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-primary/70 hover:text-primary hover:bg-primary/10 transition-all active:scale-95" onClick={() => setUserToEdit(user)}>
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent className="apple-glass-darker border-none text-[9px] font-black uppercase">Edit Authorization</TooltipContent>
                                            </Tooltip>
                                            
                                            {user.id !== currentUserProfile.id && (
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="h-9 w-9 rounded-xl text-amber-500/70 hover:text-amber-500 hover:bg-amber-500/10 transition-all active:scale-95" 
                                                            onClick={() => handlePasswordReset(user)}
                                                            disabled={isProcessingCommand === user.id}
                                                        >
                                                            {isProcessingCommand === user.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent className="apple-glass-darker border-none text-[9px] font-black uppercase">Reset Secure Access</TooltipContent>
                                                </Tooltip>
                                            )}
                                            {user.status === 'ONLINE' && user.id !== currentUserProfile.id && (
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-9 w-9 rounded-xl text-orange-500/70 hover:text-orange-500 hover:bg-orange-500/10 transition-all active:scale-95"
                                                            onClick={() => handleForceLogout(user)}
                                                            disabled={isProcessingCommand === user.id}
                                                        >
                                                            {isProcessingCommand === user.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent className="apple-glass-darker border-none text-[9px] font-black uppercase">Force Reset Device</TooltipContent>
                                                </Tooltip>
                                            )}
                                            {user.position !== "Organization Administrator" && user.id !== currentUserProfile.id && (
                                                 <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-destructive/70 hover:text-destructive hover:bg-destructive/10 transition-all active:scale-95" onClick={() => setUserToDelete(user)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                     {!isLoading && filteredUsers.length === 0 && (
                        <div className="text-center text-sm text-muted-foreground py-16 uppercase font-black tracking-widest opacity-20">
                            No matching members found in current sector
                        </div>
                    )}
                </div>
            </div>

            {userToEdit && (
                <EditUserDialog 
                    open={!!userToEdit}
                    onOpenChange={(isOpen) => {
                        if (!isOpen) {
                            setUserToEdit(null);
                            fetchUsers();
                        }
                    }}
                    userToEdit={userToEdit}
                />
            )}
            
            <InviteUserDialog 
                open={isInviteOpen} 
                onOpenChange={(open) => {
                    setIsInviteOpen(open);
                    if (!open) {
                        fetchUsers();
                    }
                }} 
                currentUserProfile={currentUserProfile} 
            />

            {userToDelete && (
                 <AlertDialog open={!!userToDelete} onOpenChange={(isOpen) => !isOpen && setUserToDelete(null)}>
                    <AlertDialogContent className="apple-glass-darker border-none rounded-[2rem] p-8">
                        <AlertDialogHeader className="space-y-4 text-center">
                            <div className="mx-auto p-4 rounded-full bg-destructive/10 w-fit">
                                <Trash2 className="h-8 w-8 text-destructive" />
                            </div>
                            <AlertDialogTitle className="text-2xl font-black font-headline tracking-tighter">Delete User?</AlertDialogTitle>
                            <AlertDialogDescription className="text-xs font-bold uppercase tracking-widest">
                                Are you sure you want to remove {userToDelete.fullName}? This action cannot be undone and will purge all associated telemetry records.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="flex-col sm:flex-col gap-3 mt-6">
                            <AlertDialogAction onClick={handleDeleteUser} disabled={isDeleting} className="w-full h-14 bg-destructive text-white rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl shadow-destructive/20 hover:bg-destructive/90 transition-all active:scale-95">
                                {isDeleting ? <Loader2 className="mr-2 animate-spin h-4 w-4" /> : "Delete Member"}
                            </AlertDialogAction>
                            <AlertDialogCancel className="w-full h-10 border-none text-[10px] font-black uppercase tracking-widest opacity-60 hover:opacity-100 hover:bg-transparent transition-all">Cancel</AlertDialogCancel>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </TooltipProvider>
    )
}
