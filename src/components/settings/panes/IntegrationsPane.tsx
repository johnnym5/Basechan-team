"use client"

import React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Link2, Mail, MessageSquare, Globe, Plus, Settings2, ShieldCheck } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export function IntegrationsPane() {
  return (
    <div className="flex flex-col gap-8 max-w-4xl animate-in fade-in slide-in-from-bottom-2 duration-700">
      <div className="border-b border-white/5 pb-6">
        <h1 className="text-3xl font-black font-headline uppercase tracking-tighter text-white">Integrations & Comm</h1>
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60 mt-1">Connect third-party infrastructure and communication nodes.</p>
      </div>

      {/* EMAIL & SMTP */}
      <Card className="apple-glass border-white/5 shadow-xl overflow-hidden rounded-[2.5rem]">
        <CardHeader className="bg-white/5 p-8 border-b border-white/5 flex flex-row items-center justify-between">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-400">
                    <Mail className="w-6 h-6" />
                </div>
                <div>
                    <CardTitle className="text-sm font-black uppercase tracking-widest text-white">Email Infrastructure (SMTP)</CardTitle>
                    <CardDescription className="text-[10px] uppercase font-bold opacity-50">Connect Microsoft 365, Google, or SendGrid</CardDescription>
                </div>
            </div>
            <Badge className="bg-emerald-500/20 text-emerald-500 border-none text-[8px] font-black uppercase">Connected</Badge>
        </CardHeader>
        <CardContent className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase opacity-40 ml-1">SMTP Host</Label>
                    <Input className="bg-black/20 border-white/5 rounded-xl h-12 font-bold text-white" defaultValue="smtp.sendgrid.net" />
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase opacity-40 ml-1">Port</Label>
                    <Input className="bg-black/20 border-white/5 rounded-xl h-12 font-bold text-white" defaultValue="587" />
                </div>
            </div>
            <Button variant="outline" className="w-full h-12 rounded-xl border-white/10 font-black uppercase text-[10px] tracking-widest">Test Connection</Button>
        </CardContent>
      </Card>

      {/* WEBHOOKS & MESSAGING */}
      <Card className="apple-glass border-white/5 shadow-xl overflow-hidden rounded-[2.5rem]">
        <CardHeader className="bg-white/5 p-8 border-b border-white/5 flex flex-row items-center gap-4">
            <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-400">
                <MessageSquare className="w-6 h-6" />
            </div>
            <div>
                <CardTitle className="text-sm font-black uppercase tracking-widest text-white">External Webhooks</CardTitle>
                <CardDescription className="text-[10px] uppercase font-bold opacity-50">Push critical alerts to Slack or MS Teams</CardDescription>
            </div>
        </CardHeader>
        <CardContent className="p-8 space-y-4">
            <div className="p-5 rounded-2xl bg-black/20 border border-white/5 flex items-center justify-between group hover:bg-white/5 transition-all">
                <div className="flex items-center gap-4">
                    <div className="p-2 bg-white/5 rounded-xl">
                        <Link2 className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div>
                        <p className="text-xs font-black text-white uppercase">Critical Alerts Hook</p>
                        <p className="text-[9px] font-bold text-muted-foreground uppercase opacity-40 truncate max-w-[200px]">https://hooks.slack.com/services/...</p>
                    </div>
                </div>
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg"><Settings2 className="w-4 h-4" /></Button>
            </div>
            <Button variant="secondary" className="w-full h-12 rounded-xl bg-secondary/30 font-black uppercase text-[9px] tracking-widest border-dashed border-2 border-white/10">
                <Plus className="w-4 h-4 mr-2" /> Add Webhook Target
            </Button>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4 pt-6 border-t border-white/5 mt-4">
        <Button variant="ghost" className="font-black uppercase text-[10px] tracking-widest opacity-40 hover:opacity-100 transition-opacity">Discard Changes</Button>
        <Button className="h-12 px-8 rounded-xl bg-primary text-white font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-primary/20">
            <ShieldCheck className="w-4 h-4 mr-2" /> Initialize Sync Nodes
        </Button>
      </div>
    </div>
  )
}
