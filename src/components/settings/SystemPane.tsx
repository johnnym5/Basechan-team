"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Loader2, MapPin, Clock, Palette } from "lucide-react";
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
  reporting_required: z.boolean(),
  reporting_deadline: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:mm)"),
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
      reporting_required: true,
      reporting_deadline: "17:30",
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
            reporting_required: config.reporting_schedule?.required ?? true,
            reporting_deadline: config.reporting_schedule?.deadline ?? "17:30",
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
    
    const updateData: Partial<SystemConfig> & { office_coordinates?: any } = {
        finance_access: values.finance_access,
        chat_enabled: values.chat_enabled,
        attendance_strict: values.attendance_strict,
        allow_self_edit: values.allow_self_edit,
        currency_symbol: values.currency_symbol || '$',
        branding_color: values.branding_color || null,
        accent_color: values.accent_color || null,
        reporting_schedule: {
            required: values.reporting_required,
            deadline: values.reporting_deadline,
        },
        office_coordinates: (values.office_lat != null && values.office_lng != null) 
            ? { lat: values.office_lat, lng: values.office_lng } 
            : null,
    };

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
        <Card className="apple-glass border-none">
            <CardHeader>
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-primary/20"><Palette className="h-5 w-5 text-primary" /></div>
                    <div>
                        <CardTitle>Branding & Identity</CardTitle>
                        <CardDescription>Customize the visual signature of the secure terminal.</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="branding_color" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Primary Color</FormLabel>
                            <FormControl>
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full border shadow-inner shrink-0" style={{ backgroundColor: field.value }} />
                                    <Input {...field} placeholder="#3b82f6" className="rounded-xl font-mono" />
                                    <Input type="color" value={field.value || '#000000'} onChange={field.onChange} className="w-12 h-10 p-0 border-none bg-transparent cursor-pointer shrink-0"/>
                                </div>
                            </FormControl>
                            <FormDescription className="text-[10px]">Controls main buttons, gauges, and active states.</FormDescription>
                        <FormMessage /></FormItem>
                    )}/>
                     <FormField control={form.control} name="accent_color" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Accent Color</FormLabel>
                             <FormControl>
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full border shadow-inner shrink-0" style={{ backgroundColor: field.value }} />
                                    <Input {...field} placeholder="#1e293b" className="rounded-xl font-mono" />
                                    <Input type="color" value={field.value || '#000000'} onChange={field.onChange} className="w-12 h-10 p-0 border-none bg-transparent cursor-pointer shrink-0"/>
                                </div>
                            </FormControl>
                            <FormDescription className="text-[10px]">Controls highlights and secondary visual elements.</FormDescription>
                        <FormMessage /></FormItem>
                    )}/>
                </div>
                 <FormField control={form.control} name="currency_symbol" render={({ field }) => (
                    <FormItem><FormLabel>Fiscal Symbol</FormLabel>
                        <FormControl><Input {...field} placeholder="$" className="w-24 rounded-xl text-center font-bold text-lg" /></FormControl>
                        <FormDescription className="text-[10px]">Prefix for all financial data.</FormDescription>
                    <FormMessage /></FormItem>
                )}/>
            </CardContent>
        </Card>
        
         <Card className="apple-glass border-none">
            <CardHeader>
                <CardTitle>Operating Policies</CardTitle>
                <CardDescription>Enable or disable specific modules and compliance behaviors.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <FormField control={form.control} name="finance_access" render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-2xl border p-4 shadow-sm bg-secondary/10 border-white/5">
                        <div className="space-y-0.5"><FormLabel>Requisitions Module</FormLabel><FormDescription className="text-xs">Enable procurement workflows.</FormDescription></div>
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    </FormItem>
                )}/>
                 <FormField control={form.control} name="chat_enabled" render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-2xl border p-4 shadow-sm bg-secondary/10 border-white/5">
                        <div className="space-y-0.5"><FormLabel>Secure Messaging</FormLabel><FormDescription className="text-xs">Allow encrypted staff communication.</FormDescription></div>
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    </FormItem>
                )}/>
                <FormField control={form.control} name="attendance_strict" render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-2xl border p-4 shadow-sm bg-secondary/10 border-white/5">
                        <div className="space-y-0.5"><FormLabel>Strict Geofencing</FormLabel><FormDescription className="text-xs">Enforce location-based clock-ins.</FormDescription></div>
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    </FormItem>
                )}/>
                
                <div className="pt-4 space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Automated Reporting</h4>
                    <FormField control={form.control} name="reporting_required" render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-2xl border p-4 shadow-sm bg-secondary/10 border-white/5">
                            <div className="space-y-0.5"><FormLabel>Daily Activity Reports</FormLabel><FormDescription className="text-xs">Require staff to submit EOD summaries.</FormDescription></div>
                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        </FormItem>
                    )}/>
                    <FormField control={form.control} name="reporting_deadline" render={({ field }) => (
                        <FormItem><FormLabel className="flex items-center gap-2"><Clock className="h-3 w-3" /> Submission Deadline (HH:mm)</FormLabel>
                            <FormControl><Input placeholder="17:00" {...field} className="rounded-xl w-32" /></FormControl>
                            <FormDescription className="text-xs">KPIs will flag overdue reports after this time.</FormDescription>
                        <FormMessage /></FormItem>
                    )}/>
                </div>
            </CardContent>
        </Card>

        <Card className="apple-glass border-none">
            <CardHeader>
                <CardTitle>Site Coordinates</CardTitle>
                <CardDescription>Set the office location for geofencing enforcement.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="office_lat" render={({ field }) => (
                        <FormItem><FormLabel>Latitude</FormLabel>
                        <FormControl><Input type="number" step="any" {...field} value={field.value ?? ''} className="rounded-xl" /></FormControl>
                        <FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name="office_lng" render={({ field }) => (
                        <FormItem><FormLabel>Longitude</FormLabel>
                        <FormControl><Input type="number" step="any" {...field} value={field.value ?? ''} className="rounded-xl" /></FormControl>
                        <FormMessage /></FormItem>
                    )}/>
                </div>
                <Button type="button" variant="outline" onClick={handleGetCurrentLocation} disabled={isGettingLocation} className="rounded-xl">
                    {isGettingLocation ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <MapPin className="mr-2 h-4 w-4" />}
                    Capture Device Location
                </Button>
            </CardContent>
        </Card>

        <Button type="submit" disabled={isSubmitting || isConfigLoading} className="w-full h-14 text-base font-black uppercase tracking-widest rounded-2xl interactive-element">
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Authorize & Apply Configuration"}
        </Button>
      </form>
    </Form>
  );
}
