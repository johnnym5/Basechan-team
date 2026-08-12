"use client"
import React, { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { AlertTriangle, CheckCircle, Clock, Info, UserX, Lightbulb, Zap, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface OperationsIntelligenceBriefProps {
  attendanceData: any[];
  taskData: any[];
  staffData: any[];
}

export function OperationsIntelligenceBrief({ attendanceData, taskData, staffData }: OperationsIntelligenceBriefProps) {
  const [timeframe, setTimeframe] = useState("TODAY")
  const [dismissedInsights, setDismissedInsights] = useState<string[]>([])

  // MOCK INTELLIGENCE ENGINE - This would be replaced with real data analysis logic
  const { summaryString, insights } = useMemo(() => {
    // Basic counts for summary
    const totalStaff = staffData.length;
    const activeStaff = attendanceData.filter(a => a.clockIn && !a.clockOut).length;
    const pendingTasks = taskData.filter(t => t.status === 'AWAITING_REVIEW').length;

    if (timeframe === "TODAY") {
        return {
            summaryString: `Today's operational summary: ${activeStaff} staff currently active, ${pendingTasks} tasks awaiting your review, and 2 staff have requested leave. Node availability is at nominal levels.`,
            insights: [
                {
                    id: "ins_1_today",
                    type: "action",
                    icon: UserX,
                    title: "Missing Personnel",
                    description: "Cletus and Jumai did not clock in today.",
                    details: ["Last active: 48h ago", "No leave request found", "Contact protocol recommended"],
                    actionLabel: "Contact Staff"
                },
                {
                    id: "ins_2_today",
                    type: "warning",
                    icon: AlertCircle,
                    title: "Review Bottleneck",
                    description: `${pendingTasks} missions are stuck in 'Awaiting Review'.`,
                    details: ["Sarah: 4 tasks", "John: 2 tasks", "Peter: 1 task"],
                    actionLabel: "Launch Review"
                }
            ]
        }
    }

    return {
      summaryString: timeframe === "WEEK"
        ? "Weekly operational summary: 94% average punctuality maintained. Task throughput has increased by 12% compared to last cycle. 3 staff exhibit high friction rates."
        : "Monthly operational summary: Total productivity at 88%. Organizational velocity is stable. Annual leave balances are reaching low thresholds for 5 personnel.",

      insights: [
        {
          id: "ins_1",
          type: "warning",
          icon: Clock,
          title: "Punctuality Friction Detected",
          description: "John came in late 3 times this week.",
          details: ["Mon: Traffic on I-95", "Wed: Car wouldn't start", "Thu: Personal emergency"],
          actionLabel: "View Timesheets"
        },
        {
          id: "ins_3",
          type: "success",
          icon: Zap,
          title: "Peak Velocity",
          description: "Peter has the most completed tasks (14) this cycle.",
          details: ["100% completion rate", "0% revision rate", "Highest throughput in Ops"],
          actionLabel: "Send Kudos"
        },
        {
          id: "ins_4",
          type: "info",
          icon: Info,
          title: "Leave Balance Alert",
          description: "Leena has only 2 days of annual leave remaining.",
          details: ["Accrued: 20 days", "Used: 18 days", "Policy limit check required"],
          actionLabel: "Review Leave"
        }
      ]
    }
  }, [timeframe, attendanceData, taskData, staffData])

  const visibleInsights = insights.filter(ins => !dismissedInsights.includes(ins.id))

  return (
    <Card className="bg-card border-border shadow-md flex flex-col h-full max-h-[600px] overflow-hidden">
      <CardHeader className="border-b border-border/50 pb-4 flex flex-row justify-between items-center bg-secondary/10 shrink-0">
        <CardTitle className="text-sm font-black uppercase tracking-wider text-primary flex items-center gap-2">
          <Lightbulb className="h-4 w-4" />
          Intelligence Brief
        </CardTitle>
        <Select value={timeframe} onValueChange={setTimeframe}>
          <SelectTrigger className="w-[120px] h-8 text-[10px] font-black uppercase tracking-widest bg-background/50 border-white/5">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="apple-glass-darker border-none">
            <SelectItem value="TODAY" className="text-[10px] font-black uppercase tracking-widest">Today</SelectItem>
            <SelectItem value="WEEK" className="text-[10px] font-black uppercase tracking-widest">This Week</SelectItem>
            <SelectItem value="MONTH" className="text-[10px] font-black uppercase tracking-widest">This Month</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>

      <CardContent className="p-0 flex flex-col flex-1 overflow-hidden">

        {/* TOP LINE SUMMARY */}
        <div className="p-4 bg-primary/5 border-b border-border shrink-0">
          <p className="text-xs font-bold leading-relaxed text-foreground/80">
            {summaryString}
          </p>
        </div>

        {/* SCROLLABLE INSIGHT FEED */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {visibleInsights.length === 0 ? (
            <div className="text-center p-8 text-[10px] font-black uppercase tracking-widest text-muted-foreground border border-dashed border-border/50 rounded-xl opacity-30">
              All insights acknowledged. Operating at nominal parameters.
            </div>
          ) : (
            visibleInsights.map(insight => {
              const Icon = insight.icon
              return (
                <div key={insight.id} className="p-4 border border-border/60 rounded-2xl bg-muted/20 shadow-sm hover:border-primary/40 transition-all group animate-in slide-in-from-right-2 duration-300">
                  <div className="flex gap-4">
                    <div className={cn(
                        "mt-0.5 shrink-0 p-2 rounded-xl bg-white/5",
                        insight.type === 'warning' ? 'text-amber-500' :
                        insight.type === 'success' ? 'text-emerald-500' :
                        insight.type === 'action' ? 'text-rose-500' : 'text-blue-500'
                    )}>
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="flex-1 space-y-1">
                      <h4 className="text-xs font-black uppercase tracking-tight text-white">{insight.title}</h4>
                      <p className="text-[11px] text-muted-foreground font-medium">{insight.description}</p>

                      {/* Expandable Details for things like "Late Reasons" */}
                      {insight.details.length > 0 && (
                        <Accordion type="single" collapsible className="w-full mt-2">
                          <AccordionItem value="details" className="border-none">
                            <AccordionTrigger className="text-[9px] font-black uppercase tracking-widest py-1 text-muted-foreground hover:text-primary transition-colors">
                                Details & Context
                            </AccordionTrigger>
                            <AccordionContent>
                              <ul className="space-y-1.5 mt-2">
                                {insight.details.map((detail, idx) => (
                                  <li key={idx} className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground">
                                      <div className="w-1 h-1 rounded-full bg-primary/40" />
                                      {detail}
                                  </li>
                                ))}
                              </ul>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      )}

                      {/* Triage Actions */}
                      <div className="flex gap-2 pt-3 mt-3 border-t border-white/5">
                        <button
                          onClick={() => setDismissedInsights(prev => [...prev, insight.id])}
                          className="text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:text-white px-3 py-1.5 rounded-lg border border-white/5 hover:bg-white/5 transition-all"
                        >
                          Dismiss
                        </button>
                        <button className="text-[9px] font-black uppercase tracking-widest text-primary hover:text-white px-3 py-1.5 rounded-lg border border-primary/20 bg-primary/10 hover:bg-primary transition-all">
                          {insight.actionLabel}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </CardContent>
    </Card>
  )
}
