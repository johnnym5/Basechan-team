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
import { Loader2, Monitor, Smartphone } from "lucide-react";
<<<<<<< HEAD
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth, useFirestore } from "@/firebase";
=======
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth, useFirestore, errorEmitter } from "@/firebase";
>>>>>>> 8c2f2c7ee9c25fe21fb0f2e265f70b5d1d4e553a
import { signInWithEmailAndPassword } from "firebase/auth";
import { query, collection, where, getDocs, doc, updateDoc, getDoc } from "firebase/firestore";
import type { UserProfile } from "@/lib/types";
import { sanitizeInput } from "@/lib/utils";
import { ORG_ID } from "@/lib/config";
import { differenceInMinutes } from 'date-fns';

const formSchema = z.object({
  username: z.string().min(1, "Username is required."),
  password: z.string().min(1, "Password is required."),
});

export function LoginForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
<<<<<<< HEAD
=======
  const [isIdVerified, setIsIdVerified] = useState<boolean | null>(null);
  const [isCheckingId, setIsCheckingId] = useState(false);
>>>>>>> 8c2f2c7ee9c25fe21fb0f2e265f70b5d1d4e553a
  const { toast } = useToast();
  const auth = useAuth();
  const firestore = useFirestore();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

<<<<<<< HEAD
=======
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
        errorEmitter.emit('firestore-error', err);
        setIsIdVerified(null);
      } finally {
        setIsCheckingId(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [watchedUsername, firestore]);

>>>>>>> 8c2f2c7ee9c25fe21fb0f2e265f70b5d1d4e553a
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
    
<<<<<<< HEAD
    const identity = values.username.toLowerCase();
=======
    // TRIMMING THE INPUT IS CRITICAL - Mobile keyboards often add trailing spaces!
    const identity = values.username.trim().toLowerCase();
>>>>>>> 8c2f2c7ee9c25fe21fb0f2e265f70b5d1d4e553a
    const deviceType = getDeviceType();
    const sessionId = crypto.randomUUID();
    
    try {
      let userData: UserProfile | null = null;
      let userEmail = identity;

      // 1. Resolve User Identity
      if (!identity.includes('@')) {
<<<<<<< HEAD
=======
          // If it is a username (no @), first query the Firestore users collection to find the document matching that username
>>>>>>> 8c2f2c7ee9c25fe21fb0f2e265f70b5d1d4e553a
          const usersRef = collection(firestore, "users");
          const userQuery = query(
            usersRef, 
            where("orgId", "==", ORG_ID),
            where("username", "==", sanitizeInput(identity))
          );
          const userSnapshot = await getDocs(userQuery);
          
          if (userSnapshot.empty) {
<<<<<<< HEAD
              throw new Error("User not found in organization records.");
=======
              toast({ variant: 'destructive', title: 'Login Failed', description: "Username not found in system." });
              setIsSubmitting(false);
              return;
>>>>>>> 8c2f2c7ee9c25fe21fb0f2e265f70b5d1d4e553a
          }

          userData = { id: userSnapshot.docs[0].id, ...userSnapshot.docs[0].data() } as UserProfile;
          userEmail = userData.email;
      } else {
          // If login by email, we still need to fetch the profile to check session
          const usersRef = collection(firestore, "users");
<<<<<<< HEAD
          const userQuery = query(usersRef, where("email", "==", identity));
=======
          const userQuery = query(
            usersRef, 
            where("orgId", "==", ORG_ID),
            where("email", "==", identity)
          );
>>>>>>> 8c2f2c7ee9c25fe21fb0f2e265f70b5d1d4e553a
          const userSnapshot = await getDocs(userQuery);
          if (!userSnapshot.empty) {
              userData = { id: userSnapshot.docs[0].id, ...userSnapshot.docs[0].data() } as UserProfile;
          }
      }

      // 2. CHECK FOR ACTIVE SESSION (Heartbeat logic)
      if (userData && userData.activeSessionId && userData.lastHeartbeat) {
          const lastHeartbeat = new Date(userData.lastHeartbeat);
          const diff = differenceInMinutes(new Date(), lastHeartbeat);
          
          // If session was active in the last 3 minutes, prevent login
          if (diff < 3) {
              throw new Error(`Security Alert: This account is already logged in on another ${userData.deviceType === 'PC' ? 'Desktop' : 'Mobile'} device. Please sign out from that device first.`);
          }
      }

      // 3. Authenticate
      const userCredential = await signInWithEmailAndPassword(auth, userEmail, values.password);
      
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
<<<<<<< HEAD
                <FormLabel>Username</FormLabel>
                <FormControl>
                    <Input placeholder="Username or Email" {...field} />
                </FormControl>
                <FormDescription className="text-[0.625rem] uppercase tracking-widest opacity-50">Enter your company ID or email</FormDescription>
=======
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
>>>>>>> 8c2f2c7ee9c25fe21fb0f2e265f70b5d1d4e553a
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
<<<<<<< HEAD
                    <Input type="password" placeholder="••••••••" {...field} />
=======
                    <Input className="apple-glass" type="password" placeholder="••••••••" {...field} />
>>>>>>> 8c2f2c7ee9c25fe21fb0f2e265f70b5d1d4e553a
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
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