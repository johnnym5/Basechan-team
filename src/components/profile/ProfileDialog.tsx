
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Bell, Loader2, Pencil, MapPin, Lock, Activity, ShieldCheck, MonitorDot, FileCode, Info } from "lucide-react";
import { useState, useEffect } from "react";
import { useFirestore, updateDocumentNonBlocking, useUser, useAuth } from "@/firebase";
import { doc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import type { UserProfile } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { sanitizeInput } from "@/lib/utils";
import { useFileUpload } from "@/hooks/useFileUpload";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Badge } from "../ui/badge";
import { ActivityHeatmap } from "../shared/ActivityHeatmap";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

const formSchema = z.object({
  fullName: z.string().min(1, { message: "Full name is required." }),
  phoneNumber: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface ProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userProfile: UserProfile;
  modal?: boolean;
}

export function ProfileDialog({ open, onOpenChange, userProfile, modal }: ProfileDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();
  const { user } = useUser();
  const { isUploading, uploadProgress, uploadFile } = useFileUpload();
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  
  const isBusy = isSubmitting || isUploading;

  // Permission States
  const [notifStatus, setNotifStatus] = useState<NotificationPermission | 'unsupported'>('default');
  const [locationStatus, setLocationStatus] = useState<'default' | 'granted' | 'denied' | 'unsupported'>('default');
  const [idleStatus, setIdleStatus] = useState<'default' | 'granted' | 'denied' | 'unsupported'>('default');
  const [fsStatus, setFsStatus] = useState<'default' | 'granted' | 'denied' | 'unsupported'>('default');

  const checkPermissions = async () => {
    if (typeof window === 'undefined') return;

    // 1. Notifications
    if ('Notification' in window) {
        setNotifStatus(Notification.permission);
    } else {
        setNotifStatus('unsupported');
    }

    // 2. Permissions API (Location, Idle)
    if ('permissions' in navigator) {
        try {
            const locRes = await navigator.permissions.query({ name: 'geolocation' as any });
            setLocationStatus(locRes.state as any);
            locRes.onchange = () => setLocationStatus(locRes.state as any);

            if ('IdleDetector' in window) {
                const idleRes = await navigator.permissions.query({ name: 'idle-detection' as any });
                setIdleStatus(idleRes.state as any);
                idleRes.onchange = () => setIdleStatus(idleRes.state as any);
            } else {
                setIdleStatus('unsupported');
            }
        } catch (e) {
            console.warn("Permissions query failed", e);
        }
    }

    // 3. File System
    if ('showDirectoryPicker' in window) {
        // There's no query for this, we rely on local storage or previous attempts
        const hasAccess = sessionStorage.getItem('basechan-fs-authorized') === 'true';
        setFsStatus(hasAccess ? 'granted' : 'default');
    } else {
        setFsStatus('unsupported');
    }
  };

  useEffect(() => {
    if (open) {
      checkPermissions();
    }
  }, [open]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: userProfile.fullName,
      phoneNumber: userProfile.phoneNumber || "",
    },
  });
  
  useEffect(() => {
    if(userProfile){
        form.reset({
          fullName: userProfile.fullName,
          phoneNumber: userProfile.phoneNumber || "",
        })
    }
  }, [userProfile, form]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        setAvatarFile(file);
        const reader = new FileReader();
        reader.onloadend = () => {
            setAvatarPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
    }
  };


  async function onSubmit(values: FormData) {
    if (!firestore || !user) return;
    setIsSubmitting(true);

    try {
      let newAvatarUrl = userProfile.avatarUrl;
      if (avatarFile) {
        const filePath = `avatars/${user.uid}/${Date.now()}_${avatarFile.name}`;
        newAvatarUrl = await uploadFile(avatarFile, filePath);
      }

      const userRef = doc(firestore, 'users', user.uid);
      await updateDocumentNonBlocking(userRef, {
        fullName: sanitizeInput(values.fullName),
        phoneNumber: sanitizeInput(values.phoneNumber) || null,
        avatarUrl: newAvatarUrl,
      });

      toast({ title: "Profile Updated", description: "Your information has been updated." });
      onOpenChange(false);
    } catch (error: any) {
        toast({ variant: "destructive", title: "Update Failed", description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleRequestPermission = async (type: 'notifications' | 'location' | 'idle' | 'fs') => {
    const currentStatus = type === 'notifications' ? notifStatus : type === 'location' ? locationStatus : type === 'idle' ? idleStatus : fsStatus;
    
    if (currentStatus === 'denied') {
        toast({ 
            variant: 'destructive', 
            title: "Authorization Blocked", 
            description: `You have previously denied this request. Please reset permissions in your browser's site settings (lock icon in address bar) and reload.`,
            duration: 6000
        });
        return;
    }

    try {
        if (type === 'notifications') {
            const permission = await Notification.requestPermission();
            setNotifStatus(permission);
        } else if (type === 'location') {
            navigator.geolocation.getCurrentPosition(
                () => { setLocationStatus('granted'); toast({ title: "Location Authorized" }); },
                () => { setLocationStatus('denied'); toast({ variant: 'destructive', title: "Location Denied" }); }
            );
        } else if (type === 'idle') {
            if ('IdleDetector' in window) {
                const status = await (window as any).IdleDetector.requestPermission();
                setIdleStatus(status);
            }
        } else if (type === 'fs') {
            if ('showDirectoryPicker' in window) {
                try {
                    await (window as any).showDirectoryPicker();
                    setFsStatus('granted');
                    sessionStorage.setItem('basechan-fs-authorized', 'true');
                    toast({ title: "Storage Link Active" });
                } catch (e) {
                    // Usually user cancelled
                }
            }
        }
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Tactical Error', description: e.message });
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'granted') return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[8px] font-black uppercase">Authorized</Badge>;
    if (status === 'denied') return <Badge variant="destructive" className="text-[8px] font-black uppercase">Blocked</Badge>;
    if (status === 'unsupported') return <Badge variant="outline" className="text-[8px] font-black uppercase opacity-30">N/A</Badge>;
    return <Badge variant="outline" className="text-[8px] font-black uppercase">Awaiting</Badge>;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={modal}>
      <DialogContent position="left" className="flex flex-col p-0 overflow-hidden">
        <VisuallyHidden>
            <DialogHeader>
                <DialogTitle>My Profile & Security</DialogTitle>
                <DialogDescription>Manage your information and app permissions.</DialogDescription>
            </DialogHeader>
        </VisuallyHidden>
        
        <Progress value={uploadProgress} className={isUploading ? "w-full rounded-none h-1 flex-shrink-0" : "hidden"} />

        <div className="flex-1 flex flex-col h-full min-h-0 overflow-y-auto [scrollbar-gutter:stable] custom-scrollbar bg-background/20 relative">
            <div className="max-w-[1600px] mx-auto w-full min-h-full border-x border-white/5 bg-background/30 p-4 md:p-8 space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                        <h1 className="text-3xl font-black font-headline tracking-tighter">My Profile</h1>
                        <p className="text-muted-foreground uppercase tracking-widest text-[10px] font-black opacity-60">Security & Activity History</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-20">
                    {/* LEFT COLUMN: Identity & Credentials */}
                    <div className="lg:col-span-4 space-y-6">
                        <section className="apple-glass rounded-[2rem] p-6 flex flex-col items-center text-center interactive-element">
                            <div className="relative mb-6 group">
                                <Avatar className="w-28 h-28 border-4 border-primary/20 shadow-2xl transition-transform group-hover:scale-105 duration-500">
                                    <AvatarImage src={avatarPreview || userProfile.avatarUrl || user?.photoURL || ''} alt={userProfile.fullName} />
                                    <AvatarFallback className="text-3xl font-black bg-secondary">{userProfile.fullName.split(' ').map(n=>n[0]).join('')}</AvatarFallback>
                                </Avatar>
                                <label htmlFor="avatar-upload" className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-2.5 cursor-pointer hover:bg-primary/90 transition-all shadow-xl active:scale-90 border-4 border-background">
                                    <Pencil className="h-4 w-4" />
                                    <Input id="avatar-upload" type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                                </label>
                            </div>
                            <h2 className="text-xl font-black font-headline tracking-tight">{userProfile.fullName}</h2>
                            <p className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] mt-1">{userProfile.position}</p>
                        </section>

                        <section className="apple-glass rounded-[2rem] p-6">
                            <div className="flex items-center gap-2 mb-6">
                                <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                                    <Lock className="h-3.5 w-3.5" />
                                </div>
                                <h3 className="text-xs font-black uppercase tracking-widest">Update Information</h3>
                            </div>
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                                    <FormField control={form.control} name="fullName" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[9px] font-black uppercase tracking-widest opacity-50">Full Name</FormLabel>
                                            <FormControl><Input {...field} className="rounded-xl h-11 bg-background/50 border-white/5 text-sm" /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}/>
                                    <FormField control={form.control} name="phoneNumber" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[9px] font-black uppercase tracking-widest opacity-50">Phone Number</FormLabel>
                                            <FormControl><Input type="tel" {...field} className="rounded-xl h-11 bg-background/50 border-white/5 text-sm" /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}/>
                                    <Button type="submit" className="w-full h-12 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-primary/20 text-[10px] interactive-element" disabled={isBusy}>
                                        {isBusy ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : "Save Changes"}
                                    </Button>
                                </form>
                            </Form>
                        </section>
                    </div>

                    {/* RIGHT COLUMN: History & Permissions */}
                    <div className="lg:col-span-8 space-y-6">
                        <section className="apple-glass rounded-[2rem] p-6 shadow-inner">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-2">
                                    <Activity className="h-4 w-4 text-emerald-500" />
                                    <h3 className="text-xs font-black uppercase tracking-widest">Work Consistency</h3>
                                </div>
                            </div>
                            <ActivityHeatmap userId={userProfile.id} orgId={userProfile.orgId} />
                        </section>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* NOTIFICATIONS */}
                            <section className={cn("apple-glass rounded-[2rem] p-6 interactive-element transition-all", notifStatus === 'denied' && "ring-1 ring-destructive/20 bg-destructive/5")}>
                                <div className="flex items-center gap-3 mb-6">
                                    <div className={cn("p-2 rounded-xl", notifStatus === 'denied' ? "bg-destructive/10" : "bg-amber-500/10")}>
                                        <Bell className={cn("h-4 w-4", notifStatus === 'denied' ? "text-destructive" : "text-amber-500")} />
                                    </div>
                                    <div>
                                        <h3 className="text-xs font-black uppercase tracking-widest leading-none">Notifications</h3>
                                        <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-tighter mt-1">Browser Alerts</p>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase">Status</span>
                                        {getStatusBadge(notifStatus)}
                                    </div>
                                    {notifStatus !== 'granted' && notifStatus !== 'unsupported' && (
                                        <Button size="sm" variant="ghost" className="w-full h-10 rounded-xl text-[9px] font-black uppercase bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all" onClick={() => handleRequestPermission('notifications')}>
                                            {notifStatus === 'denied' ? 'Settings Required' : 'Enable Notifications'}
                                        </Button>
                                    )}
                                    {notifStatus === 'denied' && (
                                        <div className="flex items-center gap-2 text-destructive text-[8px] font-bold uppercase leading-tight mt-1">
                                            <Info className="h-2 w-2 shrink-0" />
                                            Manually reset in browser lock icon settings.
                                        </div>
                                    )}
                                </div>
                            </section>

                            {/* LOCATION */}
                            <section className={cn("apple-glass rounded-[2rem] p-6 interactive-element transition-all", locationStatus === 'denied' && "ring-1 ring-destructive/20 bg-destructive/5")}>
                                <div className="flex items-center gap-3 mb-6">
                                    <div className={cn("p-2 rounded-xl", locationStatus === 'denied' ? "bg-destructive/10" : "bg-primary/10")}>
                                        <MapPin className={cn("h-4 w-4", locationStatus === 'denied' ? "text-destructive" : "text-primary")} />
                                    </div>
                                    <div>
                                        <h3 className="text-xs font-black uppercase tracking-widest leading-none">Location</h3>
                                        <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-tighter mt-1">Geofence Compliance</p>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase">Status</span>
                                        {getStatusBadge(locationStatus)}
                                    </div>
                                    {locationStatus !== 'granted' && locationStatus !== 'unsupported' && (
                                        <Button size="sm" variant="ghost" className="w-full h-10 rounded-xl text-[9px] font-black uppercase bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all" onClick={() => handleRequestPermission('location')}>
                                            {locationStatus === 'denied' ? 'Settings Required' : 'Enable Location'}
                                        </Button>
                                    )}
                                    {locationStatus === 'denied' && (
                                        <div className="flex items-center gap-2 text-destructive text-[8px] font-bold uppercase leading-tight mt-1">
                                            <Info className="h-2 w-2 shrink-0" />
                                            Manually reset in browser lock icon settings.
                                        </div>
                                    )}
                                </div>
                            </section>

                            {/* IDLE DETECTION */}
                            <section className={cn("apple-glass rounded-[2rem] p-6 interactive-element transition-all", idleStatus === 'denied' && "ring-1 ring-destructive/20 bg-destructive/5")}>
                                <div className="flex items-center gap-3 mb-6">
                                    <div className={cn("p-2 rounded-xl", idleStatus === 'denied' ? "bg-destructive/10" : "bg-emerald-500/10")}>
                                        <MonitorDot className={cn("h-4 w-4", idleStatus === 'denied' ? "text-destructive" : "text-emerald-500")} />
                                    </div>
                                    <div>
                                        <h3 className="text-xs font-black uppercase tracking-widest leading-none">Presence</h3>
                                        <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-tighter mt-1">System-Wide Idle</p>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase">Status</span>
                                        {getStatusBadge(idleStatus)}
                                    </div>
                                    {idleStatus !== 'granted' && idleStatus !== 'unsupported' && (
                                        <Button size="sm" variant="ghost" className="w-full h-10 rounded-xl text-[9px] font-black uppercase bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all" onClick={() => handleRequestPermission('idle')}>
                                            {idleStatus === 'denied' ? 'Settings Required' : 'Enable Detection'}
                                        </Button>
                                    )}
                                    {idleStatus === 'denied' && (
                                        <div className="flex items-center gap-2 text-destructive text-[8px] font-bold uppercase leading-tight mt-1">
                                            <Info className="h-2 w-2 shrink-0" />
                                            Manually reset in browser lock icon settings.
                                        </div>
                                    )}
                                </div>
                            </section>

                            {/* FILE SYSTEM ACCESS */}
                            <section className={cn("apple-glass rounded-[2rem] p-6 interactive-element transition-all", fsStatus === 'denied' && "ring-1 ring-destructive/20 bg-destructive/5")}>
                                <div className="flex items-center gap-3 mb-6">
                                    <div className={cn("p-2 rounded-xl", fsStatus === 'denied' ? "bg-destructive/10" : "bg-blue-500/10")}>
                                        <FileCode className={cn("h-4 w-4", fsStatus === 'denied' ? "text-destructive" : "text-blue-500")} />
                                    </div>
                                    <div>
                                        <h3 className="text-xs font-black uppercase tracking-widest leading-none">Data Node</h3>
                                        <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-tighter mt-1">File System Access</p>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase">Status</span>
                                        {getStatusBadge(fsStatus)}
                                    </div>
                                    {fsStatus !== 'granted' && fsStatus !== 'unsupported' && (
                                        <Button size="sm" variant="ghost" className="w-full h-10 rounded-xl text-[9px] font-black uppercase bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all" onClick={() => handleRequestPermission('fs')}>
                                            {fsStatus === 'denied' ? 'Reset Required' : 'Authorize Files'}
                                        </Button>
                                    )}
                                </div>
                            </section>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
