"use client"

import React, { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { MapPin, Plus, Laptop, Boxes, Map, Clock, Calendar, ShieldCheck, Target, Loader2 } from "lucide-react"
import { useSystemConfig } from "@/hooks/useSystemConfig"
import { useFirestore, updateDocumentNonBlocking } from "@/firebase"
import { doc } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form"
import type { UserProfile, BranchLocation } from "@/lib/types"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Trash } from "lucide-react"

const formSchema = z.object({
    attendance_strict: z.boolean(),
    reporting_required: z.boolean(),
    reporting_deadline: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:mm)"),
});

type FormData = z.infer<typeof formSchema>;

interface OperationsSettingsPaneProps {
    userProfile: UserProfile;
}

export function OperationsSettingsPane({ userProfile }: OperationsSettingsPaneProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { config, isLoading: isConfigLoading } = useSystemConfig(userProfile.orgId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [branches, setBranches] = useState<BranchLocation[]>([]);
  const [branchDialogOpen, setBranchDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'ADD' | 'EDIT'>('ADD');
  const [currentBranch, setCurrentBranch] = useState<Partial<BranchLocation> | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        attendance_strict: false,
        reporting_required: true,
        reporting_deadline: "17:00",
    }
  });

  React.useEffect(() => {
    if (config) {
        form.reset({
            attendance_strict: config.attendance_strict || false,
            reporting_required: config.reporting_schedule?.required ?? true,
            reporting_deadline: config.reporting_schedule?.deadline || "17:00",
        });
        setBranches(config.branches || []);
    }
  }, [config, form]);

  const handleSave = async (values: FormData) => {
    if (!firestore || !config) return;
    setIsSubmitting(true);
    try {
        const configRef = doc(firestore, 'system_configs', config.id);
        await updateDocumentNonBlocking(configRef, {
            attendance_strict: values.attendance_strict,
            reporting_schedule: {
                required: values.reporting_required,
                deadline: values.reporting_deadline
            },
            branches: branches
        });
        toast({ title: "Policies Synchronized", description: "Operational parameters have been deployed." });
    } catch (e: any) {
        toast({ variant: "destructive", description: e.message });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleAddBranch = () => {
    setDialogMode('ADD');
    setCurrentBranch({
        id: Math.random().toString(36).substr(2, 9),
        name: '',
        lat: 0,
        lng: 0,
        radius: 100
    });
    setBranchDialogOpen(true);
  };

  const handleEditBranch = (branch: BranchLocation) => {
    setDialogMode('EDIT');
    setCurrentBranch(branch);
    setBranchDialogOpen(true);
  };

  const handleSaveBranch = () => {
    if (!currentBranch?.name || currentBranch?.lat === undefined || currentBranch?.lng === undefined) {
        toast({ variant: "destructive", title: "Incomplete Data", description: "Please provide name and coordinates." });
        return;
    }

    setBranches(prev => {
        const exists = prev.find(b => b.id === currentBranch.id);
        if (exists) {
            return prev.map(b => b.id === currentBranch.id ? currentBranch as BranchLocation : b);
        }
        return [...prev, currentBranch as BranchLocation];
    });
    setBranchDialogOpen(false);
  };

  const handleDeleteBranch = (id: string) => {
    setBranches(prev => prev.filter(b => b.id !== id));
  };

  if (isConfigLoading) {
      return <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary opacity-20" /></div>
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSave)} className="flex flex-col gap-8 max-w-4xl animate-in fade-in slide-in-from-bottom-2 duration-700">
        <div className="border-b border-white/5 pb-6">
            <h1 className="text-3xl font-black font-headline uppercase tracking-tighter text-white">Operations & Logistics</h1>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60 mt-1">Manage physical branches, geofencing, and attendance policies.</p>
        </div>

        {/* 1. TIME & ATTENDANCE POLICIES (Merged) */}
        <Card className="apple-glass border-white/5 shadow-xl overflow-hidden rounded-[2.5rem]">
            <CardHeader className="bg-white/5 p-8 border-b border-white/5">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-2xl text-primary"><Clock className="w-6 h-6" /></div>
                    <div>
                        <CardTitle className="text-sm font-black uppercase tracking-widest text-white">Time & Reporting Policies</CardTitle>
                        <CardDescription className="text-[10px] uppercase font-bold opacity-50">Global attendance and EOD submission rules</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                        control={form.control}
                        name="attendance_strict"
                        render={({ field }) => (
                            <FormItem className="flex items-center justify-between p-5 rounded-2xl bg-black/20 border border-white/5">
                                <div className="space-y-0.5">
                                    <FormLabel className="text-xs font-black uppercase text-white">Geofence Enforcement</FormLabel>
                                    <FormDescription className="text-[9px] font-bold text-muted-foreground uppercase opacity-60">Restrict clock-ins to office radius</FormDescription>
                                </div>
                                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="reporting_required"
                        render={({ field }) => (
                            <FormItem className="flex items-center justify-between p-5 rounded-2xl bg-black/20 border border-white/5">
                                <div className="space-y-0.5">
                                    <FormLabel className="text-xs font-black uppercase text-white">EOD Required</FormLabel>
                                    <FormDescription className="text-[9px] font-bold text-muted-foreground uppercase opacity-60">Mandatory daily report submission</FormDescription>
                                </div>
                                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                            </FormItem>
                        )}
                    />
                </div>

                <FormField
                    control={form.control}
                    name="reporting_deadline"
                    render={({ field }) => (
                        <FormItem className="p-6 rounded-2xl bg-secondary/10 border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <Target className="w-5 h-5 text-primary opacity-40" />
                                <div>
                                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-primary">Report Deadline</FormLabel>
                                    <FormDescription className="text-[9px] font-bold text-muted-foreground uppercase opacity-60">Daily cutoff for operational memos</FormDescription>
                                </div>
                            </div>
                            <FormControl><Input {...field} className="w-32 bg-black/20 border-white/5 rounded-xl h-11 text-center font-mono font-bold" /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </CardContent>
        </Card>

      {/* 2. LOCATION GEOFENCING (Facilities) */}
      <Card className="apple-glass border-white/5 shadow-xl overflow-hidden rounded-[2.5rem]">
        <CardHeader className="bg-white/5 p-8 border-b border-white/5 flex flex-row items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-400">
                <Map className="w-6 h-6" />
            </div>
            <div>
                <CardTitle className="text-sm font-black uppercase tracking-widest text-white">Physical Branches</CardTitle>
                <CardDescription className="text-[10px] uppercase font-bold opacity-50">Authorized operational zones</CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="h-9 px-4 rounded-xl border border-white/10 text-[9px] font-black uppercase tracking-widest">Map Overview</Button>
        </CardHeader>
        <CardContent className="p-8 space-y-6">
          <div className="grid grid-cols-1 gap-4">
              {branches.length === 0 ? (
                  <div className="py-12 text-center opacity-30 italic text-[10px] font-black uppercase tracking-widest bg-black/10 rounded-3xl border border-dashed border-white/10">
                      No branch locations defined.
                  </div>
              ) : branches.map(branch => (
                  <div key={branch.id} className="flex items-center justify-between p-6 rounded-3xl bg-black/20 border border-white/5 group hover:border-primary/30 transition-all shadow-inner">
                    <div className="flex items-center gap-5">
                      <div className="p-3 bg-primary/10 rounded-2xl group-hover:scale-110 transition-transform">
                          <MapPin className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-white uppercase tracking-tight">{branch.name}</p>
                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest opacity-60 mt-0.5">
                            Lat: {branch.lat}, Lng: {branch.lng} • Radius: {branch.radius}m
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEditBranch(branch)} className="text-[9px] font-black uppercase tracking-widest text-primary hover:bg-primary/10">Configure</Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteBranch(branch.id)} className="h-8 w-8 text-rose-500 hover:bg-rose-500/10">
                            <Trash className="w-4 h-4" />
                        </Button>
                    </div>
                  </div>
              ))}
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={handleAddBranch}
            className="w-full h-14 rounded-2xl border-white/5 bg-secondary/30 font-black uppercase text-[10px] tracking-[0.2em] hover:bg-secondary/50 transition-all border-dashed border-2"
          >
              <Plus className="w-4 h-4 mr-3" /> Add Branch Location
          </Button>
        </CardContent>
      </Card>

      {/* BRANCH DIALOG */}
      <Dialog open={branchDialogOpen} onOpenChange={setBranchDialogOpen}>
        <DialogContent className="apple-glass-darker border-none rounded-[2rem] p-8 max-w-md">
            <DialogHeader className="mb-6">
                <DialogTitle className="text-2xl font-black font-headline tracking-tighter uppercase text-white">
                    {dialogMode === 'ADD' ? 'Define Branch' : 'Update Location'}
                </DialogTitle>
                <DialogDescription className="text-[10px] font-black uppercase tracking-widest opacity-60">Configure physical branch parameters.</DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase opacity-40 px-1">Branch Name</Label>
                    <Input
                        value={currentBranch?.name || ''}
                        onChange={(e) => setCurrentBranch({...currentBranch, name: e.target.value})}
                        className="bg-black/20 border-white/5 rounded-xl h-12 font-bold uppercase tracking-tight"
                        placeholder="e.g. Abuja HQ"
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase opacity-40 px-1">Latitude</Label>
                        <Input
                            type="number"
                            step="any"
                        value={currentBranch?.lat ?? ''}
                        onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setCurrentBranch({...currentBranch, lat: isNaN(val) ? 0 : val});
                        }}
                            className="bg-black/20 border-white/5 rounded-xl h-12 font-mono"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase opacity-40 px-1">Longitude</Label>
                        <Input
                            type="number"
                            step="any"
                            value={currentBranch?.lng ?? ''}
                            onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                setCurrentBranch({...currentBranch, lng: isNaN(val) ? 0 : val});
                            }}
                            className="bg-black/20 border-white/5 rounded-xl h-12 font-mono"
                        />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase opacity-40 px-1">Radius (Meters)</Label>
                    <Input
                        type="number"
                        value={currentBranch?.radius ?? 100}
                        onChange={(e) => {
                            const val = parseInt(e.target.value);
                            setCurrentBranch({...currentBranch, radius: isNaN(val) ? 100 : val});
                        }}
                        className="bg-black/20 border-white/5 rounded-xl h-12 font-bold"
                    />
                </div>
            </div>

            <DialogFooter className="mt-10 flex gap-3">
                <Button variant="ghost" onClick={() => setBranchDialogOpen(false)} className="rounded-xl font-black uppercase text-[10px] tracking-widest opacity-40 flex-1">Cancel</Button>
                <Button
                    onClick={handleSaveBranch}
                    className="h-12 px-8 rounded-xl bg-primary text-white font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20 flex-1"
                >
                    Confirm Location
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex justify-end gap-4 pt-6 border-t border-white/5 mt-4 pb-20">
        <Button variant="ghost" className="font-black uppercase text-[10px] tracking-widest opacity-40 hover:opacity-100 transition-opacity">Discard Changes</Button>
        <Button className="h-12 px-8 rounded-xl bg-primary text-white font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-primary/20">
            <ShieldCheck className="w-4 h-4 mr-2" /> Commit Operational Matrix
        </Button>
      </div>
      </form>
    </Form>
  )
}
