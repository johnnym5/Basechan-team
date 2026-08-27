"use client"

import React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Building2, Globe, Palette, Upload, ShieldCheck } from "lucide-react"

export function GeneralSettingsPane() {
  return (
    <div className="flex flex-col gap-8 max-w-4xl animate-in fade-in slide-in-from-bottom-2 duration-700">
      <div className="border-b border-white/5 pb-6">
        <h1 className="text-3xl font-black font-headline uppercase tracking-tighter text-white">General & Branding</h1>
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60 mt-1">Configure your organizational profile and visual identity.</p>
      </div>

      {/* ORGANIZATIONAL PROFILE */}
      <Card className="apple-glass border-white/5 shadow-xl overflow-hidden rounded-[2.5rem]">
        <CardHeader className="bg-white/5 p-8 border-b border-white/5 flex flex-row items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                <Building2 className="w-6 h-6" />
            </div>
            <div>
                <CardTitle className="text-sm font-black uppercase tracking-widest text-white">Organization Profile</CardTitle>
                <CardDescription className="text-[10px] uppercase font-bold opacity-50">Legal and identification data</CardDescription>
            </div>
        </CardHeader>
        <CardContent className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase opacity-40 ml-1">Legal Company Name</Label>
                    <Input className="bg-black/20 border-white/5 rounded-xl h-12 font-bold uppercase tracking-tight" placeholder="e.g. Basechan Solutions LTD" />
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase opacity-40 ml-1">Tax Identification (TIN)</Label>
                    <Input className="bg-black/20 border-white/5 rounded-xl h-12 font-bold uppercase tracking-tight" placeholder="RC-XXXXXXXX" />
                </div>
            </div>
        </CardContent>
      </Card>

      {/* LOCALIZATION & DEFAULTS */}
      <Card className="apple-glass border-white/5 shadow-xl overflow-hidden rounded-[2.5rem]">
        <CardHeader className="bg-white/5 p-8 border-b border-white/5 flex flex-row items-center gap-4">
            <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-400">
                <Globe className="w-6 h-6" />
            </div>
            <div>
                <CardTitle className="text-sm font-black uppercase tracking-widest text-white">Localization</CardTitle>
                <CardDescription className="text-[10px] uppercase font-bold opacity-50">Regional settings and operational defaults</CardDescription>
            </div>
        </CardHeader>
        <CardContent className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase opacity-40 ml-1">Primary Timezone</Label>
                    <Select defaultValue="WAT">
                        <SelectTrigger className="h-12 rounded-xl bg-black/20 border-white/5 text-xs font-bold uppercase tracking-tight">
                            <SelectValue placeholder="Select Timezone" />
                        </SelectTrigger>
                        <SelectContent className="apple-glass-darker border-white/10 rounded-2xl">
                            <SelectItem value="WAT" className="text-xs font-bold uppercase p-3">Lagos / West Africa (GMT+1)</SelectItem>
                            <SelectItem value="GMT" className="text-xs font-bold uppercase p-3">London / Greenwich (GMT+0)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase opacity-40 ml-1">Base Currency</Label>
                    <Select defaultValue="NGN">
                        <SelectTrigger className="h-12 rounded-xl bg-black/20 border-white/5 text-xs font-bold uppercase tracking-tight">
                            <SelectValue placeholder="Select Currency" />
                        </SelectTrigger>
                        <SelectContent className="apple-glass-darker border-white/10 rounded-2xl">
                            <SelectItem value="NGN" className="text-xs font-bold uppercase p-3">Nigerian Naira (₦)</SelectItem>
                            <SelectItem value="USD" className="text-xs font-bold uppercase p-3">US Dollar ($)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </CardContent>
      </Card>

      {/* THEME & BRANDING */}
      <Card className="apple-glass border-white/5 shadow-xl overflow-hidden rounded-[2.5rem]">
        <CardHeader className="bg-white/5 p-8 border-b border-white/5 flex flex-row items-center gap-4">
            <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-400">
                <Palette className="w-6 h-6" />
            </div>
            <div>
                <CardTitle className="text-sm font-black uppercase tracking-widest text-white">Visual Identity</CardTitle>
                <CardDescription className="text-[10px] uppercase font-bold opacity-50">White-labeling and interface themes</CardDescription>
            </div>
        </CardHeader>
        <CardContent className="p-8 space-y-8">
            <div className="flex flex-col md:flex-row gap-8">
                <div className="flex-1 space-y-4">
                    <Label className="text-[10px] font-black uppercase opacity-40 ml-1">Company Logo (Master)</Label>
                    <div className="h-32 border-2 border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center bg-black/20 group hover:border-primary/50 transition-all cursor-pointer">
                        <Upload className="w-6 h-6 text-muted-foreground group-hover:text-primary mb-2 transition-colors" />
                        <span className="text-[9px] font-black uppercase tracking-widest opacity-40">Upload PNG/SVG</span>
                    </div>
                </div>
                <div className="flex-1 space-y-6">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase opacity-40 ml-1">Brand Primary Color</Label>
                        <div className="flex gap-3">
                            <div className="w-12 h-12 rounded-xl bg-primary shadow-lg" />
                            <Input className="bg-black/20 border-white/5 rounded-xl h-12 font-mono text-xs" defaultValue="#22c55e" />
                        </div>
                    </div>
                </div>
            </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4 pt-6 border-t border-white/5 mt-4">
        <Button variant="ghost" className="font-black uppercase text-[10px] tracking-widest opacity-40 hover:opacity-100 transition-opacity">Discard Changes</Button>
        <Button className="h-12 px-8 rounded-xl bg-primary text-white font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-primary/20">
            <ShieldCheck className="w-4 h-4 mr-2" /> Commit Profile Sync
        </Button>
      </div>
    </div>
  )
}
