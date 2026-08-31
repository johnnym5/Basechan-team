"use client"
import React, { useState, useMemo } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from "recharts"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Filter, Users, Loader2 } from "lucide-react"
import type { PerformanceReview, ReviewTemplate, UserProfile } from "@/lib/types"
import { Badge } from "@/components/ui/badge"

interface PerformanceAnalyticsViewProps {
  reviewSubmissions: PerformanceReview[];
  templates: ReviewTemplate[];
  staffList: UserProfile[];
}

export function PerformanceAnalyticsView({ reviewSubmissions, templates, staffList }: PerformanceAnalyticsViewProps) {
  // If templateId is not set on old reviews, we might want a fallback or handle it.
  // We'll prioritize templates that actually have submissions.
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(templates[0]?.id || "monthly_sync")
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>(staffList.map(s => s.id))

  // Colors matching review form
  const TARGETS_COLOR = "#eab308" // Gold/Yellow
  const INTEGRITY_COLOR = "#22c55e" // Emerald/Green

  // 1. Filtered Data Computation
  const filteredSubmissions = useMemo(() => {
    return reviewSubmissions.filter(sub =>
      sub.templateId === selectedTemplateId && selectedStaffIds.includes(sub.userId)
    )
  }, [reviewSubmissions, selectedTemplateId, selectedStaffIds])

  // Master Combined Data
  const masterChartData = useMemo(() => {
    return selectedStaffIds.map(staffId => {
      const staff = staffList.find(s => s.id === staffId)
      const submission = filteredSubmissions.find(sub => sub.userId === staffId)

      if (!submission) return null

      // Calculate averages from ratings (scale 1-4/5)
      const targetScores = submission.businessTargets.map(t => t.score)
      const integrityScores = submission.interpersonalSkills.map(s => s.score)

      const avgTargets = targetScores.length ? targetScores.reduce((a, b) => a + b, 0) / targetScores.length : 0
      const avgIntegrity = integrityScores.length ? integrityScores.reduce((a, b) => a + b, 0) / integrityScores.length : 0

      return {
        id: staffId,
        name: staff?.fullName || "Unknown",
        "Operational Targets": Number(avgTargets.toFixed(1)),
        "Professional Integrity": Number(avgIntegrity.toFixed(1)),
      }
    }).filter(Boolean) as any[]
  }, [selectedStaffIds, staffList, filteredSubmissions])

  const toggleStaffSelection = (id: string) => {
    setSelectedStaffIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    )
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in">

      {/* CONTROLS HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-card/40 backdrop-blur-xl p-6 rounded-[2rem] border border-white/5 shadow-2xl">

        {/* TEMPLATE SELECTOR */}
        <div className="flex items-center gap-4">
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            <Filter className="w-4 h-4" />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60">Evaluation Template</span>
            <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
              <SelectTrigger className="w-[280px] bg-black/20 border-white/10 rounded-xl h-12 text-xs font-bold uppercase tracking-tight">
                <SelectValue placeholder="Select Template" />
              </SelectTrigger>
              <SelectContent className="apple-glass-darker border-none rounded-2xl">
                {templates.map(t => (
                  <SelectItem key={t.id} value={t.id} className="text-xs font-bold uppercase p-3">
                    {t.templateName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* MULTI-STAFF SELECTOR */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2 h-12 px-6 rounded-xl border-white/10 bg-black/20 font-black uppercase text-[10px] tracking-widest shadow-xl">
              <Users className="w-4 h-4" />
              <span>Filter Staff ({selectedStaffIds.length}/{staffList.length})</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[240px] apple-glass-darker border-white/10 p-3 space-y-2 rounded-2xl z-[100]">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-primary">Select Personnel</span>
              <Button
                variant="ghost"
                size="sm"
                className="text-[9px] font-black uppercase h-6 px-2 hover:bg-primary/10 text-primary"
                onClick={() => setSelectedStaffIds(selectedStaffIds.length === staffList.length ? [] : staffList.map(s => s.id))}
              >
                Toggle All
              </Button>
            </div>
            <div className="flex flex-col gap-1 max-h-[250px] overflow-y-auto custom-scrollbar">
              {staffList.map(staff => (
                <label key={staff.id} className="flex items-center gap-3 text-xs font-bold uppercase p-2 cursor-pointer hover:bg-white/5 rounded-xl transition-all">
                  <Checkbox
                    checked={selectedStaffIds.includes(staff.id)}
                    onCheckedChange={() => toggleStaffSelection(staff.id)}
                    className="border-white/20"
                  />
                  <span className="truncate">{staff.fullName}</span>
                </label>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* COMBINED MASTER CHART */}
      <Card className="bg-card/40 backdrop-blur-xl border-white/5 shadow-2xl rounded-[2.5rem] overflow-hidden">
        <CardHeader className="p-8 pb-0 shrink-0">
          <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground opacity-50">
            Personnel Comparative Rating Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8">
          {masterChartData.length === 0 ? (
            <div className="h-[320px] flex flex-col items-center justify-center opacity-20 italic border border-dashed border-white/10 rounded-3xl">
                <p className="text-xs uppercase font-black tracking-widest">No matching review data identified for this selection.</p>
            </div>
          ) : (
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={masterChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" tick={{fontSize: 10, fontWeight: 'bold', fill: 'rgba(255,255,255,0.4)'}} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 5]} ticks={[1, 2, 3, 4, 5]} tick={{fontSize: 10, fontWeight: 'bold', fill: 'rgba(255,255,255,0.4)'}} axisLine={false} tickLine={false} />
                  <RechartsTooltip
                    cursor={{fill: 'rgba(255,255,255,0.05)'}}
                    contentStyle={{backgroundColor: '#1a1b1e', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold'}}
                  />
                  <Legend iconType="circle" wrapperStyle={{paddingTop: '20px', fontSize: '10px', fontWeight: 'black', textTransform: 'uppercase', letterSpacing: '0.1em'}} />
                  <Bar dataKey="Operational Targets" fill={TARGETS_COLOR} radius={[4, 4, 0, 0]} isAnimationActive={false} barSize={40} />
                  <Bar dataKey="Professional Integrity" fill={INTEGRITY_COLOR} radius={[4, 4, 0, 0]} isAnimationActive={false} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* INDIVIDUAL STAFF ACCORDIONS (START CLOSED) */}
      <div className="space-y-4">
        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground px-2 opacity-50">
          Individual Breakdown (Click to Expand)
        </h3>

        <Accordion type="multiple" className="space-y-4">
          {masterChartData.map(staffData => {
            const submission = filteredSubmissions.find(sub => sub.userId === staffData.id)
            if (!submission) return null

            // Granular bar chart dataset for individual staff
            const granularData = [
              ...submission.businessTargets.map(t => ({
                metric: t.metricName.toUpperCase(),
                score: t.score,
                category: "Operational",
                fill: TARGETS_COLOR
              })),
              ...submission.interpersonalSkills.map(s => ({
                metric: s.skillName.toUpperCase(),
                score: s.score,
                category: "Integrity",
                fill: INTEGRITY_COLOR
              }))
            ]

            return (
              <AccordionItem key={staffData.id} value={staffData.id} className="border border-white/5 rounded-[2rem] bg-card/40 backdrop-blur-xl px-8 overflow-hidden shadow-xl group hover:border-primary/20 transition-all">
                <AccordionTrigger className="hover:no-underline py-6">
                  <div className="flex items-center justify-between w-full pr-4">
                    <span className="font-black text-lg font-headline tracking-tighter uppercase text-white group-hover:text-primary transition-colors">{staffData.name}</span>
                    <div className="flex gap-3">
                      <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-none font-black text-[9px] uppercase tracking-widest px-3 py-1">
                        Targets: {staffData["Operational Targets"]}/5
                      </Badge>
                      <Badge variant="outline" className="bg-green-500/10 text-green-500 border-none font-black text-[9px] uppercase tracking-widest px-3 py-1">
                        Integrity: {staffData["Professional Integrity"]}/5
                      </Badge>
                    </div>
                  </div>
                </AccordionTrigger>

                <AccordionContent className="pt-2 pb-10 border-t border-white/5 bg-black/10 -mx-8 px-8">
                  <div className="h-[350px] w-full mt-6">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={granularData} layout="vertical" margin={{ left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                        <XAxis type="number" domain={[0, 5]} ticks={[1, 2, 3, 4, 5]} tick={{fontSize: 10, fontWeight: 'bold', fill: 'rgba(255,255,255,0.4)'}} axisLine={false} tickLine={false} />
                        <YAxis
                            dataKey="metric"
                            type="category"
                            width={160}
                            tick={{fontSize: 9, fontWeight: 'bold', fill: 'rgba(255,255,255,0.6)'}}
                            axisLine={false}
                            tickLine={false}
                        />
                        <RechartsTooltip
                            cursor={{fill: 'rgba(255,255,255,0.05)'}}
                            contentStyle={{backgroundColor: '#1a1b1e', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold'}}
                        />
                        <Bar
                          dataKey="score"
                          radius={[0, 4, 4, 0]}
                          isAnimationActive={false}
                          barSize={20}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </AccordionContent>
              </AccordionItem>
            )
          })}
        </Accordion>
      </div>

    </div>
  )
}
