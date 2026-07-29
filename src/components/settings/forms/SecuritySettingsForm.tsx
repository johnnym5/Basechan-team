'use client';

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { SecuritySettingsSchema, type SecuritySettings } from "@/lib/settings-schemas";
import { useOrganizationSettings } from "@/hooks/settings/useOrganizationSettings";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save, ShieldCheck, Lock, Globe, KeyRound } from "lucide-react";
import { useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export function SecuritySettingsForm({ orgId }: { orgId: string | undefined }) {
  const { settings, updateSettings, isUpdating, isLoading } = useOrganizationSettings(orgId);

  const form = useForm<SecuritySettings>({
    resolver: zodResolver(SecuritySettingsSchema),
    defaultValues: {
      enforce2FA: false,
      sessionTimeout: 60,
      passwordExpiryDays: 90,
      whitelistedIPs: [],
    },
  });

  useEffect(() => {
    if (settings?.security) {
      form.reset(settings.security);
    }
  }, [settings, form]);

  function onSubmit(values: SecuritySettings) {
    updateSettings({ security: values });
  }

  if (isLoading) return <Skeleton className="h-96 w-full rounded-[2.5rem]" />;

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4 mb-2">
        <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-2xl font-black font-headline tracking-tighter uppercase">Security Posture</h2>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest opacity-60">Authentication & Infrastructure Guardrails</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="m3-surface-low border-none rounded-[2.5rem] shadow-xl overflow-hidden flex flex-col h-full">
              <CardHeader className="bg-amber-500/5 border-b border-amber-500/10 p-8">
                <CardTitle className="text-lg flex items-center gap-2 font-black uppercase tracking-tight text-amber-500">
                  <Lock className="h-4 w-4" /> Auth Protocols
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-8 flex-1">
                <FormField
                  control={form.control}
                  name="enforce2FA"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-[1.5rem] bg-white/5 border border-white/5 p-6 group hover:border-amber-500/20 transition-all">
                      <div className="space-y-1">
                        <FormLabel className="text-sm font-black uppercase tracking-tight">Enforce Multi-Factor</FormLabel>
                        <FormDescription className="text-[10px] font-bold opacity-40 uppercase tracking-tighter leading-relaxed">
                          Mandatory 2FA for all personnel nodes.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="space-y-6">
                    <FormField
                      control={form.control}
                      name="sessionTimeout"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex justify-between items-end mb-1">
                            <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-50">Session Persistence (Minutes)</FormLabel>
                            <Badge variant="secondary" className="h-5 text-[8px] font-black bg-amber-500/10 text-amber-600 border-none">{field.value} min</Badge>
                          </div>
                          <FormControl>
                            <Input
                                type="number"
                                className="h-12 rounded-2xl bg-background/50 border-white/5 font-bold font-mono"
                                {...field}
                                onChange={e => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="passwordExpiryDays"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex justify-between items-end mb-1">
                            <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-50">Credential Expiry (Days)</FormLabel>
                            <Badge variant="secondary" className="h-5 text-[8px] font-black bg-amber-500/10 text-amber-600 border-none">{field.value} days</Badge>
                          </div>
                          <FormControl>
                            <Input
                                type="number"
                                className="h-12 rounded-2xl bg-background/50 border-white/5 font-bold font-mono"
                                {...field}
                                onChange={e => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                          <FormDescription className="text-[8px] opacity-40 uppercase font-bold tracking-tighter italic">Set to 0 for infinite persistence (unsupported).</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                </div>
              </CardContent>
            </Card>

            <Card className="m3-surface-low border-none rounded-[2.5rem] shadow-xl overflow-hidden flex flex-col h-full">
              <CardHeader className="bg-primary/5 border-b border-primary/10 p-8">
                <CardTitle className="text-lg flex items-center gap-2 font-black uppercase tracking-tight text-primary">
                  <Globe className="h-4 w-4" /> Infrastructure Gating
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-6 flex-1">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-black uppercase tracking-widest opacity-50">Whitelisted IP Nodes</Label>
                    <KeyRound className="h-4 w-4 opacity-20" />
                  </div>
                  <div className="p-4 rounded-[1.5rem] bg-black/20 border border-white/5 min-h-[120px] space-y-2">
                    {form.watch('whitelistedIPs')?.length === 0 ? (
                      <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest text-center py-8 opacity-40">All traffic permitted (Global access)</p>
                    ) : (
                      form.watch('whitelistedIPs').map((ip, i) => (
                        <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5">
                          <span className="text-[10px] font-mono font-bold text-emerald-400">{ip}</span>
                          <Button variant="ghost" size="icon" className="h-5 w-5 rounded-md text-rose-500 opacity-40 hover:opacity-100" onClick={() => {
                            const ips = form.getValues('whitelistedIPs');
                            form.setValue('whitelistedIPs', ips.filter((_, idx) => idx !== i), { shouldDirty: true });
                          }}>
                            <Loader2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                  <Button variant="outline" type="button" className="w-full h-10 rounded-xl border-dashed border-white/10 hover:bg-primary/5 text-[9px] font-black uppercase tracking-widest" onClick={() => {
                    const ip = prompt('Enter IP Address (v4 or v6):');
                    if (ip) {
                      const current = form.getValues('whitelistedIPs') || [];
                      form.setValue('whitelistedIPs', [...current, ip], { shouldDirty: true });
                    }
                  }}>
                    Add Secure IP Node
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end pr-2">
            <Button
                type="submit"
                disabled={isUpdating || !form.formState.isDirty}
                className="h-16 px-10 rounded-[2rem] font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-primary/30 m3-interactive"
            >
              {isUpdating ? <Loader2 className="mr-3 h-5 w-5 animate-spin" /> : <Save className="mr-3 h-5 w-5" />}
              Commit Policy Change
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

import { Label } from "@/components/ui/label";
