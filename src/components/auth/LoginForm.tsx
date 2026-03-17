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
  username: z.string().min(1, { message: "Username is required." }),
  password: z.string().min(1, { message: "Password is required." }),
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
    setIsSubmitting(true);
    try {
      // 1. Use the hardcoded organization ID.
      const orgId = ORG_ID;

      // 2. Find user by username and orgId.
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

      // 3. Sign in with email and password. Email is already stored in lowercase.
      await signInWithEmailAndPassword(auth, userData.email, values.password);

      // Successful login will be handled by the layout redirect
      
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

  return (
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
              <FormDescription className="text-xs">This field is not case-sensitive.</FormDescription>
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
          Login
        </Button>
      </form>
    </Form>
  );
}
