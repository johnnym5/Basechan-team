"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Monitor, Smartphone } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth, useFirestore, errorEmitter } from "@/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { query, collection, where, getDocs, doc, updateDoc, getDoc } from "firebase/firestore";
import type { UserProfile } from "@/lib/types";
import { sanitizeInput } from "@/lib/utils";
import { ORG_ID } from "@/lib/config";
import { differenceInMinutes } from 'date-fns';

const generateUUID = () => {
  if (typeof window !== 'undefined' && window.crypto && typeof window.crypto.randomUUID === 'function') {
    try {
      return window.crypto.randomUUID();
    } catch (e) {
      // Fallback if randomUUID is disabled in current context
    }
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const formSchema = z.object({
  username: z.string().min(1, "Username is required."),
  password: z.string().min(1, "Password is required."),
  forceLogin: z.boolean().optional(),
});

export function LoginForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isIdVerified, setIsIdVerified] = useState<boolean | null>(null);
  const [isCheckingId, setIsCheckingId] = useState(false);
  const [requiresForceLogin, setRequiresForceLogin] = useState(false);
  const { toast } = useToast();
  const auth = useAuth();
  const firestore = useFirestore();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      password: "",
      forceLogin: false,
    },
  });

  const watchedUsername = form.watch("username");

  useEffect(() => {
    if (!firestore) return;
    
    const cleaned = sanitizeInput((watchedUsername || "").trim().toLowerCase());
    if (!cleaned) {
      setIsIdVerified(null);
      return;
    }

    setIsCheckingId(true);
    const timer = setTimeout(async () => {
      try {
        let verified = false;
        
        // 1. Try Document ID / UID
        const userDocRef = doc(firestore, "users", cleaned);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists() && userDoc.data()?.orgId === ORG_ID) {
          verified = true;
        } else {
          // 2. Try Username
          const q1 = query(
            collection(firestore, "users"), 
            where("orgId", "==", ORG_ID),
            where("username", "==", cleaned)
          );
          const s1 = await getDocs(q1);
          if (!s1.empty) {
            verified = true;
          } else {
            // 3. Try Email
            const q2 = query(
              collection(firestore, "users"), 
              where("orgId", "==", ORG_ID),
              where("email", "==", cleaned)
            );
            const s2 = await getDocs(q2);
            if (!s2.empty) {
              verified = true;
            }
          }
        }
        setIsIdVerified(verified);
      } catch (err) {
        errorEmitter.emit('firestore-error', err as any);
        setIsIdVerified(null);
      } finally {
        setIsCheckingId(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [watchedUsername, firestore]);

  const getDeviceType = () => {
    if (typeof window === 'undefined') return 'PC';
    const ua = navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) return 'PC';
    if (/Mobile|iP(hone|od|ad)|Android|BlackBerry|IEMobile|Kindle|NetFront|Silk-Accelerated|(hpw|web)OS|Fennec|Minimo|Opera M(obi|ini)|Blazer|Dolfin|Dolphin|Skyfire|Zune/i.test(ua)) {
      return 'MOBILE';
    }
    return 'PC';
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!auth || !firestore) return;
    setIsSubmitting(true);
    
    // TRIMMING THE INPUT IS CRITICAL - Mobile keyboards often add trailing spaces!
    const identity = values.username.trim().toLowerCase();
    const deviceType = getDeviceType();
    const sessionId = generateUUID();
    
    try {
      let userData: UserProfile | null = null;
      let userEmail = identity;

      // 1. Resolve User Identity
      if (!identity.includes('@')) {
          // If it is a username (no @), first query the Firestore users collection to find the document matching that username
          const usersRef = collection(firestore, "users");
          const userQuery = query(
            usersRef, 
            where("orgId", "==", ORG_ID),
            where("username", "==", sanitizeInput(identity))
          );
          const userSnapshot = await getDocs(userQuery);
          
          if (userSnapshot.empty) {
              toast({ variant: 'destructive', title: 'Login Failed', description: "Username not found in system." });
              setIsSubmitting(false);
              return;
          }

          userData = { id: userSnapshot.docs[0].id, ...userSnapshot.docs[0].data() } as UserProfile;
          userEmail = userData.email;
      } else {
          // If login by email, we still need to fetch the profile to check session
          const usersRef = collection(firestore, "users");
          const userQuery = query(
            usersRef, 
            where("orgId", "==", ORG_ID),
            where("email", "==", identity)
          );
          const userSnapshot = await getDocs(userQuery);
          if (!userSnapshot.empty) {
              userData = { id: userSnapshot.docs[0].id, ...userSnapshot.docs[0].data() } as UserProfile;
          }
      }

      // 2. CHECK FOR ACTIVE SESSION (Heartbeat logic)
      if (userData && userData.activeSessionId && userData.lastHeartbeat && !values.forceLogin) {
          const lastHeartbeat = new Date(userData.lastHeartbeat);
          const diff = differenceInMinutes(new Date(), lastHeartbeat);
          
          // If session was active in the last 3 minutes, prevent login
          if (diff < 3) {
              setRequiresForceLogin(true);
              throw new Error(`Security Alert: This account is already logged in on another ${userData.deviceType === 'PC' ? 'Desktop' : 'Mobile'} device. Please check "Force Login" to override this block and sign out the other device.`);
          }
      }

      // 3. Authenticate against Firestore database first (source of truth)
      if (!userData) {
          throw new Error("Invalid username or password.");
      }
      if (!userData.password || userData.password !== values.password) {
          throw new Error("Invalid username or password.");
      }

      // Synchronize/log in on Firebase Auth to preserve active secure session
      let userCredential;
      try {
          userCredential = await signInWithEmailAndPassword(auth, userEmail, values.password);
      } catch (authError: any) {
          // If password matched in Firestore but user account doesn't exist yet in Firebase Auth, register on the fly
          if (authError.code === 'auth/user-not-found' || authError.code === 'auth/invalid-credential') {
              const { createUserWithEmailAndPassword } = await import('firebase/auth');
              userCredential = await createUserWithEmailAndPassword(auth, userEmail, values.password);
          } else {
              throw authError;
          }
      }
      
      // 4. Register Session & Node Info
      const userRef = doc(firestore, 'users', userCredential.user.uid);
      await updateDoc(userRef, {
          activeSessionId: sessionId,
          deviceType: deviceType,
          lastHeartbeat: new Date().toISOString(),
          status: 'ONLINE'
      });

      // Store sessionId locally for verification
      localStorage.setItem('basechan-active-session', sessionId);

      toast({ 
          title: "Logged In", 
          description: `Access granted via ${deviceType === 'PC' ? 'Desktop' : 'Mobile'}.` 
      });

    } catch (error: any) {
       let message = "Please check your credentials and try again.";
       if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
           message = "Invalid username or password.";
       } else if (error.message) {
           message = error.message;
       }

       toast({
          variant: 'destructive',
          title: 'Login Failed',
          description: message,
      });
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
        <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
                <FormItem>
                <div className="flex justify-between items-center">
                    <FormLabel>Username or User ID</FormLabel>
                    {isCheckingId && <span className="text-[10px] text-muted-foreground animate-pulse">Checking ID...</span>}
                    {isIdVerified === true && <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-1">✓ ID Verified</span>}
                    {isIdVerified === false && <span className="text-[10px] font-bold text-rose-500">✗ ID Not Found</span>}
                </div>
                <FormControl>
                    <Input className="apple-glass" placeholder="Username, Email, or User ID" {...field} />
                </FormControl>
                <FormDescription className="text-[0.625rem] uppercase tracking-widest opacity-50">Enter your company ID, email, or username</FormDescription>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                    <Input className="apple-glass" type="password" placeholder="••••••••" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            {requiresForceLogin && (
                <FormField
                control={form.control}
                name="forceLogin"
                render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm bg-destructive/10 border-destructive/20">
                    <FormControl>
                        <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="border-destructive data-[state=checked]:bg-destructive data-[state=checked]:text-destructive-foreground"
                        />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                        <FormLabel className="text-destructive font-semibold">
                        Force Login & Terminate Other Sessions
                        </FormLabel>
                        <FormDescription className="text-xs text-destructive/80">
                        Check this to override the active session block and immediately sign out your other devices.
                        </FormDescription>
                    </div>
                    </FormItem>
                )}
                />
            )}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <>Login</>
                )}
            </Button>
        </form>
        </Form>
        
        <div className="flex items-center justify-center gap-6 pt-2 opacity-30">
            <div className="flex flex-col items-center gap-1">
                <Monitor className="h-4 w-4" />
                <span className="text-[8px] font-black uppercase">Desktop</span>
            </div>
            <div className="flex flex-col items-center gap-1">
                <Smartphone className="h-4 w-4" />
                <span className="text-[8px] font-black uppercase">Mobile</span>
            </div>
        </div>
    </div>
  );
}