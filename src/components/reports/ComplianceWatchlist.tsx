"use client"

import React, { useState, useMemo } from "react"
import { Calendar } from "@/components/ui/calendar"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, UserSearch, CalendarDays, ShieldAlert, CheckCircle2, Clock } from "lucide-react"
import {
    eachDayOfInterval,
    startOfMonth,
    endOfMonth,
    isWeekend,
    isSameDay,
    parseISO,
    format,
    isAfter,
    startOfToday
} from "date-fns"
import type { UserProfile, Attendance } from "@/lib/types"
import { cn } from "@/lib/utils"

interface ComplianceWatchlistProps {
    staffList: UserProfile[];
    attendanceData: Attendance[];
}

export function ComplianceWatchlist({ staffList, attendanceData }: ComplianceWatchlistProps) {
    const [selectedStaffId, setSelectedStaffId] = useState<string>("ALL")
    const [month, setMonth] = useState<Date>(new Date())

    const watchlist = useMemo(() => {
        return staffList.map(user => {
            const userAtt = attendanceData.filter(a => a.userId === user.id)
            const lateIns = userAtt.filter(a => a.remarks?.includes('LATE')).length
            const earlyOuts = userAtt.filter(a => a.remarks?.includes('UNDERTIME')).length
            const missedOuts = userAtt.filter(a => a.clockIn && !a.clockOut).length

            return {
                id: user.id,
                name: user.fullName,
                lateIns,
                earlyOuts,
                missedOuts,
                total: lateIns + earlyOuts + missedOuts
            }
        })
        .filter(r => r.total > 0)
        .sort((a, b) => b.total - a.total)
    }, [staffList, attendanceData])

    const heatMapData = useMemo(() => {
        if (selectedStaffId === "ALL") return null

        const start = startOfMonth(month)
        const end = endOfMonth(month)
        const days = eachDayOfInterval({ start, end })
        const today = startOfToday()

        const perfect: Date[] = []
        const partial: Date[] = []
        const absent: Date[] = []

        const userAtt = attendanceData.filter(a => a.userId === selectedStaffId)

        days.forEach(day => {
            if (isWeekend(day) || isAfter(day, today)) return

            const record = userAtt.find(a => isSameDay(parseISO(a.date + 'T00:00:00'), day))

            if (!record) {
                absent.push(day)
            } else {
                const isPerfect = record.status === 'APPROVED' &&
                                 !record.remarks?.includes('LATE') &&
                                 !record.remarks?.includes('UNDERTIME') &&
                                 record.clockOut

                if (isPerfect) {
                    perfect.push(day)
                } else {
                    partial.push(day)
                }
            }
        })

        return { perfect, partial, absent }
    }, [selectedStaffId, month, attendanceData])

    return (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
            {/* HEADER & SEARCH */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-secondary/10 p-6 rounded-[2rem] border border-white/5 shadow-inner">
                <div>
                    <h3 className="text-xl font-black font-headline tracking-tighter text-rose-500 uppercase flex items-center gap-2">
                        <AlertTriangle className="w-6 h-6" /> Punctuality Watchlist
                    </h3>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60 mt-1">Identifying operational friction points.</p>
                </div>

                <div className="w-full md:w-80">
                    <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
                        <SelectTrigger className="h-12 rounded-xl border-white/10 bg-background/50 backdrop-blur-md">
                            <UserSearch className="w-4 h-4 mr-2 text-primary opacity-50" />
                            <SelectValue placeholder="Analyze Specific Unit" />
                        </SelectTrigger>
                        <SelectContent className="apple-glass-darker border-white/10">
                            <SelectItem value="ALL" className="text-xs font-bold uppercase tracking-tight">Full Fleet Table</SelectItem>
                            {staffList.map(staff => (
                                <SelectItem key={staff.id} value={staff.id} className="text-xs font-bold">{staff.fullName}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {selectedStaffId === "ALL" ? (
                <Card className="apple-glass border-none shadow-2xl overflow-hidden">
                    <CardHeader className="bg-rose-500/5 border-b border-white/5 py-4">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-black uppercase tracking-widest text-rose-500 opacity-80">Aggregated Friction Data</CardTitle>
                            <Badge variant="destructive" className="animate-pulse text-[8px] font-black tracking-[0.2em]">ADMIN OVERWATCH</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader className="bg-white/5">
                                <TableRow className="border-white/5 hover:bg-transparent">
                                    <TableHead className="text-[10px] font-black uppercase text-muted-foreground">Staff Member</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase text-muted-foreground text-center">Late Clock-ins</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase text-muted-foreground text-center">Early Clock-outs</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase text-muted-foreground text-center">Absent</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase text-muted-foreground text-right">Total Friction</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {watchlist.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="py-24 text-center text-muted-foreground opacity-30 italic text-sm font-bold uppercase tracking-widest">
                                            Compliance is currently at 100%. No units flagged.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    watchlist.map((row) => (
                                        <TableRow key={row.id} className="border-white/5 hover:bg-white/5 transition-colors group">
                                            <TableCell className="font-bold text-sm">{row.name}</TableCell>
                                            <TableCell className="text-center font-mono text-xs text-amber-500">{row.lateIns}</TableCell>
                                            <TableCell className="text-center font-mono text-xs text-orange-500">{row.earlyOuts}</TableCell>
                                            <TableCell className="text-center font-mono text-xs text-rose-500">{row.missedOuts}</TableCell>
                                            <TableCell className="text-right font-black text-rose-500 group-hover:scale-110 transition-transform">
                                                {row.total}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    <Card className="xl:col-span-2 apple-glass border-none shadow-xl overflow-hidden">
                        <CardHeader className="border-b border-white/5 bg-white/5">
                            <CardTitle className="text-lg font-black font-headline tracking-tighter uppercase flex items-center gap-2">
                                <CalendarDays className="w-5 h-5 text-primary" /> Attendance Heat-map
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 flex justify-center bg-black/20">
                            <Calendar
                                mode="multiple"
                                month={month}
                                onMonthChange={setMonth}
                                modifiers={{
                                    perfect: heatMapData?.perfect || [],
                                    partial: heatMapData?.partial || [],
                                    absent: heatMapData?.absent || [],
                                }}
                                modifiersClassNames={{
                                    perfect: "bg-emerald-500/20 text-emerald-500 font-black hover:bg-emerald-500/30 border border-emerald-500/30 rounded-xl",
                                    partial: "bg-amber-500/20 text-amber-500 font-black hover:bg-amber-500/30 border border-amber-500/30 rounded-xl",
                                    absent: "bg-rose-500/20 text-rose-500 font-black hover:bg-rose-500/30 border border-rose-500/30 rounded-xl",
                                }}
                                className="rounded-[2rem] border border-white/5 p-6 bg-card"
                            />
                        </CardContent>
                    </Card>

                    <div className="space-y-6">
                        <Card className="apple-glass border-none shadow-xl flex flex-col h-fit">
                            <CardHeader className="border-b border-white/5 bg-white/5">
                                <CardTitle className="text-lg font-black font-headline tracking-tighter uppercase">Monthly Analysis</CardTitle>
                                <CardDescription className="text-[10px] font-bold uppercase tracking-widest opacity-60">{format(month, 'MMMM yyyy')}</CardDescription>
                            </CardHeader>
                            <CardContent className="p-6 space-y-4">
                                <SummaryItem
                                    icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                                    label="Perfect Shifts"
                                    count={heatMapData?.perfect.length || 0}
                                    color="text-emerald-500"
                                    bgColor="bg-emerald-500/10 border-emerald-500/20"
                                />
                                <SummaryItem
                                    icon={<Clock className="w-4 h-4 text-amber-500" />}
                                    label="Partial (Late/Early)"
                                    count={heatMapData?.partial.length || 0}
                                    color="text-amber-500"
                                    bgColor="bg-amber-500/10 border-amber-500/20"
                                />
                                <SummaryItem
                                    icon={<ShieldAlert className="w-4 h-4 text-rose-500" />}
                                    label="Unexcused Absent"
                                    count={heatMapData?.absent.length || 0}
                                    color="text-rose-500"
                                    bgColor="bg-rose-500/10 border-rose-500/20"
                                />

                                <div className="mt-6 pt-6 border-t border-white/5">
                                    <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 space-y-2">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-primary opacity-60">Insight</p>
                                        <p className="text-xs leading-relaxed text-muted-foreground font-medium italic">
                                            "Absent" status flags workdays with zero logged telemetry. Weekends and approved leaves are automatically excluded.
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}
        </div>
    )
}

function SummaryItem({ icon, label, count, color, bgColor }: any) {
    return (
        <div className={cn("flex justify-between items-center p-4 border rounded-2xl transition-all shadow-inner", bgColor)}>
            <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-background/50 shadow-inner">{icon}</div>
                <span className="text-[10px] font-black uppercase tracking-widest opacity-80">{label}</span>
            </div>
            <span className={cn("text-2xl font-black font-mono", color)}>{count}</span>
        </div>
    )
}
