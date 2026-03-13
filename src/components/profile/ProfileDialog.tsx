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
import { Bell, BellOff, BellRing, Loader2, Pencil } from "lucide-react";
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

  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );

  useEffect(() => {
    if (open && typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
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
    if (!firestore || !user) {
      toast({ variant: 'destructive', title: 'Error', description: 'User not found.' });
      return;
    }
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

      toast({
        title: "Profile Updated",
        description: "Your information has been updated.",
      });

      onOpenChange(false);
    } catch (error: any) {
      if (error.code !== 'permission-denied') {
        toast({
          variant: "destructive",
          title: "Update Failed",
          description: error.message || "An unexpected error occurred.",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const handlePasswordReset = async () => {
    if (!auth || !userProfile.email) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not send reset email. User email not found.' });
      return;
    }

    const actionCodeSettings = {
      url: `${window.location.origin}/login`,
      handleCodeInApp: true,
    };

    try {
      await sendPasswordResetEmail(auth, userProfile.email, actionCodeSettings);
      toast({
        title: 'Password Reset Email Sent',
        description: `An email has been sent to ${userProfile.email} with instructions to reset your password.`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to Send Email',
        description: error.message,
      });
    }
  };
  
  const handleRequestNotificationPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      toast({
        variant: 'destructive',
        title: 'Unsupported',
        description: 'Your browser does not support desktop notifications.',
      });
      return;
    }
    
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);

    if (permission === 'granted') {
      toast({
        title: 'Notifications Enabled',
        description: 'You will now receive desktop notifications.',
      });
    } else if (permission === 'denied') {
      toast({
        variant: 'destructive',
        title: 'Notifications Blocked',
        description: 'You may need to change this in your browser settings.',
      });
    }
  };
  
  const renderNotificationStatus = () => {
    switch (notificationPermission) {
      case 'granted':
        return <div className="flex items-center gap-2 text-sm text-emerald-500"><BellRing className="h-4 w-4"/> Enabled</div>;
      case 'denied':
        return <div className="flex items-center gap-2 text-sm text-destructive"><BellOff className="h-4 w-4"/> Denied</div>;
      default:
        return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Bell className="h-4 w-4"/> Not Enabled</div>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>My Profile</DialogTitle>
          <DialogDescription>
            View and update your personal information.
          </DialogDescription>
        </DialogHeader>
        
        <div className="relative mx-auto w-24 h-24 my-6">
            <Avatar className="w-24 h-24 border-2 border-primary/20">
                <AvatarImage src={avatarPreview || userProfile.avatarUrl || user?.photoURL || ''} alt={userProfile.fullName} />
                <AvatarFallback className="text-3xl">{userProfile.fullName.split(' ').map(n=>n[0]).join('')}</AvatarFallback>
            </Avatar>
            <label htmlFor="avatar-upload" className="absolute -bottom-2 -right-2 bg-primary text-primary-foreground rounded-full p-2 cursor-pointer hover:bg-primary/90 transition-colors">
                <Pencil className="h-4 w-4" />
                <Input id="avatar-upload" type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
            </label>
        </div>
        {isUploading && <Progress value={uploadProgress} className="w-full" />}
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input type="tel" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormItem>
                <FormLabel>Username</FormLabel>
                <FormControl>
                    <Input value={userProfile.username} disabled />
                </FormControl>
             </FormItem>
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                    <Input value={userProfile.email} disabled />
                </FormControl>
             </FormItem>
              <FormItem>
                <FormLabel>Position</FormLabel>
                <FormControl>
                    <Input value={userProfile.position} disabled />
                </FormControl>
             </FormItem>
            <Button type="submit" className="w-full" disabled={isBusy}>
              {isBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save Changes"}
            </Button>
          </form>
        </Form>
        <Separator className="my-4" />
        <div className="space-y-4">
            <h4 className="text-sm font-medium">Notifications</h4>
            <div className="flex items-center justify-between rounded-lg border p-3">
                 <p className="text-sm text-muted-foreground">Desktop Notifications</p>
                 {renderNotificationStatus()}
            </div>
            {notificationPermission === 'default' && (
              <Button variant="outline" className="w-full" onClick={handleRequestNotificationPermission}>
                Enable Desktop Notifications
              </Button>
            )}
             {notificationPermission === 'denied' && (
              <p className="text-xs text-muted-foreground text-center">You must enable notifications in your browser settings to receive alerts.</p>
            )}
        </div>
        <Separator className="my-4" />
        <div className="space-y-2">
            <h4 className="text-sm font-medium">Security</h4>
            <Button variant="outline" className="w-full" onClick={handlePasswordReset}>
                Send Password Reset Email
            </Button>
            <p className="text-xs text-muted-foreground text-center">You will receive a secure link to change your password.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
