'use client';

import { UseFormReturn } from "react-hook-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin } from "lucide-react";

interface TelemetrySettingsProps {
    form: UseFormReturn<any>;
    isGettingLocation: boolean;
    onGetCurrentLocation: () => void;
}

export function TelemetrySettings({ form, isGettingLocation, onGetCurrentLocation }: TelemetrySettingsProps) {
    return (
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
                    )} />
                    <FormField control={form.control} name="office_lng" render={({ field }) => (
                        <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-60">Longitude</FormLabel>
                            <FormControl><Input type="number" step="any" {...field} value={field.value ?? ''} className="rounded-xl h-12 bg-background/50 border-white/5 font-mono" /></FormControl>
                            <FormMessage /></FormItem>
                    )} />
                </div>
                <Button type="button" variant="outline" onClick={onGetCurrentLocation} disabled={isGettingLocation} className="w-full h-12 rounded-xl border-primary/20 text-primary hover:bg-primary/10">
                    {isGettingLocation ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MapPin className="mr-2 h-4 w-4" />}
                    Capture Current Device Coordinates
                </Button>
            </CardContent>
        </Card>
    );
}