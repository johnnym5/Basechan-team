"use client"
import React from "react"
import { format, parseISO } from "date-fns"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent } from "@/components/ui/card"
import { Calendar, Clock, CheckCircle2, AlertTriangle, FileText, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { RecapMode } from "@/hooks/useRecapSummary"

interface PerformanceRecapModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffName: string;
  summaryData: any;
  mode: RecapMode;
  periodLabel: string;
}

export function PerformanceRecapModal({
    isOpen,
    onClose,
    staffName,
    summaryData,
    mode,
    periodLabel
}: PerformanceRecapModalProps) {
  if (!summaryData) return null

  const handlePrint = () => {
    window.print();
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] apple-glass-darker border-none flex flex-col overflow-hidden p-0 shadow-3xl rounded-[2.5rem]">

        {/* HEADER */}
        <DialogHeader className="p-8 pb-6 border-b border-white/5 bg-white/5 shrink-0">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
                <DialogTitle className="text-2xl font-black font-headline tracking-tighter uppercase text-white">
                    {mode === 'WEEKLY' ? 'Weekly' : 'Monthly'} Performance Audit
                </DialogTitle>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60">
                    Personnel: <span className="text-primary">{staffName}</span> • {periodLabel}
                </p>
            </div>
            <Button variant="outline" size="sm" onClick={handlePrint} className="h-10 rounded-xl bg-white/5 border-white/10 text-[9px] font-black uppercase tracking-widest hover:bg-white/10 no-print">
                <Download className="w-3.5 h-3.5 mr-2" /> Export / Print
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto custom-scrollbar [scrollbar-gutter:stable] p-8 space-y-8">

          {/* STATS MATRIX */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-white/5 border-white/5 p-4 rounded-2xl shadow-inner">
              <span className="text-[9px] font-black uppercase text-muted-foreground opacity-50 flex items-center gap-2 mb-2">
                <Calendar className="w-3.5 h-3.5 text-primary" /> Days Present
              </span>
              <p className="text-2xl font-black font-headline text-white">{summaryData.daysPresent} <span className="text-[10px] opacity-30">Days</span></p>
            </Card>

            <Card className="bg-white/5 border-white/5 p-4 rounded-2xl shadow-inner">
              <span className="text-[9px] font-black uppercase text-muted-foreground opacity-50 flex items-center gap-2 mb-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Late Arrivals
              </span>
              <p className="text-2xl font-black font-headline text-amber-500">{summaryData.lateCount} <span className="text-[10px] opacity-30">Times</span></p>
            </Card>

            <Card className="bg-white/5 border-white/5 p-4 rounded-2xl shadow-inner">
              <span className="text-[9px] font-black uppercase text-muted-foreground opacity-50 flex items-center gap-2 mb-2">
                <Clock className="w-3.5 h-3.5 text-rose-500" /> Absences
              </span>
              <p className="text-2xl font-black font-headline text-rose-500">{summaryData.absentCount} <span className="text-[10px] opacity-30">Days</span></p>
            </Card>

            <Card className="bg-white/5 border-white/5 p-4 rounded-2xl shadow-inner">
              <span className="text-[9px] font-black uppercase text-muted-foreground opacity-50 flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Tasks Done
              </span>
              <p className="text-2xl font-black font-headline text-emerald-500">{summaryData.completedTasksCount} <span className="text-[10px] opacity-30">Units</span></p>
            </Card>
          </div>

          {/* TIMING & LEAVE HIGHLIGHTS */}
          <div className="p-6 rounded-[1.5rem] border border-white/5 bg-black/20 space-y-4">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Average Clock-In:</span>
              <span className="text-xs font-black font-mono text-white">{summaryData.avgClockIn}</span>
            </div>
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Average Clock-Out:</span>
              <span className="text-xs font-black font-mono text-white">{summaryData.avgClockOut}</span>
            </div>
            <div className="flex justify-between items-center pt-1">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Leave Activity:</span>
              <span className="text-[10px] font-black uppercase tracking-tight text-primary bg-primary/10 px-3 py-1 rounded-full">{summaryData.leaveSummary}</span>
            </div>
          </div>

          {/* CHRONOLOGICAL EOD DAILY REPORTS */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
                <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" /> Daily Activity Feed ({summaryData.reports.length})
                </h4>
                <div className="h-px flex-1 bg-white/5 ml-4" />
            </div>

            {summaryData.reports.length === 0 ? (
              <div className="py-20 text-center border border-dashed border-white/10 rounded-[2rem] opacity-20 italic">
                <p className="text-[10px] font-black uppercase tracking-widest">No daily operational reports identified for this period.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4 pb-10">
                {summaryData.reports.map((report: any) => (
                  <div key={report.id} className="p-6 border border-white/5 rounded-2xl bg-white/[0.02] hover:bg-white/[0.04] transition-all space-y-3 shadow-sm group">
                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                      <span className="font-black text-[10px] text-primary uppercase tracking-widest">
                        {format(parseISO(report.date), 'EEEE, MMMM do')}
                      </span>
                      {report.workload && (
                        <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded bg-secondary/50 text-muted-foreground/60 border border-white/5 group-hover:text-foreground transition-colors">
                          TAGS: {report.workload}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-slate-300 leading-relaxed italic">
                      "{report.content}"
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </DialogContent>
    </Dialog>
  )
}
