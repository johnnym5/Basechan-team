"use client"

import React, { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, ShieldCheck, Loader2, Calendar as CalendarIcon } from "lucide-react"
import { useSystemConfigs } from "@/hooks/useSystemConfigs"
import { useToast } from "@/hooks/use-toast"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

export function AddHolidayDialog() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [date, setDate] = useState<Date>()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { addItem } = useSystemConfigs('global_holidays')
  const { toast } = useToast()

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !date) return

    setIsSubmitting(true)
    try {
      await addItem({
        name: name.trim(),
        date: format(date, 'yyyy-MM-dd'),
        isActive: true
      })
      toast({ title: "Holiday Configured", description: `${name} has been added to the global holiday list.` })
      setName("")
      setDate(undefined)
      setOpen(false)
    } catch (error: any) {
      toast({ variant: "destructive", title: "Configuration Failed", description: error.message })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="h-9 px-4 rounded-xl border-primary/20 bg-primary/5 text-primary hover:bg-primary hover:text-white transition-all text-[10px] font-black uppercase tracking-widest">
          <Plus className="w-3.5 h-3.5 mr-2" /> Add Holiday
        </Button>
      </DialogTrigger>
      <DialogContent className="apple-glass-darker border-none rounded-[2rem] p-8 max-w-md shadow-3xl">
        <DialogHeader className="mb-6">
          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                <CalendarIcon className="w-6 h-6" />
            </div>
            <div>
                <DialogTitle className="text-2xl font-black font-headline tracking-tighter uppercase text-white">Declare Holiday</DialogTitle>
                <DialogDescription className="text-[10px] font-black uppercase tracking-widest opacity-60">Add a public holiday to the system calendar.</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleAdd} className="space-y-6">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase opacity-40 px-1">Holiday Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-black/20 border-white/5 rounded-xl h-12 font-bold uppercase tracking-tight"
              placeholder="e.g. Christmas Day"
              required
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase opacity-40 px-1">Event Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full h-12 justify-start text-left font-normal bg-black/20 border-white/5 rounded-xl",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 border-none shadow-2xl rounded-2xl" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                  className="apple-glass border-none"
                />
              </PopoverContent>
            </Popover>
          </div>

          <DialogFooter className="mt-8 flex gap-3">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="rounded-xl font-black uppercase text-[10px] tracking-widest opacity-40 flex-1">Cancel</Button>
            <Button
              type="submit"
              disabled={isSubmitting || !name.trim() || !date}
              className="h-12 px-8 rounded-xl bg-primary text-white font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20 flex-1"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
              Confirm Holiday
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
