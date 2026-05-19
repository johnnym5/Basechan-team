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
import { Bell, Loader2, Pencil, MapPin, Calendar, Lock, Activity } from "lucide-react";
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
import { Separator } from "@/components/ui/separator";
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
    if (status === 'granted') return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Authorized</Badge>;
    if (status === 'denied') return <Badge variant="destructive">Denied</Badge>;
    return <Badge variant="outline">Awaiting</Badge>;
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

        <div className="flex-1 flex flex-col min-h-0 p-4 md:p-8 overflow-y-auto custom-scrollbar bg-background/20 rounded-[2.5rem]">
            <div className="max-w-[1600px] mx-auto w-full space-y-12 pb-32">
                <div className="flex flex-col gap-2">
                    <h1 className="text-3xl font-black font-headline tracking-tighter">Identity Control</h1>
                    <p className="text-muted-foreground uppercase tracking-widest text-[10px] font-bold">Personnel Security & Telemetry Overview</p>
                </div>

                <div className="relative w-32 h-32">
                    <Avatar className="w-32 h-32 border-4 border-primary/20 shadow-2xl">
                        <AvatarImage src={avatarPreview || userProfile.avatarUrl || user?.photoURL || ''} alt={userProfile.fullName} />
                        <AvatarFallback className="text-4xl font-black bg-secondary">{userProfile.fullName.split(' ').map(n=>n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    <label htmlFor="avatar-upload" className="absolute -bottom-2 -right-2 bg-primary text-primary-foreground rounded-full p-3 cursor-pointer hover:bg-primary/90 transition-all shadow-xl active:scale-90">
                        <Pencil className="h-5 w-5" />
                        <Input id="avatar-upload" type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                    </label>
                </div>

                <section className="p-8 rounded-[3rem] bg-secondary/10 border border-white/5 shadow-inner">
                    <div className="flex items-center gap-2 mb-8">
                        <Activity className="h-6 w-6 text-emerald-500" />
                        <h4 className="text-sm font-black uppercase tracking-[0.25em]">Operational Consistency</h4>
                    </div>
                    <ActivityHeatmap userId={userProfile.id} orgId={userProfile.orgId} />
                </section>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
                    <div className="space-y-8">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-primary/10">
                                <Lock className="h-5 w-5 text-primary" />
                            </div>
                            <h4 className="text-lg font-bold font-headline tracking-tight">Identity Details</h4>
                        </div>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField control={form.control} name="fullName" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-60">Full Name</FormLabel>
                                            <FormControl><Input {...field} className="rounded-xl h-12 bg-background/50 border-white/5" /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}/>
                                    <FormField control={form.control} name="phoneNumber" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-60">Phone Number</FormLabel>
                                            <FormControl><Input type="tel" {...field} className="rounded-xl h-12 bg-background/50 border-white/5" /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}/>
                                </div>
                                <Button type="submit" className="w-full h-14 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/20" disabled={isBusy}>
                                    {isBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save Configuration"}
                                </Button>
                            </form>
                        </Form>
                        <Separator className="bg-white/5" />
                        <div className="space-y-4">
                            <h4 className="text-xs font-black uppercase tracking-widest text-primary/70">Access Keys</h4>
                            <Button variant="outline" className="w-full h-12 rounded-xl border-white/10 hover:bg-primary/5 transition-all" onClick={() => sendPasswordResetEmail(auth!, userProfile.email)}>
                                <Lock className="mr-2 h-4 w-4" /> Reset Access Key
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-8">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-amber-500/10">
                                <Bell className="h-5 w-5 text-amber-500" />
                            </div>
                            <h4 className="text-lg font-bold font-headline tracking-tight">System Authorization</h4>
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-5 rounded-[2rem] border border-white/5 bg-secondary/5 transition-all hover:bg-secondary/10">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-background/50 rounded-2xl border border-white/5"><Bell className="h-6 w-6 text-primary" /></div>
                                    <div>
                                        <p className="font-bold text-base">Alert Node</p>
                                        <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Push Notifications</p>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-3">
                                    {getStatusBadge(notifStatus)}
                                    {notifStatus !== 'granted' && <Button size="sm" variant="ghost" className="h-8 rounded-lg text-[10px] font-black uppercase bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all" onClick={() => handleRequestPermission('notifications')}>Authorize</Button>}
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-5 rounded-[2rem] border border-white/5 bg-secondary/5 transition-all hover:bg-secondary/10">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-background/50 rounded-2xl border border-white/5"><MapPin className="h-6 w-6 text-primary" /></div>
                                    <div>
                                        <p className="font-bold text-base">Geospatial Telemetry</p>
                                        <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Geofencing Support</p>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-3">
                                    {getStatusBadge(locationStatus)}
                                    {locationStatus !== 'granted' && <Button size="sm" variant="ghost" className="h-8 rounded-lg text-[10px] font-black uppercase bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all" onClick={() => handleRequestPermission('location')}>Authorize</Button>}
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-5 rounded-[2rem] border border-white/5 bg-secondary/5 opacity-50 grayscale cursor-not-allowed">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-background/50 rounded-2xl border border-white/5"><Calendar className="h-6 w-6 text-primary" /></div>
                                    <div>
                                        <p className="font-bold text-base">Availability Matrix</p>
                                        <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Roster Sync</p>
                                    </div>
                                </div>
                                <Badge variant="outline" className="text-[9px] font-black tracking-widest">MANAGED</Badge>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
