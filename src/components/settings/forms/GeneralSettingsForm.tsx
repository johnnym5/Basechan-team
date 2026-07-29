'use client';

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { GeneralSettingsSchema, type GeneralSettings } from "@/lib/settings-schemas";
import { useOrganizationSettings } from "@/hooks/settings/useOrganizationSettings";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save, Building2, Globe, Clock, Landmark } from "lucide-react";
import { useEffect } from "react";

export function GeneralSettingsForm({ orgId }: { orgId: string | undefined }) {
  const { settings, updateSettings, isUpdating, isLoading } = useOrganizationSettings(orgId);

  const form = useForm<GeneralSettings>({
    resolver: zodResolver(GeneralSettingsSchema),
    defaultValues: {
      legalName: "",
      taxId: "",
      timezone: "UTC",
      currency: "USD",
      dateFormat: "MM/DD/YYYY",
    },
  });

  useEffect(() => {
    if (settings?.general) {
      form.reset(settings.general);
    }
  }, [settings, form]);

  function onSubmit(values: GeneralSettings) {
    updateSettings({ general: values });
  }

  if (isLoading) return <Skeleton className="h-96 w-full rounded-[2.5rem]" />;

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4 mb-2">
        <div className="p-3 rounded-2xl bg-primary/10 text-primary">
          <Building2 className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-2xl font-black font-headline tracking-tighter uppercase">Company Identity</h2>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest opacity-60">Core organizational identifiers</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card className="m3-surface-low border-none rounded-[2.5rem] shadow-xl overflow-hidden">
            <CardHeader className="bg-white/5 border-b border-white/5 p-8">
              <CardTitle className="text-lg flex items-center gap-2 font-black uppercase tracking-tight">
                <Globe className="h-4 w-4 text-primary" /> Global Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <FormField
                  control={form.control}
                  name="legalName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-50">Legal Entity Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter company name" className="h-14 rounded-2xl bg-background/50 border-white/5 font-bold" {...field} />
                      </FormControl>
                      <FormMessage className="text-[10px] font-bold italic" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="taxId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-50">Tax / Business ID</FormLabel>
                      <FormControl>
                        <Input placeholder="TIN-000-000" className="h-14 rounded-2xl bg-background/50 border-white/5 font-bold" {...field} />
                      </FormControl>
                      <FormMessage className="text-[10px] font-bold italic" />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <FormField
                  control={form.control}
                  name="timezone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-50 flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Default Timezone
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-14 rounded-2xl bg-background/50 border-white/5 font-bold">
                            <SelectValue placeholder="Select timezone" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="m3-surface-high border-none rounded-2xl">
                          <SelectItem value="UTC" className="font-bold">UTC (Universal)</SelectItem>
                          <SelectItem value="Africa/Lagos" className="font-bold">WAT (Lagos)</SelectItem>
                          <SelectItem value="America/New_York" className="font-bold">EST (New York)</SelectItem>
                          <SelectItem value="Europe/London" className="font-bold">GMT (London)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-50 flex items-center gap-1">
                        <Landmark className="h-3 w-3" /> Fiscal Currency
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-14 rounded-2xl bg-background/50 border-white/5 font-bold">
                            <SelectValue placeholder="Select currency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="m3-surface-high border-none rounded-2xl">
                          <SelectItem value="USD" className="font-bold">USD ($)</SelectItem>
                          <SelectItem value="NGN" className="font-bold">NGN (₦)</SelectItem>
                          <SelectItem value="GBP" className="font-bold">GBP (£)</SelectItem>
                          <SelectItem value="EUR" className="font-bold">EUR (€)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dateFormat"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-50">Date Convention</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-14 rounded-2xl bg-background/50 border-white/5 font-bold">
                            <SelectValue placeholder="Select format" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="m3-surface-high border-none rounded-2xl">
                          <SelectItem value="MM/DD/YYYY" className="font-bold">MM/DD/YYYY (US)</SelectItem>
                          <SelectItem value="DD/MM/YYYY" className="font-bold">DD/MM/YYYY (UK)</SelectItem>
                          <SelectItem value="YYYY-MM-DD" className="font-bold">YYYY-MM-DD (ISO)</SelectItem>
                        </SelectContent>
                      </Select>
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
              Synchronize Infrastructure
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

import { Skeleton } from "@/components/ui/skeleton";
