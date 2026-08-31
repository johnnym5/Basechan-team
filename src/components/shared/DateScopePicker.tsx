"use client"
import React, { useState } from "react"
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isSameDay, isAfter } from "date-fns"
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export type ViewScope = 'DAY' | 'WEEK' | 'MONTH'

interface DateScopePickerProps {
  activeDate: Date
  activeScope: ViewScope
  onDateChange: (date: Date) => void
  onScopeChange: (scope: ViewScope) => void
  loggedDates?: string[] // yyyy-MM-dd format
  className?: string
}

export function DateScopePicker({
    activeDate,
    activeScope,
    onDateChange,
    onScopeChange,
    loggedDates = [],
    className
}: DateScopePickerProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Determine current display label
  const getLabel = () => {
    try {
        if (activeScope === 'DAY') return format(activeDate, 'MMM dd, yyyy')
        if (activeScope === 'WEEK') {
            const start = startOfWeek(activeDate, { weekStartsOn: 1 })
            const end = endOfWeek(activeDate, { weekStartsOn: 1 })
            return `${format(start, 'MMM dd')} - ${format(end, 'MMM dd, yyyy')}`
        }
        return format(activeDate, 'MMMM yyyy')
    } catch (e) {
        return "Select Date"
    }
  }

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {/* 1. SCOPE TOGGLE BUTTONS */}
      <div className="flex items-center bg-black/40 border border-white/10 rounded-xl p-1 shadow-inner">
        {(['DAY', 'WEEK', 'MONTH'] as ViewScope[]).map((scope) => (
          <Button
            key={scope}
            size="sm"
            variant={activeScope === scope ? "default" : "ghost"}
            onClick={() => onScopeChange(scope)}
            className={cn(
                "text-[9px] font-black uppercase tracking-widest h-8 px-4 rounded-lg transition-all",
                activeScope === scope
                    ? "bg-primary text-white shadow-lg shadow-primary/20"
                    : "text-muted-foreground hover:text-white hover:bg-white/5"
            )}
          >
            {scope}
          </Button>
        ))}
      </div>

      {/* 2. CALENDAR POPOVER TRIGGER */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="flex items-center gap-3 h-10 px-5 border-white/10 bg-black/20 hover:bg-black/40 hover:border-primary/50 transition-all font-black text-[10px] uppercase tracking-[0.1em] rounded-xl shadow-xl"
          >
            <CalendarIcon className="w-4 h-4 text-primary" />
            <span className="text-slate-200">{getLabel()}</span>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground ml-1" />
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-auto p-4 apple-glass-darker border-white/10 shadow-3xl rounded-[2rem] z-[1000]" align="end">
          <Calendar
            mode="single"
            selected={activeDate}
            onSelect={(date) => {
              if (date) {
                onDateChange(date)
                setIsOpen(false)
              }
            }}
            // Disable future dates
            disabled={(date) => isAfter(date, new Date())}
            // Highlight days with submitted data
            modifiers={{
              hasData: (date) => loggedDates.some(d => isSameDay(new Date(d), date))
            }}
            modifiersClassNames={{
              hasData: "font-black text-primary underline underline-offset-4 decoration-2"
            }}
            className="rounded-xl border-none bg-transparent"
          />
          <div className="pt-4 mt-2 border-t border-white/5 text-[9px] text-muted-foreground text-center font-black uppercase tracking-widest opacity-40">
            {activeScope === 'DAY' && "Click a date to view single day logs"}
            {activeScope === 'WEEK' && "Click any day to select its entire week"}
            {activeScope === 'MONTH' && "Click any day to select its entire month"}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
