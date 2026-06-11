"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, MapPin, Clock, Palette, FileText, Info } from "lucide-react";
import { useState, useEffect } from "react";
import { useFirestore, updateDocumentNonBlocking } from "@/firebase";
import { doc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import type { UserProfile, SystemConfig } from "@/lib/types";
import { useSystemConfig } from "@/hooks/useSystemConfig";
import { Skeleton } from "../ui/skeleton";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../ui/card";
import { hexToHslString, sanitizeInput } from "@/lib/utils";

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
  // Document Template Settings
  template_header: z.string().optional(),
  template_footer: z.string().optional(),
  template_address: z.string().optional(),
  template_terms: z.string().optional(),
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
            branding_color: config.branding_color || '#cab348',
            accent_color: config.accent_color || '#0d1e30',
            currency_symbol: config.currency_symbol || '$',
            finance_access: config.finance_access ?? true,
            chat_enabled: config.chat_enabled ?? true,
            attendance_strict: config.attendance_strict ?? false,
            allow_self_edit: config.allow_self_edit ?? true,
            reporting_required: config.reporting_schedule?.required ?? true,
            reporting_deadline: config.reporting_schedule?.deadline ?? "17:30",
            office_lat: config.office_coordinates?.lat,
            office_lng: config.office_coordinates?.lng,
            template_header: config.document_template?.header_text || "OFFICIAL FINANCIAL RECORD",
            template_footer: config.document_template?.footer_text || "Authorized signature required.",
            template_address: config.document_template?.company_address || "Basechan International HQ",
            template_terms: config.document_template?.terms_conditions || "Payment is due within 30 days.",
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
        document_template: {
            header_text: sanitizeInput(values.template_header || ""),
            footer_text: sanitizeInput(values.template_footer || ""),
            company_address: sanitizeInput(values.template_address || ""),
            terms_conditions: sanitizeInput(values.template_terms || ""),
        }
    };

    try {
      const configRef = doc(firestore, 'system_configs', config.id);
      updateDocumentNonBlocking(configRef, updateData);

      // Apply theme update immediately for real-time visual feedback
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
        title: "Configuration Deployed",
        description: "Your organization's system parameters have been successfully updated.",
      });
    } catch (error: any) {
        toast({ variant: "destructive", title: "Deployment Failure", description: error.message || "Failed to commit system updates to the infrastructure." });
    } finally {
        setIsSubmitting(false);
    }
  }
  
  if (isConfigLoading) {
    return <div className="space-y-6">{Array.from({length: 3}).map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-2xl" />)}</div>
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-12 animate-in fade-in duration-700">
        <Card className="apple-glass border-none shadow-xl overflow-hidden">
            <CardHeader className="bg-white/5 border-b border-white/5">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-primary/20"><Palette className="h-5 w-5 text-primary" /></div>
                    <div>
                        <CardTitle>Branding & Identity</CardTitle>
                        <CardDescription>Customize the visual signature of the secure terminal.</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="branding_color" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-60">Primary Brand Color</FormLabel>
                            <FormControl>
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full border border-white/10 shadow-inner shrink-0" style={{ backgroundColor: field.value }} />
                                    <Input {...field} placeholder="#cab348" className="rounded-xl font-mono bg-background/50 border-white/5" />
                                    <Input type="color" value={field.value || '#cab348'} onChange={field.onChange} className="w-12 h-10 p-0 border-none bg-transparent cursor-pointer shrink-0"/>
                                </div>
                            </FormControl>
                            <FormDescription className="text-[9px] uppercase tracking-tighter opacity-50">Controls buttons, gauges, and active states.</FormDescription>
                        <FormMessage /></FormItem>
                    )}/>
                     <FormField control={form.control} name="accent_color" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-60">Accent Highlight</FormLabel>
                             <FormControl>
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full border border-white/10 shadow-inner shrink-0" style={{ backgroundColor: field.value }} />
                                    <Input {...field} placeholder="#0d1e30" className="rounded-xl font-mono bg-background/50 border-white/5" />
                                    <Input type="color" value={field.value || '#0d1e30'} onChange={field.onChange} className="w-12 h-10 p-0 border-none bg-transparent cursor-pointer shrink-0"/>
                                </div>
                            </FormControl>
                            <FormDescription className="text-[9px] uppercase tracking-tighter opacity-50">Controls secondary visual accents.</FormDescription>
                        <FormMessage /></FormItem>
                    )}/>
                </div>
                 <FormField control={form.control} name="currency_symbol" render={({ field }) => (
                    <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-60">Fiscal Symbol</FormLabel>
                        <FormControl><Input {...field} placeholder="$" className="w-24 rounded-xl text-center font-black text-lg bg-background/50 border-white/5 h-12" /></FormControl>
                        <FormDescription className="text-[9px] uppercase tracking-tighter opacity-50">Prefix for all financial data nodes.</FormDescription>
                    <FormMessage /></FormItem>
                )}/>
            </CardContent>
        </Card>

        <Card className="apple-glass border-none shadow-xl overflow-hidden">
            <CardHeader className="bg-white/5 border-b border-white/5">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500"><FileText className="h-5 w-5" /></div>
                    <div>
                        <CardTitle>Finance Reporting Templates</CardTitle>
                        <CardDescription>Configure layouts for generated Word/Excel exports.</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="template_header" render={({ field }) => (
                        <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-60">Banner Title</FormLabel><FormControl><Input placeholder="e.g., TAX INVOICE" {...field} className="rounded-xl bg-background/50 border-white/5" /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name="template_address" render={({ field }) => (
                        <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-60">Address Node</FormLabel><FormControl><Input placeholder="123 Corporate Blvd..." {...field} className="rounded-xl bg-background/50 border-white/5" /></FormControl><FormMessage /></FormItem>
                    )}/>
                </div>
                <FormField control={form.control} name="template_terms" render={({ field }) => (
                    <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-60">Legal Meta / Terms</FormLabel><FormControl><Textarea placeholder="Terms and conditions..." {...field} className="rounded-2xl bg-background/50 border-white/5 min-h-[80px]" /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="template_footer" render={({ field }) => (
                    <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-60">Footer Sign-off</FormLabel><FormControl><Input placeholder="e.g., Authorized Signature" {...field} className="rounded-xl bg-background/50 border-white/5" /></FormControl><FormMessage /></FormItem>
                )}/>
            </CardContent>
        </Card>
        
         <Card className="apple-glass border-none shadow-xl overflow-hidden">
            <CardHeader className="bg-white/5 border-b border-white/5">
                <CardTitle>Operating Policies</CardTitle>
                <CardDescription>Enable or disable specific modules and compliance behaviors.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
                <FormField control={form.control} name="finance_access" render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-2xl border p-4 shadow-sm bg-secondary/10 border-white/5">
                        <div className="space-y-0.5"><FormLabel className="text-sm font-bold">Finance Module</FormLabel><FormDescription className="text-[10px] uppercase font-medium">Enable procurement and ledger station.</FormDescription></div>
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    </FormItem>
                )}/>
                 <FormField control={form.control} name="chat_enabled" render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-2xl border p-4 shadow-sm bg-secondary/10 border-white/5">
                        <div className="space-y-0.5"><FormLabel className="text-sm font-bold">Internal Comms</FormLabel><FormDescription className="text-[10px] uppercase font-medium">Allow encrypted staff messaging.</FormDescription></div>
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    </FormItem>
                )}/>
                <FormField control={form.control} name="attendance_strict" render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-2xl border p-4 shadow-sm bg-secondary/10 border-white/5">
                        <div className="space-y-0.5"><FormLabel className="text-sm font-bold">Geofence Enforcement</FormLabel><FormDescription className="text-[10px] uppercase font-medium">Verify physical location on clock-in.</FormDescription></div>
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    </FormItem>
                )}/>
                
                <div className="pt-6 space-y-4">
                    <h4 className="text-[9px] font-black uppercase tracking-[0.25em] text-primary">Automated Reporting Compliance</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="reporting_required" render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-2xl border p-4 shadow-sm bg-secondary/10 border-white/5">
                                <div className="space-y-0.5"><FormLabel className="text-sm font-bold">EOD Summaries</FormLabel><FormDescription className="text-[10px] uppercase font-medium">Require daily mission logs.</FormDescription></div>
                                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                            </FormItem>
                        )}/>
                        <FormField control={form.control} name="reporting_deadline" render={({ field }) => (
                            <FormItem className="p-4 rounded-2xl bg-secondary/10 border border-white/5">
                                <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-60 flex items-center gap-2"><Clock className="h-3 w-3" /> Submission Deadline</FormLabel>
                                <FormControl><Input placeholder="17:00" {...field} className="rounded-xl w-full h-10 mt-2 bg-background/50 border-white/5 font-mono" /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}/>
                    </div>
                </div>
            </CardContent>
        </Card>

        <Card className="apple-glass border-none shadow-xl overflow-hidden">
            <CardHeader className="bg-white/5 border-b border-white/5">
                <CardTitle>Site Telemetry (Coordinates)</CardTitle>
                <CardDescription>Define the office center point for geofencing.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="office_lat" render={({ field }) => (
                        <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-60">Latitude</FormLabel>
                        <FormControl><Input type="number" step="any" {...field} value={field.value ?? ''} className="rounded-xl h-12 bg-background/50 border-white/5 font-mono" /></FormControl>
                        <FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name="office_lng" render={({ field }) => (
                        <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-60">Longitude</FormLabel>
                        <FormControl><Input type="number" step="any" {...field} value={field.value ?? ''} className="rounded-xl h-12 bg-background/50 border-white/5 font-mono" /></FormControl>
                        <FormMessage /></FormItem>
                    )}/>
                </div>
                <Button type="button" variant="outline" onClick={handleGetCurrentLocation} disabled={isGettingLocation} className="w-full h-12 rounded-xl border-primary/20 text-primary hover:bg-primary/10">
                    {isGettingLocation ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <MapPin className="mr-2 h-4 w-4" />}
                    Capture Current Device Coordinates
                </Button>
            </CardContent>
        </Card>

        <div className="pt-8 sticky bottom-8 z-50">
            <Button type="submit" disabled={isSubmitting || isConfigLoading} className="w-full h-18 text-base font-black uppercase tracking-[0.3em] rounded-[2.5rem] shadow-2xl shadow-primary/40 active:scale-95 transition-all py-8">
                {isSubmitting ? <Loader2 className="mr-3 h-6 w-6 animate-spin" /> : null}
                Execute Global Deployment
            </Button>
        </div>
      </form>
    </Form>
  );
}