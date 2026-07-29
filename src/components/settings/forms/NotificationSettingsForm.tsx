'use client';

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { NotificationSettingsSchema, type NotificationSettings } from "@/lib/settings-schemas";
import { useOrganizationSettings } from "@/hooks/settings/useOrganizationSettings";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save, Bell, Mail, Monitor, Hash, MessageSquare } from "lucide-react";
import { useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export function NotificationSettingsForm({ orgId }: { orgId: string | undefined }) {
  const { settings, updateSettings, isUpdating, isLoading } = useOrganizationSettings(orgId);

  const form = useForm<NotificationSettings>({
    resolver: zodResolver(NotificationSettingsSchema),
    defaultValues: {
      enableEmailAlerts: true,
      enableInAppAlerts: true,
      slackWebhookUrl: "",
      teamsWebhookUrl: "",
    },
  });

  useEffect(() => {
    if (settings?.notifications) {
      form.reset(settings.notifications);
    }
  }, [settings, form]);

  function onSubmit(values: NotificationSettings) {
    updateSettings({ notifications: values });
  }

  if (isLoading) return <Skeleton className="h-96 w-full rounded-[2.5rem]" />;

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4 mb-2">
        <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-500">
          <Bell className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-2xl font-black font-headline tracking-tighter uppercase">Alert Topology</h2>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest opacity-60">System-wide Broadcast & Integration Pipes</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card className="m3-surface-low border-none rounded-[2.5rem] shadow-xl overflow-hidden">
            <CardHeader className="bg-blue-500/5 border-b border-blue-500/10 p-8">
              <CardTitle className="text-lg flex items-center gap-2 font-black uppercase tracking-tight text-blue-500">
                <Monitor className="h-4 w-4" /> Native Broadcasting
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="enableEmailAlerts"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-[1.5rem] bg-white/5 border border-white/5 p-6 hover:bg-white/10 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-xl bg-primary/10 text-primary"><Mail className="h-5 w-5" /></div>
                      <div className="space-y-0.5">
                        <FormLabel className="text-sm font-black uppercase tracking-tight">Email Dispatch</FormLabel>
                        <FormDescription className="text-[9px] font-bold opacity-40 uppercase tracking-tighter">SMTP System Alerts</FormDescription>
                      </div>
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

              <FormField
                control={form.control}
                name="enableInAppAlerts"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-[1.5rem] bg-white/5 border border-white/5 p-6 hover:bg-white/10 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-xl bg-primary/10 text-primary"><Bell className="h-5 w-5" /></div>
                      <div className="space-y-0.5">
                        <FormLabel className="text-sm font-black uppercase tracking-tight">Real-time HUD</FormLabel>
                        <FormDescription className="text-[9px] font-bold opacity-40 uppercase tracking-tighter">In-app socket notifications</FormDescription>
                      </div>
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
            </CardContent>
          </Card>

          <Card className="m3-surface-low border-none rounded-[2.5rem] shadow-xl overflow-hidden">
            <CardHeader className="bg-emerald-500/5 border-b border-emerald-500/10 p-8">
              <CardTitle className="text-lg flex items-center gap-2 font-black uppercase tracking-tight text-emerald-500">
                <Hash className="h-4 w-4" /> Secure Webhooks
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <FormField
                  control={form.control}
                  name="slackWebhookUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-50 flex items-center gap-1.5">
                        <MessageSquare className="h-3 w-3" /> Slack Integration Pipe
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="https://hooks.slack.com/services/..." className="h-12 rounded-xl bg-background/50 border-white/5 font-mono text-xs" {...field} />
                      </FormControl>
                      <FormDescription className="text-[8px] opacity-30 uppercase font-bold tracking-tighter">Post critical system triggers to a Slack channel.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="teamsWebhookUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-50 flex items-center gap-1.5">
                        <Monitor className="h-3 w-3" /> MS Teams Connector
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="https://outlook.office.com/webhook/..." className="h-12 rounded-xl bg-background/50 border-white/5 font-mono text-xs" {...field} />
                      </FormControl>
                      <FormDescription className="text-[8px] opacity-30 uppercase font-bold tracking-tighter">Enable adaptive cards for Teams workflows.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end pr-2">
            <Button
                type="submit"
                disabled={isUpdating || !form.formState.isDirty}
                className="h-16 px-10 rounded-[2rem] font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-primary/30 m3-interactive"
            >
              {isUpdating ? <Loader2 className="mr-3 h-5 w-5 animate-spin" /> : <Save className="mr-3 h-5 w-5" />}
              Update Alert Topology
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
