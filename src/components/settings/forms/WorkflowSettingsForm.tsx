'use client';

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { WorkflowSettingsSchema, type WorkflowSettings } from "@/lib/settings-schemas";
import { useOrganizationSettings } from "@/hooks/settings/useOrganizationSettings";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Save, GitBranch, UserPlus, TrendingUp, ShieldCheck } from "lucide-react";
import { useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import type { UserProfile } from "@/lib/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export function WorkflowSettingsForm({ orgId }: { orgId: string | undefined }) {
  const { settings, updateSettings, isUpdating, isLoading } = useOrganizationSettings(orgId);
  const firestore = useFirestore();

  const usersQuery = useMemoFirebase(() =>
    firestore && orgId ? query(collection(firestore, 'users'), where('orgId', '==', orgId)) : null
  , [firestore, orgId]);
  const { data: orgUsers } = useCollection<UserProfile>(usersQuery);

  const form = useForm<WorkflowSettings>({
    resolver: zodResolver(WorkflowSettingsSchema),
    defaultValues: {
      approvalThresholds: {
        md_approval: 50000,
        finance_approval: 10000,
      },
      delegateId: "",
    },
  });

  useEffect(() => {
    if (settings?.workflows) {
      form.reset(settings.workflows);
    }
  }, [settings, form]);

  function onSubmit(values: WorkflowSettings) {
    updateSettings({ workflows: values });
  }

  if (isLoading) return <Skeleton className="h-96 w-full rounded-[2.5rem]" />;

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4 mb-2">
        <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-500">
          <GitBranch className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-2xl font-black font-headline tracking-tighter uppercase">Process Logic</h2>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest opacity-60">Governance Thresholds & Fallback Protocols</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card className="m3-surface-low border-none rounded-[2.5rem] shadow-xl overflow-hidden">
            <CardHeader className="bg-indigo-500/5 border-b border-indigo-500/10 p-8">
              <CardTitle className="text-lg flex items-center gap-2 font-black uppercase tracking-tight text-indigo-500">
                <TrendingUp className="h-4 w-4" /> Approval Hierarchies
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <FormField
                  control={form.control}
                  name="approvalThresholds.md_approval"
                  render={({ field }) => (
                    <FormItem className="space-y-4">
                      <div className="flex justify-between items-center">
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-50">Managing Director Override Tier</FormLabel>
                        <Badge className="bg-primary/20 text-primary border-none text-[8px] font-black">{field.value?.toLocaleString()} threshold</Badge>
                      </div>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-black text-sm">$</span>
                          <Input
                            type="number"
                            className="h-14 pl-10 rounded-2xl bg-background/50 border-white/5 font-bold font-mono"
                            {...field}
                            onChange={e => field.onChange(parseFloat(e.target.value))}
                          />
                        </div>
                      </FormControl>
                      <FormDescription className="text-[9px] font-bold opacity-30 uppercase tracking-tighter italic">Requisitions exceeding this value trigger mandatory MD review.</FormDescription>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="approvalThresholds.finance_approval"
                  render={({ field }) => (
                    <FormItem className="space-y-4">
                      <div className="flex justify-between items-center">
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-50">Finance Hub Approval Tier</FormLabel>
                        <Badge className="bg-primary/20 text-primary border-none text-[8px] font-black">{field.value?.toLocaleString()} threshold</Badge>
                      </div>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-black text-sm">$</span>
                          <Input
                            type="number"
                            className="h-14 pl-10 rounded-2xl bg-background/50 border-white/5 font-bold font-mono"
                            {...field}
                            onChange={e => field.onChange(parseFloat(e.target.value))}
                          />
                        </div>
                      </FormControl>
                      <FormDescription className="text-[9px] font-bold opacity-30 uppercase tracking-tighter italic">Baseline clearance required for finance disbursement.</FormDescription>
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="m3-surface-low border-none rounded-[2.5rem] shadow-xl overflow-hidden">
            <CardHeader className="bg-amber-500/5 border-b border-amber-500/10 p-8">
              <CardTitle className="text-lg flex items-center gap-2 font-black uppercase tracking-tight text-amber-500">
                <ShieldCheck className="h-4 w-4" /> Continuity & Delegation
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
                <FormField
                  control={form.control}
                  name="delegateId"
                  render={({ field }) => (
                    <FormItem className="max-w-md">
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-50 flex items-center gap-1.5">
                        <UserPlus className="h-3 w-3" /> Global Fallback Delegate
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-14 rounded-2xl bg-background/50 border-white/5 font-bold">
                            <SelectValue placeholder="Identify fallback personnel..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="m3-surface-high border-none rounded-2xl">
                          <SelectItem value="none" className="font-bold opacity-40">DEACTIVATE DELEGATION</SelectItem>
                          {orgUsers?.map(user => (
                            <SelectItem key={user.id} value={user.id} className="font-bold">{user.fullName}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription className="text-[8px] opacity-40 uppercase font-bold tracking-tighter leading-relaxed pt-2">
                        Automatic routing node for approval tokens when primary officers are "Out-of-Office".
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </CardContent>
          </Card>

          <div className="flex justify-end pr-2">
            <Button
                type="submit"
                disabled={isUpdating || !form.formState.isDirty}
                className="h-16 px-10 rounded-[2rem] font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-primary/30 m3-interactive"
            >
              {isUpdating ? <Loader2 className="mr-3 h-5 w-5 animate-spin" /> : <Save className="mr-3 h-5 w-5" />}
              Reconfigure Process Logic
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
