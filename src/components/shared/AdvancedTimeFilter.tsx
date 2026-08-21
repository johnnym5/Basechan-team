"use client"

import React, { useState } from "react"
import {
  format,
  subMonths,
  addMonths,
  startOfMonth,
  getWeeksInMonth,
  subWeeks,
  addWeeks,
  subDays,
  addDays,
  startOfWeek,
  endOfWeek,
  getWeekOfMonth
} from "date-fns"
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"

export type TimeFilterState = {
  mode: 'DAY' | 'WEEK' | 'MONTH'
  referenceDate: Date
  weekIndex?: number // 1 to 5
}

interface AdvancedTimeFilterProps {
  value: TimeFilterState
  onChange: (newValue: TimeFilterState) => void
  className?: string
}

export function AdvancedTimeFilter({ value, onChange, className }: AdvancedTimeFilterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [navDate, setNavDate] = useState(value.referenceDate)

  // Quick Navigation Logic
  const handleQuickPrev = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (value.mode === 'MONTH') {
      onChange({ ...value, referenceDate: subMonths(value.referenceDate, 1) })
    } else if (value.mode === 'WEEK') {
      const prevWeek = subWeeks(startOfWeek(value.referenceDate, { weekStartsOn: 1 }), 1)
      onChange({
        mode: 'WEEK',
        referenceDate: startOfMonth(prevWeek),
        weekIndex: getWeekOfMonth(prevWeek, { weekStartsOn: 1 })
      })
    } else {
      onChange({ ...value, referenceDate: subDays(value.referenceDate, 1) })
    }
  }

  const handleQuickNext = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (value.mode === 'MONTH') {
      onChange({ ...value, referenceDate: addMonths(value.referenceDate, 1) })
    } else if (value.mode === 'WEEK') {
      const nextWeek = addWeeks(startOfWeek(value.referenceDate, { weekStartsOn: 1 }), 1)
      onChange({
        mode: 'WEEK',
        referenceDate: startOfMonth(nextWeek),
        weekIndex: getWeekOfMonth(nextWeek, { weekStartsOn: 1 })
      })
    } else {
      onChange({ ...value, referenceDate: addDays(value.referenceDate, 1) })
    }
  }

  const getDisplayLabel = () => {
    if (value.mode === 'MONTH') return format(value.referenceDate, "MMMM yyyy")
    if (value.mode === 'WEEK') return `${format(value.referenceDate, "MMM yyyy")} - Week ${value.weekIndex}`
    return format(value.referenceDate, "MMM d, yyyy")
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <div className={cn("flex items-center bg-black/40 border border-white/10 rounded-xl shadow-inner overflow-hidden", className)}>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-none border-r border-white/5 hover:bg-white/5"
          onClick={handleQuickPrev}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            className="h-10 px-4 rounded-none font-black text-[10px] uppercase tracking-widest flex-1 min-w-[180px] hover:bg-white/5 transition-all"
          >
            <CalendarIcon className="w-3.5 h-3.5 mr-2 text-primary" />
            {getDisplayLabel()}
          </Button>
        </PopoverTrigger>

        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-none border-l border-white/5 hover:bg-white/5"
          onClick={handleQuickNext}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      <PopoverContent align="end" className="w-80 p-4 apple-glass-darker border-white/10 rounded-2xl shadow-3xl z-[1000]">
        {/* Navigation Header */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-lg hover:bg-white/5 border-white/10"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setNavDate(subMonths(navDate, 1));
            }}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="font-black text-[10px] uppercase tracking-[0.2em] text-primary">
            {format(navDate, "MMMM yyyy")}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-lg hover:bg-white/5 border-white/10"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setNavDate(addMonths(navDate, 1));
            }}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <Tabs defaultValue={value.mode} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4 bg-white/5 p-1 rounded-xl">
            <TabsTrigger value="DAY" className="text-[9px] font-black uppercase tracking-widest rounded-lg transition-all">Day</TabsTrigger>
            <TabsTrigger value="WEEK" className="text-[9px] font-black uppercase tracking-widest rounded-lg transition-all">Week</TabsTrigger>
            <TabsTrigger value="MONTH" className="text-[9px] font-black uppercase tracking-widest rounded-lg transition-all">Month</TabsTrigger>
          </TabsList>

          <TabsContent value="DAY" className="mt-0 outline-none">
            <Calendar
              mode="single"
              selected={value.mode === 'DAY' ? value.referenceDate : undefined}
              month={navDate}
              onMonthChange={setNavDate}
              onSelect={(d) => {
                if (d) {
                  onChange({ mode: 'DAY', referenceDate: d })
                  setIsOpen(false)
                }
              }}
              className="rounded-xl border border-white/5 bg-black/20 p-2"
            />
          </TabsContent>

          <TabsContent value="WEEK" className="mt-0 outline-none space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {[1, 2, 3, 4, 5].map((weekNum) => {
                 const weeksInNavMonth = getWeeksInMonth(navDate, { weekStartsOn: 1 })
                 const isDisabled = weekNum > weeksInNavMonth

                 return (
                   <Button
                     key={weekNum}
                     variant="outline"
                     disabled={isDisabled}
                     onClick={() => {
                        onChange({ mode: 'WEEK', referenceDate: startOfMonth(navDate), weekIndex: weekNum })
                        setIsOpen(false)
                     }}
                     className={cn(
                        "h-11 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                        value.mode === 'WEEK' && value.weekIndex === weekNum && format(value.referenceDate, 'yyyy-MM') === format(navDate, 'yyyy-MM')
                          ? "bg-primary text-white border-none shadow-lg shadow-primary/20"
                          : "bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10",
                        isDisabled && "opacity-20 cursor-not-allowed"
                     )}
                   >
                     Week {weekNum}
                   </Button>
                 )
              })}
            </div>
            <p className="text-[8px] font-bold text-muted-foreground uppercase text-center opacity-40">Select week within {format(navDate, "MMMM")}</p>
          </TabsContent>

          <TabsContent value="MONTH" className="mt-0 outline-none">
             <Button
               className="w-full h-12 rounded-xl bg-primary text-white font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-primary/20 m3-interactive"
               onClick={() => {
                 onChange({ mode: 'MONTH', referenceDate: startOfMonth(navDate) })
                 setIsOpen(false)
               }}
             >
               Select Entire {format(navDate, "MMMM")}
             </Button>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  )
}
