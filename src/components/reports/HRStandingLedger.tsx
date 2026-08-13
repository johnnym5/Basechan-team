"use client"

import React, { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { PlusCircle, MinusCircle, ShieldAlert, ShieldCheck, Scale, History, User } from "lucide-react"
import { cn } from "@/lib/utils"
import type { UserProfile } from "@/lib/types"

interface HRStandingLedgerProps {
  staffList: UserProfile[];
}

interface StandingRecord {
    id: string;
    name: string;
    points: number;
    lastReason: string;
}

export function HRStandingLedger({ staffList = [] }: HRStandingLedgerProps) {
  // Local state for management - In production, this would be persisted to Firestore
  const [ledgerData, setLedgerData] = useState<StandingRecord[]>(
    staffList
      .filter(u => !['SUPERADMIN', 'ORG_ADMIN', 'MANAGING_DIRECTOR', 'HR_MANAGER'].includes(u.role))
      .map(staff => ({
      id: staff.id,
      name: staff.fullName,
      points: 100, // Default baseline
      lastReason: "Initial Baseline Set",
    }))
  )

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [activeAction, setActiveAction] = useState<'MERIT' | 'DEMERIT' | null>(null)
  const [selectedStaff, setSelectedStaff] = useState<StandingRecord | null>(null)

  // Form State
  const [pointValue, setPointValue] = useState("5")
  const [reason, setReason] = useState("")

  const openAdjustmentModal = (staff: StandingRecord, type: 'MERIT' | 'DEMERIT') => {
    setSelectedStaff(staff)
    setActiveAction(type)
    setPointValue("5")
    setReason("")
    setIsModalOpen(true)
  }

  const handleAdjustment = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedStaff || !activeAction) return;

    const modifier = activeAction === 'MERIT' ? parseInt(pointValue) : -parseInt(pointValue)

    setLedgerData(prev => prev.map(s => {
      if (s.id === selectedStaff.id) {
        return {
          ...s,
          points: Math.max(0, s.points + modifier), // Floor at 0
          lastReason: `${activeAction === 'MERIT' ? '+' : '-'}${pointValue}: ${reason}`
        }
      }
      return s
    }))
    setIsModalOpen(false)
  }

  return (
    <Card className="bg-card border border-border shadow-sm rounded-2xl flex flex-col h-full w-full overflow-hidden">
      <CardHeader className="border-b border-border/50 p-4 md:p-6 pb-4 shrink-0 bg-secondary/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
            <CardTitle className="text-sm font-black uppercase tracking-[0.2em] flex items-center gap-2">
                <Scale className="h-4 w-4 text-primary" />
                Staff Performance Ledger
            </CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest opacity-60">Company Performance & Integrity Ranking</CardDescription>
        </div>
        <Badge variant="outline" className="bg-background/50 border-white/5 text-[9px] font-black uppercase">Staff Audit Active</Badge>
      </CardHeader>

      <CardContent className="p-0 overflow-y-auto custom-scrollbar flex-1 bg-black/5 overflow-x-auto w-full">
        <table className="w-full text-sm text-left border-collapse min-w-[700px]">
          <thead className="bg-secondary/20 text-[10px] font-black uppercase text-muted-foreground sticky top-0 z-10 backdrop-blur-md">
            <tr className="border-b border-white/5">
              <th className="px-6 py-4">Team Member</th>
              <th className="px-6 py-4 text-center">Score</th>
              <th className="px-6 py-4 text-center">Standing</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {ledgerData.sort((a, b) => b.points - a.points).map(staff => (
              <tr key={staff.id} className="hover:bg-white/5 transition-all group h-16">
                <td className="px-6 py-4">
                  <div className="flex flex-col min-w-[180px]">
                    <span className="font-black text-xs text-white uppercase tracking-tight truncate">{staff.name}</span>
                    <div className="flex items-center gap-1.5 mt-1 opacity-60">
                        <History className="h-2.5 w-2.5" />
                        <span className="text-[8px] font-bold text-muted-foreground uppercase truncate max-w-[150px] md:max-w-[200px]">{staff.lastReason}</span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-center">
                    <span className={cn(
                        "font-black font-mono text-lg",
                        staff.points >= 110 ? "text-emerald-500" :
                        staff.points < 80 ? "text-rose-500" : "text-primary"
                    )}>
                        {staff.points}
                    </span>
                </td>
                <td className="px-6 py-4 text-center">
                  {staff.points >= 110 ? (
                      <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[9px] font-black uppercase rounded-lg">
                          <ShieldCheck className="w-3 h-3 mr-1.5"/> Elite Node
                      </Badge>
                  ) : staff.points >= 80 ? (
                      <Badge variant="secondary" className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-[9px] font-black uppercase rounded-lg">
                          Standard
                      </Badge>
                  ) : (
                      <Badge variant="destructive" className="bg-rose-500/10 text-rose-500 border-rose-500/20 text-[9px] font-black uppercase rounded-lg animate-pulse">
                          <ShieldAlert className="w-3 h-3 mr-1.5"/> Action Required
                      </Badge>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-all">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openAdjustmentModal(staff, 'DEMERIT')}
                            className="h-9 w-9 text-rose-500 hover:bg-rose-500/10 rounded-xl"
                            title="Issue Demerit"
                        >
                            <MinusCircle className="w-5 h-5" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openAdjustmentModal(staff, 'MERIT')}
                            className="h-9 w-9 text-emerald-500 hover:bg-emerald-500/10 rounded-xl"
                            title="Award Merit"
                        >
                            <PlusCircle className="w-5 h-5" />
                        </Button>
                    </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>

      {/* ADJUSTMENT MODAL */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="w-[95vw] max-w-[450px] apple-glass-darker border-none rounded-[2rem] p-4 md:p-8 shadow-3xl overflow-hidden">
          <form onSubmit={handleAdjustment}>
            <DialogHeader className="mb-4 md:mb-6">
                <div className="flex items-center gap-3 md:gap-4 mb-2">
                    <div className={cn(
                        "p-2 md:p-3 rounded-2xl shrink-0",
                        activeAction === 'MERIT' ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                    )}>
                        <User className="w-5 h-5 md:w-6 md:h-6" />
                    </div>
                    <div className="min-w-0">
                        <DialogTitle className={cn(
                            "text-xl md:text-2xl font-black font-headline tracking-tighter uppercase truncate",
                            activeAction === 'MERIT' ? 'text-emerald-500' : 'text-rose-500'
                        )}>
                            {activeAction === 'MERIT' ? 'Authorize Merit' : 'Issue Demerit'}
                        </DialogTitle>
                        <DialogDescription className="text-[10px] font-black uppercase tracking-widest opacity-60 truncate">Node Standing: {selectedStaff?.name}</DialogDescription>
                    </div>
                </div>
            </DialogHeader>

            <div className="space-y-4 md:space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Point Variance</label>
                <div className="relative">
                    <Input
                        type="number"
                        min="1"
                        max="50"
                        required
                        value={pointValue}
                        onChange={e => setPointValue(e.target.value)}
                        className="h-10 md:h-12 bg-background/50 border-white/10 rounded-xl font-black text-base md:text-lg focus:ring-2 focus:ring-primary/20 text-center"
                    />
                    <div className="absolute inset-y-0 left-4 flex items-center opacity-30">
                        {activeAction === 'MERIT' ? <PlusCircle className="h-4 w-4" /> : <MinusCircle className="h-4 w-4" />}
                    </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Official Justification (Audit Log)</label>
                <Textarea
                    required
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    placeholder="Document behavioral trigger..."
                    className="min-h-[100px] md:min-h-[120px] bg-background/50 border-white/10 rounded-2xl resize-none p-3 md:p-4 text-sm font-medium focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="p-3 md:p-4 rounded-xl md:rounded-2xl bg-amber-500/10 border border-amber-500/20 flex gap-3 md:gap-4 text-amber-600">
                <ShieldAlert className="h-5 w-5 shrink-0" />
                <p className="text-[9px] md:text-[10px] font-bold leading-relaxed uppercase tracking-tighter opacity-80">
                    Warning: Manual standing adjustments bypass automated telemetry and create a permanent audit log entry.
                </p>
              </div>
            </div>

            <DialogFooter className="mt-6 md:mt-8 gap-3 flex-row justify-end">
              <Button type="button" variant="ghost" className="h-10 md:h-12 rounded-xl text-[10px] font-black uppercase tracking-widest px-4 md:px-6" onClick={() => setIsModalOpen(false)}>Abort</Button>
              <Button
                type="submit"
                className={cn(
                    "flex-1 h-10 md:h-12 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-xl",
                    activeAction === 'MERIT' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20' : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                )}
              >
                Confirm {activeAction === 'MERIT' ? 'Award' : 'Execution'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
