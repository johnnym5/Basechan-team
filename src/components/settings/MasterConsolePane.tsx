"use client"

import React, { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertTriangle, HardDrive, RefreshCw, Trash2, ShieldAlert } from "lucide-react"
import { DatabaseExplorer } from "@/components/superadmin/DatabaseExplorer"
import { useSuperAdmin } from "@/hooks/useSuperAdmin"
import { useToast } from "@/hooks/use-toast"

export function MasterConsolePane() {
  const { isSuperAdmin, isLoading } = useSuperAdmin()
  const { toast } = useToast()
  const [isExecuting, setIsExecuting] = useState(false)

  // STRICT RBAC CHECK
  if (!isLoading && !isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center p-6">
        <div className="p-4 rounded-full bg-destructive/10 mb-4">
          <ShieldAlert className="h-12 w-12 text-destructive" />
        </div>
        <h1 className="text-2xl font-black font-headline uppercase tracking-tighter">Access Forbidden</h1>
        <p className="text-muted-foreground mt-2 max-w-md uppercase text-[10px] font-bold tracking-widest opacity-60">
          This secure infrastructure node requires Super Administrator clearance. Your current interaction tier is restricted.
        </p>
      </div>
    )
  }

  const handleSystemFunction = async (functionName: string) => {
    setIsExecuting(true)
    toast({
      title: "System Protocol Initiated",
      description: `Executing ${functionName}. Bypassing standard approvals.`,
    })

    // Simulate backend call
    setTimeout(() => {
      setIsExecuting(false)
      toast({
        title: "Execution Complete",
        description: `Operational state updated for ${functionName}.`,
      })
    }, 1500)
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-1">
        <h3 className="text-2xl font-black font-headline tracking-tighter uppercase">Master Console</h3>
        <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest opacity-60">
          Direct infrastructure access & core system protocols. Use extreme caution.
        </p>
      </div>

      {/* DANGER ZONE - SYSTEM FUNCTIONS */}
      <Card className="border-rose-500/20 bg-rose-500/5 rounded-[2rem] overflow-hidden shadow-2xl shadow-rose-500/10">
        <CardHeader className="border-b border-rose-500/10 p-8">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-500">
                <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
                <CardTitle className="text-rose-500 font-black uppercase tracking-tighter text-xl">Danger Zone</CardTitle>
                <CardDescription className="font-bold text-[10px] uppercase tracking-widest opacity-60 mt-1">
                    Direct execution environment. Standard organizational safeties are disabled.
                </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-8 flex flex-wrap gap-4">
          <Button
            variant="outline"
            className="h-16 rounded-2xl border-rose-500/20 text-rose-500 hover:bg-rose-500/10 hover:text-rose-600 font-black uppercase tracking-[0.2em] text-[10px] px-8"
            onClick={() => handleSystemFunction('Clear Global Cache')}
            disabled={isExecuting}
          >
            <Trash2 className="w-4 h-4 mr-3" /> Clear Global Cache
          </Button>
          <Button
            variant="outline"
            className="h-16 rounded-2xl border-rose-500/20 text-rose-500 hover:bg-rose-500/10 hover:text-rose-600 font-black uppercase tracking-[0.2em] text-[10px] px-8"
            onClick={() => handleSystemFunction('Force Sync Users')}
            disabled={isExecuting}
          >
            <RefreshCw className="w-4 h-4 mr-3" /> Force Sync Users
          </Button>
          <Button
            variant="destructive"
            className="h-16 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black uppercase tracking-[0.2em] text-[10px] px-8 shadow-xl shadow-rose-600/20 border-none"
            onClick={() => handleSystemFunction('Purge Orphaned Data')}
            disabled={isExecuting}
          >
            <HardDrive className="w-4 h-4 mr-3" /> Purge Orphaned Data
          </Button>
        </CardContent>
      </Card>

      {/* DATABASE EXPLORER INTEGRATION */}
      <Card className="rounded-[2.5rem] border-white/5 bg-white/5 overflow-hidden shadow-3xl">
        <CardHeader className="p-8 pb-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                <HardDrive className="w-6 h-6" />
            </div>
            <div>
                <CardTitle className="font-black uppercase tracking-tighter text-xl">Infrastructure Explorer</CardTitle>
                <CardDescription className="font-bold text-[10px] uppercase tracking-widest opacity-60 mt-1">
                    Real-time Firestore telemetry & document management.
                </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="min-h-[600px] bg-background/40 backdrop-blur-md">
             <DatabaseExplorer />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
