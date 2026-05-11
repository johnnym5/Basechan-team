
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
import { Loader2, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth, useFirestore } from "@/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { query, collection, where, getDocs } from "firebase/firestore";
import type { UserProfile } from "@/lib/types";
import { sanitizeInput } from "@/lib/utils";
import { ORG_ID } from "@/lib/config";


const formSchema = z.object({
  username: z.string(),
  password: z.string(),
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
    
    if (!values.username || !values.password) {
        toast({
            variant: 'destructive',
            title: 'Login Failed',
            description: "Username and password are required.",
        });
        setIsSubmitting(false);
        return;
    }
    
    try {
      // Bypass for Super Admin if email is entered in username field
      if (values.username.toLowerCase() === 'jegbase@gmail.com') {
          await signInWithEmailAndPassword(auth, 'jegbase@gmail.com', values.password);
          return;
      }

      const orgId = ORG_ID;
      const usersRef = collection(firestore, "users");
      const userQuery = query(
        usersRef, 
        where("orgId", "==", orgId),
        where("username", "==", sanitizeInput(values.username.toLowerCase()))
      );
      const userSnapshot = await getDocs(userQuery);
      
      if (userSnapshot.empty) {
          throw new Error("Invalid credentials.");
      }

      const userData = userSnapshot.docs[0].data() as UserProfile;
      await signInWithEmailAndPassword(auth, userData.email, values.password);

    } catch (error: any) {
       toast({
          variant: 'destructive',
          title: 'Login Failed',
          description: "Please check your credentials and try again.",
      });
    } finally {
        setIsSubmitting(false);
    }
  }

  const handleBypass = async () => {
    if (!auth) return;
    setIsSubmitting(true);
    try {
        await signInWithEmailAndPassword(auth, 'jegbase@gmail.com', '000000');
        toast({ title: "Bypass Successful", description: "Logged in as Super Admin." });
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Bypass Failed', description: e.message });
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
                <FormLabel>Username</FormLabel>
                <FormControl>
                    <Input placeholder="johndoe" {...field} />
                </FormControl>
                <FormDescription className="text-[0.625rem] uppercase tracking-widest opacity-50">Username or Identity Email</FormDescription>
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
        
        <div className="pt-4 border-t border-white/5">
            <Button 
                variant="outline" 
                className="w-full border-primary/20 text-primary hover:bg-primary/10 transition-all group" 
                onClick={handleBypass}
                disabled={isSubmitting}
            >
                <ShieldCheck className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform" />
                Quick Admin Bypass
            </Button>
        </div>
    </div>
  );
}
