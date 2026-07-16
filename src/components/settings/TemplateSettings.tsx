'use client';

import { UseFormReturn } from "react-hook-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FileText } from "lucide-react";

interface TemplateSettingsProps {
    form: UseFormReturn<any>;
}

export function TemplateSettings({ form }: TemplateSettingsProps) {
    return (
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
                    )} />
                    <FormField control={form.control} name="template_address" render={({ field }) => (
                        <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-60">Address Node</FormLabel><FormControl><Input placeholder="123 Corporate Blvd..." {...field} className="rounded-xl bg-background/50 border-white/5" /></FormControl><FormMessage /></FormItem>
                    )} />
                </div>
                <FormField control={form.control} name="template_terms" render={({ field }) => (
                    <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-60">Legal Meta / Terms</FormLabel><FormControl><Textarea placeholder="Terms and conditions..." {...field} className="rounded-2xl bg-background/50 border-white/5 min-h-[80px]" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="template_footer" render={({ field }) => (
                    <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-60">Footer Sign-off</FormLabel><FormControl><Input placeholder="e.g., Authorized Signature" {...field} className="rounded-xl bg-background/50 border-white/5" /></FormControl><FormMessage /></FormItem>
                )} />
            </CardContent>
        </Card>
    );
}