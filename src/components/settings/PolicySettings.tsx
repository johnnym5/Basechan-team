'use client';

import { UseFormReturn } from "react-hook-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Clock } from "lucide-react";

interface PolicySettingsProps {
    form: UseFormReturn<any>;
}

export function PolicySettings({ form }: PolicySettingsProps) {
    return (
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
                )} />
                <FormField control={form.control} name="chat_enabled" render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-2xl border p-4 shadow-sm bg-secondary/10 border-white/5">
                        <div className="space-y-0.5"><FormLabel className="text-sm font-bold">Internal Comms</FormLabel><FormDescription className="text-[10px] uppercase font-medium">Allow encrypted staff messaging.</FormDescription></div>
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    </FormItem>
                )} />
                <FormField control={form.control} name="attendance_strict" render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-2xl border p-4 shadow-sm bg-secondary/10 border-white/5">
                        <div className="space-y-0.5"><FormLabel className="text-sm font-bold">Geofence Enforcement</FormLabel><FormDescription className="text-[10px] uppercase font-medium">Verify physical location on clock-in.</FormDescription></div>
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    </FormItem>
                )} />

                <div className="pt-6 space-y-4">
                    <h4 className="text-[9px] font-black uppercase tracking-[0.25em] text-primary">Automated Reporting Compliance</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="reporting_required" render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-2xl border p-4 shadow-sm bg-secondary/10 border-white/5">
                                <div className="space-y-0.5"><FormLabel className="text-sm font-bold">EOD Summaries</FormLabel><FormDescription className="text-[10px] uppercase font-medium">Require daily mission logs.</FormDescription></div>
                                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="reporting_deadline" render={({ field }) => (
                            <FormItem className="p-4 rounded-2xl bg-secondary/10 border border-white/5">
                                <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-60 flex items-center gap-2"><Clock className="h-3 w-3" /> Submission Deadline</FormLabel>
                                <FormControl><Input placeholder="17:00" {...field} className="rounded-xl w-full h-10 mt-2 bg-background/50 border-white/5 font-mono" /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}