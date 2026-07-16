'use client';

import { UseFormReturn } from "react-hook-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Palette } from "lucide-react";

interface BrandingSettingsProps {
    form: UseFormReturn<any>;
}

export function BrandingSettings({ form }: BrandingSettingsProps) {
    return (
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
                                    <Input type="color" value={field.value || '#cab348'} onChange={field.onChange} className="w-12 h-10 p-0 border-none bg-transparent cursor-pointer shrink-0" />
                                </div>
                            </FormControl>
                            <FormDescription className="text-[9px] uppercase tracking-tighter opacity-50">Controls buttons, gauges, and active states.</FormDescription>
                            <FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="accent_color" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-60">Accent Highlight</FormLabel>
                            <FormControl>
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full border border-white/10 shadow-inner shrink-0" style={{ backgroundColor: field.value }} />
                                    <Input {...field} placeholder="#0d1e30" className="rounded-xl font-mono bg-background/50 border-white/5" />
                                    <Input type="color" value={field.value || '#0d1e30'} onChange={field.onChange} className="w-12 h-10 p-0 border-none bg-transparent cursor-pointer shrink-0" />
                                </div>
                            </FormControl>
                            <FormDescription className="text-[9px] uppercase tracking-tighter opacity-50">Controls secondary visual accents.</FormDescription>
                            <FormMessage /></FormItem>
                    )} />
                </div>
                <FormField control={form.control} name="currency_symbol" render={({ field }) => (
                    <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-60">Fiscal Symbol</FormLabel>
                        <FormControl><Input {...field} placeholder="$" className="w-24 rounded-xl text-center font-black text-lg bg-background/50 border-white/5 h-12" /></FormControl>
                        <FormDescription className="text-[9px] uppercase tracking-tighter opacity-50">Prefix for all financial data nodes.</FormDescription>
                        <FormMessage /></FormItem>
                )} />
            </CardContent>
        </Card>
    );
}