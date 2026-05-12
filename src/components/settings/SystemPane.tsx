"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Loader2, MapPin } from "lucide-react";
import { useState, useEffect } from "react";
import { useFirestore, updateDocumentNonBlocking } from "@/firebase";
import { doc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import type { UserProfile, SystemConfig } from "@/lib/types";
import { useSystemConfig } from "@/hooks/useSystemConfig";
import { Skeleton } from "../ui/skeleton";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../ui/card";
import { hexToHslString } from "@/lib/utils";

const formSchema = z.object({
  branding_color: z.string().optional(),
  accent_color: z.string().optional(),
  currency_symbol: z.string().max(3, "Symbol should be 1-3 characters").optional(),
  finance_access: z.boolean(),
  chat_enabled: z.boolean(),
  attendance_strict: z.boolean(),
  allow_self_edit: z.boolean(),
  office_lat: z.coerce.number().optional().nullable(),
  office_lng: z.coerce.number().optional().nullable(),
});

type FormData = z.infer<typeof formSchema>;

interface SystemPaneProps {
    currentUserProfile: UserProfile;
}

export function SystemPane({ currentUserProfile }: SystemPaneProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();
  const { config, isLoading: isConfigLoading } = useSystemConfig(currentUserProfile.orgId);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      finance_access: true,
      chat_enabled: true,
      attendance_strict: false,
      allow_self_edit: true,
    }
  });

  useEffect(() => {
    if (config) {
        form.reset({
            branding_color: config.branding_color || '#3b82f6',
            accent_color: config.accent_color || '#1e293b',
            currency_symbol: config.currency_symbol || '$',
            finance_access: config.finance_access,
            chat_enabled: config.chat_enabled,
            attendance_strict: config.attendance_strict,
            allow_self_edit: config.allow_self_edit,
            office_lat: config.office_coordinates?.lat,
            office_lng: config.office_coordinates?.lng,
        });
    }
  }, [config, form]);


  const handleGetCurrentLocation = () => {
    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
        (position) => {
            form.setValue('office_lat', position.coords.latitude);
            form.setValue('office_lng', position.coords.longitude);
            toast({ title: 'Location captured!', description: 'Remember to save your changes.' });
            setIsGettingLocation(false);
        },
        (error) => {
            toast({ variant: 'destructive', title: 'Location Error', description: error.message });
            setIsGettingLocation(false);
        }
    );
  }


  async function onSubmit(values: FormData) {
    if (!firestore || !config) return;
    setIsSubmitting(true);
    
    // Convert empty strings to null for colors
    const updateData: Partial<SystemConfig> & { office_coordinates?: any } = {
        ...values,
        branding_color: values.branding_color || null,
        accent_color: values.accent_color || null,
        office_coordinates: (values.office_lat != null && values.office_lng != null) 
            ? { lat: values.office_lat, lng: values.office_lng } 
            : null,
    };
    
    // @ts-ignore
    delete updateData.office_lat;
    // @ts-ignore
    delete updateData.office_lng;


    try {
      const configRef = doc(firestore, 'system_configs', config.id);
      await updateDocumentNonBlocking(configRef, updateData);

      // Apply theme update immediately
      const root = document.documentElement;
      if (updateData.branding_color) {
        const hslString = hexToHslString(updateData.branding_color);
        if (hslString) root.style.setProperty('--primary', hslString);
      }
       if (updateData.accent_color) {
        const hslString = hexToHslString(updateData.accent_color);
        if (hslString) root.style.setProperty('--accent', hslString);
      }

      toast({
        title: "Settings Saved",
        description: "Your organization's system settings have been updated.",
      });
    } catch (error: any) {
        toast({ variant: "destructive", title: "Update Failed", description: error.message });
    } finally {
        setIsSubmitting(false);
    }
  }
  
  if (isConfigLoading) {
    return <Skeleton className="h-96 w-full" />
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card>
            <CardHeader>
                <CardTitle>Branding</CardTitle>
                <CardDescription>Customize the look and feel of the application for your organization.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="branding_color" render={({ field }) => (
                        <FormItem><FormLabel>Primary Color</FormLabel>
                            <FormControl>
                                <div className="relative">
                                    <Input {...field} className="pl-12" />
                                    <Input type="color" value={field.value || '#000000'} onChange={field.onChange} className="absolute left-1 top-1/2 -translate-y-1/2 h-8 w-10 p-1"/>
                                </div>
                            </FormControl>
                        <FormMessage /></FormItem>
                    )}/>
                     <FormField control={form.control} name="accent_color" render={({ field }) => (
                        <FormItem><FormLabel>Accent Color</FormLabel>
                             <FormControl>
                                <div className="relative">
                                    <Input {...field} className="pl-12" />
                                    <Input type="color" value={field.value || '#000000'} onChange={field.onChange} className="absolute left-1 top-1/2 -translate-y-1/2 h-8 w-10 p-1"/>
                                </div>
                            </FormControl>
                        <FormMessage /></FormItem>
                    )}/>
                </div>
                 <FormField control={form.control} name="currency_symbol" render={({ field }) => (
                    <FormItem><FormLabel>Currency Symbol</FormLabel>
                        <FormControl><Input {...field} className="w-24" /></FormControl>
                    <FormMessage /></FormItem>
                )}/>
            </CardContent>
        </Card>
        
         <Card>
            <CardHeader>
                <CardTitle>Feature Flags</CardTitle>
                <CardDescription>Enable or disable specific modules and behaviors across the application.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <FormField control={form.control} name="finance_access" render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5"><FormLabel>Requisitions Module</FormLabel><FormDescription>Enable the financial requisitions module for all users.</FormDescription></div>
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    </FormItem>
                )}/>
                 <FormField control={form.control} name="chat_enabled" render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5"><FormLabel>Internal Chat</FormLabel><FormDescription>Allow users to send direct messages to each other.</FormDescription></div>
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    </FormItem>
                )}/>
                <FormField control={form.control} name="attendance_strict" render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5"><FormLabel>Strict Attendance</FormLabel><FormDescription>Enable geofencing for office clock-ins.</FormDescription></div>
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    </FormItem>
                )}/>
                <FormField control={form.control} name="allow_self_edit" render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5"><FormLabel>Profile Self-Editing</FormLabel><FormDescription>Allow staff-level users to edit their own profiles.</FormDescription></div>
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    </FormItem>
                )}/>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Geofencing</CardTitle>
                <CardDescription>Set the office coordinates for strict attendance mode. This requires user location permission.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="office_lat" render={({ field }) => (
                        <FormItem><FormLabel>Office Latitude</FormLabel>
                        <FormControl><Input type="number" step="any" placeholder="e.g., 34.0522" {...field} value={field.value ?? ''} /></FormControl>
                        <FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name="office_lng" render={({ field }) => (
                        <FormItem><FormLabel>Office Longitude</FormLabel>
                        <FormControl><Input type="number" step="any" placeholder="e.g., -118.2437" {...field} value={field.value ?? ''}/></FormControl>
                        <FormMessage /></FormItem>
                    )}/>
                </div>
                <Button type="button" variant="outline" onClick={handleGetCurrentLocation} disabled={isGettingLocation}>
                    {isGettingLocation ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <MapPin className="mr-2 h-4 w-4" />}
                    Get Current Location
                </Button>
            </CardContent>
        </Card>

        <Button type="submit" disabled={isSubmitting || isConfigLoading} className="w-full">
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save All Settings"}
        </Button>
      </form>
    </Form>
  );
}
