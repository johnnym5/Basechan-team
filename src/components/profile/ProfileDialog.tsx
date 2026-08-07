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
import { Bell, Loader2, Pencil, MapPin, Lock, Activity, ShieldCheck, MonitorDot, FileCode, Info, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import { useFirestore, updateDocumentNonBlocking, useUser } from "@/firebase";
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
import { sanitizeInput, cn } from "@/lib/utils";
import { useFileUpload } from "@/hooks/useFileUpload";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Badge } from "../ui/badge";
import { ActivityHeatmap } from "../shared/ActivityHeatmap";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { useImpersonation } from "@/context/ImpersonationProvider";
import { usePermissions } from "@/hooks/usePermissions";
import { Switch } from "../ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AttendancePageContent } from "../attendance/AttendancePageContent";
import { LeavePageContent } from "../leave/LeavePageContent";
import { ReportsPageContent } from "../reports/ReportsPageContent";
import { User, Fingerprint, CalendarDays, BarChart3 } from "lucide-react";

import { StaffProfileView } from "./staff/StaffProfileView";

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

import { ModuleContainer } from "@/components/layout/shell/ModuleContainer";

export function ProfileDialog({ open, onOpenChange, userProfile, modal }: ProfileDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();
  const { user } = useUser();
  const { isSuperAdmin } = useSuperAdmin();
  const { isImpersonating, setIsImpersonating } = useImpersonation();
  const permissions = usePermissions(userProfile);
  const { isUploading, uploadProgress, uploadFile } = useFileUpload();
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  
  const isBusy = isSubmitting || isUploading;

  const [notifStatus, setNotifStatus] = useState<NotificationPermission | 'unsupported'>('default');
  const [locationStatus, setLocationStatus] = useState<'default' | 'granted' | 'denied' | 'unsupported'>('default');
  const [idleStatus, setIdleStatus] = useState<'default' | 'granted' | 'denied' | 'unsupported'>('default');
  const [fsStatus, setFsStatus] = useState<'default' | 'granted' | 'denied' | 'unsupported'>('default');

  const checkPermissions = async () => {
    if (typeof window === 'undefined') return;

    if ('Notification' in window) {
        setNotifStatus(Notification.permission);
    } else {
        setNotifStatus('unsupported');
    }

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

    if ('showDirectoryPicker' in window) {
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
      fullName: userProfile.fullName || "",
      phoneNumber: userProfile.phoneNumber || "",
    },
  });
  
  useEffect(() => {
    if(userProfile){
        form.reset({
          fullName: userProfile.fullName || "",
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
            description: `Please reset permissions in your browser's site settings.`,
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
        <DialogHeader className="sr-only">
            <DialogTitle>My Profile & Security</DialogTitle>
            <DialogDescription>Manage your information and app permissions.</DialogDescription>
        </DialogHeader>
        
        <Progress value={uploadProgress} className={isUploading ? "w-full rounded-none h-1 flex-shrink-0" : "hidden"} />

        <ModuleContainer
            title="Staff Hub"
            subtitle="Personnel Overview, Attendance, and Leave Management"
            noScroll={true}
        >
            <Tabs defaultValue="profile" className="flex-1 flex flex-col min-h-0 h-full">
                <div className="px-8 py-4 border-b border-white/5 bg-white/[0.02] shrink-0">
                    <TabsList className="bg-secondary/20 rounded-2xl p-1 border border-white/5 w-fit">
                        <TabsTrigger value="profile" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest gap-2 data-[state=active]:bg-background transition-all">
                            <User className="h-3.5 w-3.5" /> Profile
                        </TabsTrigger>
                        <TabsTrigger value="attendance" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest gap-2 data-[state=active]:bg-background transition-all">
                            <Fingerprint className="h-3.5 w-3.5" /> Attendance
                        </TabsTrigger>
                        <TabsTrigger value="leave" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest gap-2 data-[state=active]:bg-background transition-all">
                            <CalendarDays className="h-3.5 w-3.5" /> Leave
                        </TabsTrigger>
                        <TabsTrigger value="reports" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest gap-2 data-[state=active]:bg-background transition-all">
                            <BarChart3 className="h-3.5 w-3.5" /> Reports
                        </TabsTrigger>
                    </TabsList>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-0">
                    <TabsContent value="profile" className="m-0 focus-visible:ring-0 outline-none animate-in fade-in duration-500">
                        <div className="p-6 m-4 md:m-6 border border-white/10 rounded-2xl bg-[#121212]/80 backdrop-blur-sm overflow-hidden shadow-lg">
                            <StaffProfileView
                                userId={userProfile.id}
                                currentUserProfile={userProfile}
                                permissions={permissions}
                            />

                            {/* Read-Only Admin Notes for Staff */}
                            <div className="mt-8 pt-8 border-t border-white/5">
                                <div className="flex items-center gap-2 mb-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-40">
                                    <Info className="h-3.5 w-3.5" />
                                    Internal Administrative Records
                                </div>
                                <div className="p-6 rounded-2xl bg-secondary/10 border border-white/5 italic text-sm text-muted-foreground">
                                    {userProfile.adminNotes || "No administrative annotations recorded for this unit."}
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="attendance" className="m-0 focus-visible:ring-0 outline-none animate-in fade-in duration-500">
                        <div className="p-6 m-4 md:m-6 border border-white/10 rounded-2xl bg-[#121212]/80 backdrop-blur-sm overflow-hidden shadow-lg">
                            <AttendancePageContent noWrapper={true} />
                        </div>
                    </TabsContent>

                    <TabsContent value="leave" className="m-0 focus-visible:ring-0 outline-none animate-in fade-in duration-500">
                        <div className="p-6 m-4 md:m-6 border border-white/10 rounded-2xl bg-[#121212]/80 backdrop-blur-sm overflow-hidden shadow-lg">
                            <LeavePageContent />
                        </div>
                    </TabsContent>

                    <TabsContent value="reports" className="m-0 focus-visible:ring-0 outline-none animate-in fade-in duration-500">
                        <div className="p-6 m-4 md:m-6 border border-white/10 rounded-2xl bg-[#121212]/80 backdrop-blur-sm overflow-hidden shadow-lg">
                            <ReportsPageContent />
                        </div>
                    </TabsContent>
                </div>
            </Tabs>
        </ModuleContainer>
      </DialogContent>
    </Dialog>
  );
}
