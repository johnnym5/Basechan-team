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
import { Loader2, Monitor, Smartphone, Globe } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth, useFirestore, errorEmitter } from "@/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { query, collection, where, getDocs, doc, updateDoc, getDoc, setDoc, deleteDoc, writeBatch } from "firebase/firestore";
import type { UserProfile } from "@/lib/types";
import { sanitizeInput } from "@/lib/utils";
import { ORG_ID } from "@/lib/config";
import { differenceInMinutes } from 'date-fns';
import { authService } from "@/services/auth-service";
import { Separator } from "@/components/ui/separator";

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
      
      // 4. Register Session & Node Info & Sync Profile UID
      const authUid = userCredential.user.uid;

      // If the profile document ID in Firestore is not the same as the Auth UID, migrate it
      if (userData.id !== authUid) {
          console.log(`[AUTH] Profile UID mismatch. Migrating document from ${userData.id} to ${authUid}`);
          try {
              const batch = writeBatch(firestore);
              const newRef = doc(firestore, 'users', authUid);
              const oldRef = doc(firestore, 'users', userData.id);

              // Copy data to new location
              batch.set(newRef, {
                  ...userData,
                  id: authUid,
                  activeSessionId: sessionId,
                  deviceType: deviceType,
                  lastHeartbeat: new Date().toISOString(),
                  status: 'ONLINE'
              });

              // Delete old location
              batch.delete(oldRef);

              await batch.commit();
              console.log("[AUTH] Profile migration successful.");
          } catch (migrateError) {
              console.error("[AUTH] Profile migration failed:", migrateError);
              // Fallback: try to at least update the auth UID document if copy fails
              await setDoc(doc(firestore, 'users', authUid), {
                  ...userData,
                  id: authUid,
                  activeSessionId: sessionId,
                  deviceType: deviceType,
                  lastHeartbeat: new Date().toISOString(),
                  status: 'ONLINE'
              }, { merge: true });
          }
      } else {
          const userRef = doc(firestore, 'users', authUid);
          await updateDoc(userRef, {
              activeSessionId: sessionId,
              deviceType: deviceType,
              lastHeartbeat: new Date().toISOString(),
              status: 'ONLINE'
          });
      }

      // 5. Force Refresh Privilege Matrix
      await authService.syncUserPermissions(firestore, authUid);

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

  const handleGoogleSignIn = async () => {
    if (!auth || !firestore) return;
    setIsSubmitting(true);
    try {
      await authService.signInWithGoogle(auth, firestore);
      toast({
        title: "Logged In",
        description: "Access granted via Google Authorization."
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Google Login Failed',
        description: error.message || "Could not authenticate with Google.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

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

        <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest">
                <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
            </div>
        </div>

        <Button
            variant="outline"
            className="w-full border-white/10 hover:bg-white/5 h-11 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2"
            onClick={handleGoogleSignIn}
            disabled={isSubmitting}
        >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                />
                <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                />
                <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                />
                <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z"
                    fill="#EA4335"
                />
            </svg>
            Google Command
        </Button>

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