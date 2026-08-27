"use client"

import React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileWarning, History, Download, ShieldCheck, Database, Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export function CompliancePane() {
  return (
    <div className="flex flex-col gap-8 max-w-4xl animate-in fade-in slide-in-from-bottom-2 duration-700">
      <div className="border-b border-white/5 pb-6">
        <h1 className="text-3xl font-black font-headline uppercase tracking-tighter text-white">Compliance & Audit</h1>
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60 mt-1">Immutable ledgers and data retention governance.</p>
      </div>

      {/* AUDIT LOG PREVIEW */}
      <Card className="apple-glass border-white/5 shadow-xl overflow-hidden rounded-[2.5rem]">
        <CardHeader className="bg-white/5 p-8 border-b border-white/5 flex flex-row items-center justify-between">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                    <History className="w-6 h-6" />
                </div>
                <div>
                    <CardTitle className="text-sm font-black uppercase tracking-widest text-white">Administrative Audit Ledger</CardTitle>
                    <CardDescription className="text-[10px] uppercase font-bold opacity-50">Traceable record of all system configuration changes</CardDescription>
                </div>
            </div>
            <Button variant="outline" size="sm" className="h-9 px-4 rounded-xl border-white/10 text-[9px] font-black uppercase tracking-widest">
                <Search className="w-3 h-3 mr-2" /> View Full Logs
            </Button>
        </CardHeader>
        <CardContent className="p-0 overflow-hidden bg-black/20">
            <div className="divide-y divide-white/5">
                {[
                    { user: "Admin Alpha", action: "Updated Abuja HQ Geofence", time: "2 mins ago" },
                    { user: "System", action: "Automatic session purge completed", time: "1 hour ago" },
                    { user: "Admin Beta", action: "Modified 'Sick Leave' allowance", time: "3 hours ago" }
                ].map((log, i) => (
                    <div key={i} className="px-8 py-5 flex items-center justify-between group hover:bg-white/5 transition-all">
                        <div className="flex items-center gap-4">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                            <div>
                                <p className="text-xs font-black text-white uppercase tracking-tight">{log.action}</p>
                                <p className="text-[9px] font-bold text-muted-foreground uppercase opacity-40 mt-0.5">Executed by {log.user}</p>
                            </div>
                        </div>
                        <span className="text-[8px] font-black text-muted-foreground uppercase">{log.time}</span>
                    </div>
                ))}
            </div>
        </CardContent>
      </Card>

      {/* DATA GOVERNANCE */}
      <Card className="apple-glass border-white/5 shadow-xl overflow-hidden rounded-[2.5rem]">
        <CardHeader className="bg-white/5 p-8 border-b border-white/5 flex flex-row items-center gap-4">
            <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-400">
                <Database className="w-6 h-6" />
            </div>
            <div>
                <CardTitle className="text-sm font-black uppercase tracking-widest text-white">Data Retention & Exports</CardTitle>
                <CardDescription className="text-[10px] uppercase font-bold opacity-50">Bulk extraction and backup management</CardDescription>
            </div>
        </CardHeader>
        <CardContent className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button variant="outline" className="h-16 rounded-2xl border-white/10 hover:bg-primary/10 transition-all flex flex-col items-center justify-center gap-1 group">
                    <Download className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Export All Personnel Data</span>
                </Button>
                <Button variant="outline" className="h-16 rounded-2xl border-white/10 hover:bg-primary/10 transition-all flex flex-col items-center justify-center gap-1 group">
                    <Download className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Download Audit Reports</span>
                </Button>
            </div>
            <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 flex gap-4 items-center">
                <ShieldCheck className="w-5 h-5 text-primary" />
                <p className="text-[10px] font-bold text-muted-foreground uppercase leading-relaxed">System is configured for 7-year data retention compliance by default.</p>
            </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4 pt-6 border-t border-white/5 mt-4">
        <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/5 text-emerald-500 text-[9px] font-black uppercase px-4 py-1 rounded-full">Compliance Status: Nominal</Badge>
      </div>
    </div>
  )
}
