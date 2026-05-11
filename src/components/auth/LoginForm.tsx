
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
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth, useFirestore } from "@/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { query, collection, where, getDocs } from "firebase/firestore";
import type { UserProfile } from "@/lib/types";
import { sanitizeInput } from "@/lib/utils";
import { ORG_ID } from "@/lib/config";


const formSchema = z.object({
  username: z.string().min(1, "Identity is required."),
  password: z.string().min(1, "Password is required."),
});

export function LoginForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!auth || !firestore) return;
    setIsSubmitting(true);
    
    const identity = values.username.toLowerCase();
    
    try {
      // 1. Check if it's an email (Direct Auth)
      if (identity.includes('@')) {
          await signInWithEmailAndPassword(auth, identity, values.password);
          toast({ title: "Authorized", description: "Access granted to secure terminal." });
          return;
      }

      // 2. Check if it's a username (Lookup then Auth)
      const orgId = ORG_ID;
      const usersRef = collection(firestore, "users");
      const userQuery = query(
        usersRef, 
        where("orgId", "==", orgId),
        where("username", "==", sanitizeInput(identity))
      );
      const userSnapshot = await getDocs(userQuery);
      
      if (userSnapshot.empty) {
          throw new Error("Identity not found in organization records.");
      }

      const userData = userSnapshot.docs[0].data() as UserProfile;
      await signInWithEmailAndPassword(auth, userData.email, values.password);
      toast({ title: "Authorized", description: `Welcome back, ${userData.fullName}.` });

    } catch (error: any) {
       let message = "Please check your credentials and try again.";
       if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
           message = "Invalid identity or access key.";
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
                <FormLabel>Identity</FormLabel>
                <FormControl>
                    <Input placeholder="Username or Email" {...field} />
                </FormControl>
                <FormDescription className="text-[0.625rem] uppercase tracking-widest opacity-50">Enter your organizational ID or email</FormDescription>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Access Key</FormLabel>
                <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Access Terminal
            </Button>
        </form>
        </Form>
    </div>
  );
}
