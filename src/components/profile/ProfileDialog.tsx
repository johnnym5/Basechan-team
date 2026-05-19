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
import { Bell, Loader2, Pencil, MapPin, Lock, Activity, ShieldCheck } from "lucide-react";
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
import { sendPasswordResetEmail } from "firebase/auth";
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
  const auth = useAuth();
  const { isUploading, uploadProgress, uploadFile } = useFileUpload();
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  
  const isBusy = isSubmitting || isUploading;

  // Permission States
  const [notifStatus, setNotifStatus] = useState<NotificationPermission>('default');
  const [locationStatus, setLocationStatus] = useState<'default' | 'granted' | 'denied'>('default');

  useEffect(() => {
    if (open) {
      if ('Notification' in window) setNotifStatus(Notification.permission);
      if ('permissions' in navigator) {
        navigator.permissions.query({ name: 'geolocation' as any }).then(res => {
            setLocationStatus(res.state as any);
        });
      }
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

  const handleRequestPermission = async (type: 'notifications' | 'location') => {
    try {
        if (type === 'notifications') {
            const permission = await Notification.requestPermission();
            setNotifStatus(permission);
        } else if (type === 'location') {
            navigator.geolocation.getCurrentPosition(() => setLocationStatus('granted'), () => setLocationStatus('denied'));
        }
        toast({ title: "Permission Updated", description: `Authorization for ${type} has been processed.` });
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Authorization Failed', description: e.message });
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'granted') return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[8px] font-black uppercase">Authorized</Badge>;
    if (status === 'denied') return <Badge variant="destructive" className="text-[8px] font-black uppercase">Denied</Badge>;
    return <Badge variant="outline" className="text-[8px] font-black uppercase">Awaiting</Badge>;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={modal}>
      <DialogContent position="left" className="flex flex-col p-0 overflow-hidden">
        <VisuallyHidden>
            <DialogHeader>
                <DialogTitle>My Profile & Security</DialogTitle>
                <DialogDescription>Manage your identity and authorize system access.</DialogDescription>
            </DialogHeader>
        </VisuallyHidden>
        
        <Progress value={uploadProgress} className={isUploading ? "w-full rounded-none h-1 flex-shrink-0" : "hidden"} />

        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto [scrollbar-gutter:stable] custom-scrollbar bg-background">
            <div className="max-w-[1600px] mx-auto w-full min-h-full border-x border-white/5 bg-background/40 p-4 md:p-6 space-y-6">
                {/* Tactical Header Row */}
                <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                        <h1 className="text-2xl font-black font-headline tracking-tighter">Identity Control</h1>
                        <p className="text-muted-foreground uppercase tracking-widest text-[8px] font-black opacity-60">System Security & Personnel Telemetry</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-right hidden sm:block">
                            <p className="text-[9px] font-black uppercase tracking-widest text-primary leading-none">Security Clearance</p>
                            <p className="text-sm font-bold mt-0.5">{userProfile.role}</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-20">
                    {/* LEFT COLUMN: Identity & Credentials */}
                    <div className="lg:col-span-4 space-y-6">
                        <section className="p-6 rounded-[2rem] bg-secondary/5 border border-white/5 flex flex-col items-center text-center">
                            <div className="relative mb-4 group">
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

                        <section className="p-6 rounded-[2rem] bg-secondary/5 border border-white/5">
                            <div className="flex items-center gap-2 mb-6">
                                <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                                    <Lock className="h-3.5 w-3.5" />
                                </div>
                                <h3 className="text-xs font-black uppercase tracking-widest">Credential Control</h3>
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
                                            <FormLabel className="text-[9px] font-black uppercase tracking-widest opacity-50">Contact Line</FormLabel>
                                            <FormControl><Input type="tel" {...field} className="rounded-xl h-11 bg-background/50 border-white/5 text-sm" /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}/>
                                    <Button type="submit" className="w-full h-12 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-primary/20 text-[10px]" disabled={isBusy}>
                                        {isBusy ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : "Authorize Changes"}
                                    </Button>
                                </form>
                            </Form>
                            
                            <div className="mt-6 pt-6 border-t border-white/5">
                                <Button variant="outline" className="w-full h-11 rounded-xl border-white/10 hover:bg-rose-500/10 hover:text-rose-500 text-[10px] font-bold uppercase tracking-widest transition-all" onClick={() => sendPasswordResetEmail(auth!, userProfile.email)}>
                                    <Lock className="mr-2 h-3.5 w-3.5" /> Reset Terminal Key
                                </Button>
                            </div>
                        </section>
                    </div>

                    {/* RIGHT COLUMN: Telemetry & Authorization */}
                    <div className="lg:col-span-8 space-y-6">
                        <section className="p-6 rounded-[2rem] bg-secondary/5 border border-white/5 shadow-inner">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-2">
                                    <Activity className="h-4 w-4 text-emerald-500" />
                                    <h3 className="text-xs font-black uppercase tracking-widest">Operational Consistency</h3>
                                </div>
                                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-50">LIVE TELEMETRY NODE</span>
                            </div>
                            <ActivityHeatmap userId={userProfile.id} orgId={userProfile.orgId} />
                        </section>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <section className="p-6 rounded-[2rem] bg-secondary/5 border border-white/5">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 rounded-xl bg-amber-500/10">
                                        <Bell className="h-4 w-4 text-amber-500" />
                                    </div>
                                    <div>
                                        <h3 className="text-xs font-black uppercase tracking-widest leading-none">Alert Node</h3>
                                        <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-tighter mt-1">Push Notifications</p>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase">OS Status</span>
                                        {getStatusBadge(notifStatus)}
                                    </div>
                                    {notifStatus !== 'granted' && (
                                        <Button size="sm" variant="ghost" className="w-full h-10 rounded-xl text-[9px] font-black uppercase bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all" onClick={() => handleRequestPermission('notifications')}>Request Authorization</Button>
                                    )}
                                </div>
                            </section>

                            <section className="p-6 rounded-[2rem] bg-secondary/5 border border-white/5">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 rounded-xl bg-primary/10">
                                        <MapPin className="h-4 w-4 text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="text-xs font-black uppercase tracking-widest leading-none">Spatial Node</h3>
                                        <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-tighter mt-1">Geofence Compliance</p>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase">Signal Status</span>
                                        {getStatusBadge(locationStatus)}
                                    </div>
                                    {locationStatus !== 'granted' && (
                                        <Button size="sm" variant="ghost" className="w-full h-10 rounded-xl text-[9px] font-black uppercase bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all" onClick={() => handleRequestPermission('location')}>Request Authorization</Button>
                                    )}
                                </div>
                            </section>
                        </div>
                        
                        <div className="p-6 rounded-[2rem] bg-primary/5 border border-primary/10">
                            <div className="flex items-center gap-3 text-primary mb-2">
                                <Activity className="h-4 w-4" />
                                <span className="text-[10px] font-black uppercase tracking-tighter">System Intelligence Memo</span>
                            </div>
                            <p className="text-[9px] leading-relaxed text-foreground/70 font-medium uppercase tracking-tight">
                                Personnel identity telemetry is analyzed in real-time. Continuous geofencing and active notification nodes are required for optimal mission reporting and shift synchronization.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
