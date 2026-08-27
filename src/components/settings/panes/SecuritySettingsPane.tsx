"use client"

import React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { ShieldCheck, Fingerprint, Key, Globe, LogOut, Timer, ShieldAlert } from "lucide-react"

export function SecuritySettingsPane() {
  return (
    <div className="flex flex-col gap-8 max-w-4xl animate-in fade-in slide-in-from-bottom-2 duration-700">
      <div className="border-b border-white/5 pb-6">
        <h1 className="text-3xl font-black font-headline uppercase tracking-tighter text-white">Access & Security</h1>
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60 mt-1">Infrastructure vault and authentication protocols.</p>
      </div>

      {/* MULTI-FACTOR AUTH */}
      <Card className="apple-glass border-white/5 shadow-xl overflow-hidden rounded-[2.5rem]">
        <CardHeader className="bg-white/5 p-8 border-b border-white/5 flex flex-row items-center justify-between">
          <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                  <Fingerprint className="w-6 h-6" />
              </div>
              <div>
                <CardTitle className="text-sm font-black uppercase tracking-widest text-white">Two-Factor Authentication (2FA)</CardTitle>
                <CardDescription className="text-[10px] uppercase font-bold opacity-50">Enforce secondary identity verification via Authenticator App</CardDescription>
              </div>
          </div>
          <Switch className="data-[state=checked]:bg-primary" />
        </CardHeader>
        <CardContent className="p-8 space-y-4">
            <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex gap-4 items-start">
                <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                    <p className="text-xs font-black uppercase tracking-tight text-amber-500">Security Recommendation</p>
                    <p className="text-[10px] font-medium text-muted-foreground leading-relaxed mt-1">Enabling 2FA for all Administrative roles is highly recommended to protect sensitive personnel data.</p>
                </div>
            </div>
        </CardContent>
      </Card>

      {/* PASSWORD POLICIES */}
      <Card className="apple-glass border-white/5 shadow-xl overflow-hidden rounded-[2.5rem]">
        <CardHeader className="bg-white/5 p-8 border-b border-white/5 flex flex-row items-center gap-4">
            <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-400">
                <Key className="w-6 h-6" />
            </div>
            <div>
                <CardTitle className="text-sm font-black uppercase tracking-widest text-white">Authentication Policies</CardTitle>
                <CardDescription className="text-[10px] uppercase font-bold opacity-50">Credential rotation and complexity rules</CardDescription>
            </div>
        </CardHeader>
        <CardContent className="p-8 space-y-6">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-black/20 border border-white/5">
                <div>
                    <p className="text-xs font-black text-white uppercase">Force Password Rotation</p>
                    <p className="text-[9px] font-bold text-muted-foreground uppercase opacity-60">Require password reset every 90 days</p>
                </div>
                <Switch />
            </div>
            <div className="flex items-center justify-between p-4 rounded-2xl bg-black/20 border border-white/5">
                <div>
                    <p className="text-xs font-black text-white uppercase">Minimum Length</p>
                    <p className="text-[9px] font-bold text-muted-foreground uppercase opacity-60">Standard complexity: 12 characters</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-xs font-black text-primary">12</span>
                    <Button variant="ghost" size="sm" className="text-[8px] font-black uppercase border border-white/10 h-7 rounded-lg">Modify</Button>
                </div>
            </div>
        </CardContent>
      </Card>

      {/* SESSION MANAGEMENT */}
      <Card className="apple-glass border-white/5 shadow-xl overflow-hidden rounded-[2.5rem]">
        <CardHeader className="bg-white/5 p-8 border-b border-white/5 flex flex-row items-center gap-4">
            <div className="p-3 bg-rose-500/10 rounded-2xl text-rose-400">
                <Timer className="w-6 h-6" />
            </div>
            <div>
                <CardTitle className="text-sm font-black uppercase tracking-widest text-white">Session Control</CardTitle>
                <CardDescription className="text-[10px] uppercase font-bold opacity-50">Idle timeouts and concurrent session limits</CardDescription>
            </div>
        </CardHeader>
        <CardContent className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase opacity-40 ml-1">Idle Logout Timeout</Label>
                    <Input className="bg-black/20 border-white/5 rounded-xl h-12 font-bold uppercase tracking-tight" defaultValue="30 Minutes" />
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase opacity-40 ml-1">Device Limit</Label>
                    <Input className="bg-black/20 border-white/5 rounded-xl h-12 font-bold uppercase tracking-tight" defaultValue="2 Active Nodes" />
                </div>
            </div>
            <div className="flex items-center justify-between p-4 rounded-2xl border border-rose-500/20 bg-rose-500/5">
                <div className="flex items-center gap-4">
                    <LogOut className="w-5 h-5 text-rose-500" />
                    <span className="text-xs font-black uppercase tracking-tight text-white">Force Global Logout</span>
                </div>
                <Button variant="destructive" className="h-9 px-6 rounded-xl font-black uppercase text-[9px] tracking-widest bg-rose-600 shadow-lg shadow-rose-500/20">Purge Sessions</Button>
            </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4 pt-6 border-t border-white/5 mt-4">
        <Button variant="ghost" className="font-black uppercase text-[10px] tracking-widest opacity-40 hover:opacity-100 transition-opacity">Discard Changes</Button>
        <Button className="h-12 px-8 rounded-xl bg-primary text-white font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-primary/20">
            <ShieldCheck className="w-4 h-4 mr-2" /> Encrypt & Deploy Rules
        </Button>
      </div>
    </div>
  )
}
