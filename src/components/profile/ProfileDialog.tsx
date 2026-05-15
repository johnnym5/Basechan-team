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

const formSchema = z.object({
  fullName: z.string().min(1, { message: "Full name is required." }),
  phoneNumber: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface ProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userProfile: UserProfile;
}

export function ProfileDialog({ open, onOpenChange, userProfile }: ProfileDialogProps) {
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-0 flex-shrink-0">
          <DialogTitle>My Profile & Security</DialogTitle>
          <DialogDescription>Manage your identity and authorize system access.</DialogDescription>
        </DialogHeader>
        
        <Progress value={uploadProgress} className={isUploading ? "w-full rounded-none h-1 flex-shrink-0" : "hidden"} />

        <div className="flex-1 overflow-y-auto px-6 pb-12">
            <div className="relative mx-auto w-24 h-24 my-6">
                <Avatar className="w-24 h-24 border-2 border-primary/20">
                    <AvatarImage src={avatarPreview || userProfile.avatarUrl || user?.photoURL || ''} alt={userProfile.fullName} />
                    <AvatarFallback className="text-3xl">{userProfile.fullName.split(' ').map(n=>n[0]).join('')}</AvatarFallback>
                </Avatar>
                <label htmlFor="avatar-upload" className="absolute -bottom-2 -right-2 bg-primary text-primary-foreground rounded-full p-2 cursor-pointer hover:bg-primary/90 transition-colors shadow-lg">
                    <Pencil className="h-4 w-4" />
                    <Input id="avatar-upload" type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                </label>
            </div>

            <div className="space-y-12">
                {/* Activity Heatmap Section */}
                <section className="p-6 rounded-[2rem] bg-secondary/10 border border-white/5 shadow-inner">
                    <div className="flex items-center gap-2 mb-6">
                        <Activity className="h-5 w-5 text-emerald-500" />
                        <h4 className="text-sm font-black uppercase tracking-[0.2em]">Contribution Telemetry</h4>
                    </div>
                    <ActivityHeatmap userId={userProfile.id} orgId={userProfile.orgId} />
                </section>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <h4 className="text-sm font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                            Identity Profile
                        </h4>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                <FormField control={form.control} name="fullName" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Full Name</FormLabel>
                                        <FormControl><Input {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                <FormField control={form.control} name="phoneNumber" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Phone Number</FormLabel>
                                        <FormControl><Input type="tel" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                <Button type="submit" className="w-full h-12 rounded-xl" disabled={isBusy}>
                                    {isBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save Changes"}
                                </Button>
                            </form>
                        </Form>
                        <Separator />
                        <div className="space-y-4">
                            <h4 className="text-sm font-bold uppercase tracking-widest text-primary">Security Access</h4>
                            <Button variant="outline" className="w-full h-12 rounded-xl" onClick={() => sendPasswordResetEmail(auth!, userProfile.email)}>
                                <Lock className="mr-2 h-4 w-4" /> Send Password Reset
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <h4 className="text-sm font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                            Device Authorization
                        </h4>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-3 rounded-xl border bg-secondary/20">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-background rounded-lg"><Bell className="h-4 w-4 text-primary" /></div>
                                    <div><p className="text-sm font-semibold">Notifications</p><p className="text-[10px] text-muted-foreground uppercase">Browser Alerts</p></div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    {getStatusBadge(notifStatus)}
                                    {notifStatus !== 'granted' && <Button size="sm" variant="ghost" className="h-6 text-[10px] uppercase" onClick={() => handleRequestPermission('notifications')}>Authorize</Button>}
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-3 rounded-xl border bg-secondary/20">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-background rounded-lg"><MapPin className="h-4 w-4 text-primary" /></div>
                                    <div><p className="text-sm font-semibold">Location</p><p className="text-[10px] text-muted-foreground uppercase">Geofencing Access</p></div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    {getStatusBadge(locationStatus)}
                                    {locationStatus !== 'granted' && <Button size="sm" variant="ghost" className="h-6 text-[10px] uppercase" onClick={() => handleRequestPermission('location')}>Authorize</Button>}
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-3 rounded-xl border bg-secondary/20 opacity-60">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-background rounded-lg"><Calendar className="h-4 w-4 text-primary" /></div>
                                    <div><p className="text-sm font-semibold">Availability Sync</p><p className="text-[10px] text-muted-foreground uppercase">Org Calendar</p></div>
                                </div>
                                <Badge variant="outline" className="text-[10px]">Auto-Managed</Badge>
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