"use client"

import React, { useMemo, useState } from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Users, ChevronDown, Check, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { UserProfile } from "@/lib/types"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

interface StaffGroupMultiSelectProps {
  staffList: UserProfile[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
  className?: string
}

export function StaffGroupMultiSelect({ staffList, selectedIds, onChange, className }: StaffGroupMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false)

  const groups = useMemo(() => {
    const map: Record<string, UserProfile[]> = {
      "Operations": [],
      "HR Team": [],
      "Finance Team": []
    }

    staffList.forEach(s => {
      const dept = s.departmentName || "Operations" // Default to Operations if unassigned
      if (!map[dept]) map[dept] = []
      map[dept].push(s)
    })

    return map
  }, [staffList])

  const toggleStaff = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(i => i !== id))
    } else {
      onChange([...selectedIds, id])
    }
  }

  const toggleGroup = (dept: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const groupIds = groups[dept].map(s => s.id)
    const allSelected = groupIds.every(id => selectedIds.includes(id))

    if (allSelected) {
      onChange(selectedIds.filter(id => !groupIds.includes(id)))
    } else {
      const newIds = Array.from(new Set([...selectedIds, ...groupIds]))
      onChange(newIds)
    }
  }

  const selectAll = () => onChange(staffList.map(s => s.id))
  const clearAll = () => onChange([])

  const getLabel = () => {
    if (selectedIds.length === 0) return "Select Personnel"
    if (selectedIds.length === staffList.length) return "All Staff"
    const activeDept = Object.keys(groups).find(dept =>
        groups[dept].every(s => selectedIds.includes(s.id)) &&
        selectedIds.length === groups[dept].length
    )
    if (activeDept) return activeDept.toUpperCase()
    return `${selectedIds.length} Personnel`
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className={cn(
            "w-[220px] h-12 rounded-2xl bg-black/40 border-white/10 text-[10px] font-black uppercase tracking-widest hover:border-primary/50 transition-all shadow-inner justify-between px-4 group",
            className
          )}
        >
          <div className="flex items-center gap-2 truncate">
            <Users className="w-3.5 h-3.5 text-primary group-hover:scale-110 transition-transform" />
            <span className="truncate">{getLabel()}</span>
          </div>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-[300px] p-0 apple-glass-darker border-white/10 rounded-[2rem] shadow-3xl z-[1000] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-5 border-b border-white/5 flex items-center justify-between bg-white/5">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Target Matrix</span>
            <div className="flex gap-4">
                <button onClick={selectAll} className="text-[9px] font-black uppercase text-primary hover:text-white transition-colors">Select All</button>
                <button onClick={clearAll} className="text-[9px] font-black uppercase text-rose-500 hover:text-rose-400 transition-colors">Clear</button>
            </div>
        </div>

        <ScrollArea className="h-[450px]">
          <div className="p-3">
            <Accordion type="multiple" className="w-full space-y-2">
                {Object.entries(groups).map(([dept, members]) => {
                if (members.length === 0) return null;
                const groupIds = members.map(s => s.id);
                const isGroupSelected = groupIds.every(id => selectedIds.includes(id));
                const isSomeSelected = groupIds.some(id => selectedIds.includes(id)) && !isGroupSelected;

                return (
                    <AccordionItem key={dept} value={dept} className="border border-white/5 bg-white/[0.02] rounded-2xl overflow-hidden">
                        <div className="flex items-center w-full pr-4 group/row">
                            <AccordionTrigger className="hover:no-underline py-4 px-4 flex-1 text-left">
                                <div className="flex items-center gap-3">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-white group-hover:text-primary transition-colors">{dept}</span>
                                    <Badge variant="outline" className="text-[8px] font-bold border-white/10 opacity-30">{members.length}</Badge>
                                </div>
                            </AccordionTrigger>
                            <div
                                className={cn(
                                    "w-5 h-5 rounded-lg border border-white/10 flex items-center justify-center cursor-pointer transition-all hover:border-primary/50",
                                    isGroupSelected ? "bg-primary border-primary" : "bg-black/20"
                                )}
                                onClick={(e) => toggleGroup(dept, e)}
                            >
                                {isGroupSelected && <Check className="w-3 h-3 text-white" />}
                                {isSomeSelected && <div className="w-1.5 h-1.5 bg-primary rounded-sm animate-pulse" />}
                            </div>
                        </div>

                        <AccordionContent className="pb-4 pt-1 bg-black/20">
                            <div className="space-y-1 px-3">
                                {members.map(staff => (
                                <div
                                    key={staff.id}
                                    className="flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-white/5 cursor-pointer group/staff transition-colors"
                                    onClick={() => toggleStaff(staff.id)}
                                >
                                    <div className={cn(
                                        "w-4 h-4 rounded-md border border-white/10 flex items-center justify-center transition-all",
                                        selectedIds.includes(staff.id) ? "bg-primary/20 border-primary" : "group-hover/staff:border-white/30"
                                    )}>
                                        {selectedIds.includes(staff.id) && <Check className="w-3 h-3 text-primary" />}
                                    </div>
                                    <span className={cn(
                                        "text-[10px] font-bold tracking-tight transition-colors",
                                        selectedIds.includes(staff.id) ? "text-white" : "text-muted-foreground group-hover/staff:text-foreground"
                                    )}>
                                        {staff.fullName}
                                    </span>
                                </div>
                                ))}
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                );
                })}
            </Accordion>
          </div>
        </ScrollArea>

        <div className="p-4 border-t border-white/5 bg-white/5">
            <Button
                onClick={() => setIsOpen(false)}
                className="w-full h-11 rounded-xl bg-primary text-white font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20 m3-interactive"
            >
                Authorize Filter
            </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
