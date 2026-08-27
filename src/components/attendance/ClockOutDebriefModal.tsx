"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ClipboardList, ListTodo } from "lucide-react";
import type { Task } from "@/lib/types";
import { OptionalEODVotingNudge } from "../reports/OptionalEODVotingNudge";

interface ClockOutDebriefModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  activeTasks: Task[];
  onConfirmClockOut: (data: { manualReport: string; attachedTaskId?: string }) => void;
  isSubmitting: boolean;
}

export function ClockOutDebriefModal({
  isOpen,
  onOpenChange,
  activeTasks,
  onConfirmClockOut,
  isSubmitting
}: ClockOutDebriefModalProps) {
  const [report, setReport] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState<string>("NONE");

  const handleSubmit = () => {
    if (report.trim().length === 0) return;
    onConfirmClockOut({
        manualReport: report,
        attachedTaskId: selectedTaskId === "NONE" ? undefined : selectedTaskId
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[550px] apple-glass-darker border-none rounded-[2rem] p-8"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="space-y-4">
          <div className="mx-auto p-4 rounded-full bg-primary/10 w-fit">
            <ClipboardList className="h-8 w-8 text-primary" />
          </div>
          <div className="text-center">
            <DialogTitle className="text-2xl font-black font-headline tracking-tighter uppercase">End of Day Debrief</DialogTitle>
            <DialogDescription className="text-xs font-bold uppercase tracking-widest mt-2 leading-relaxed opacity-60">
              Operational completion requires a summary of daily achievements and blockers.
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-6">
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-widest opacity-40 flex items-center gap-2">
                Mission Summary (Required)
            </label>
            <Textarea
              value={report}
              onChange={(e) => setReport(e.target.value)}
              className="min-h-[150px] bg-background/50 border-white/5 rounded-2xl p-4 text-sm font-medium resize-none focus-visible:ring-primary/20"
              placeholder="What did you accomplish during this duty cycle?..."
              required
            />
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-widest opacity-40 flex items-center gap-2">
                <ListTodo className="h-3 w-3" /> Link Active Mission (Optional)
            </label>
            <Select value={selectedTaskId} onValueChange={setSelectedTaskId}>
                <SelectTrigger className="h-12 bg-background/50 border-white/5 rounded-xl">
                    <SelectValue placeholder="Select a task to associate..." />
                </SelectTrigger>
                <SelectContent className="apple-glass-darker border-none">
                    <SelectItem value="NONE" className="text-xs font-bold">-- No Task Association --</SelectItem>
                    {activeTasks
                        .filter(t => t.id && t.id.trim() !== "")
                        .map(task => (
                            <SelectItem key={task.id} value={task.id} className="text-xs font-bold">
                                {task.serialNo}: {task.title}
                            </SelectItem>
                        ))
                    }
                </SelectContent>
            </Select>
          </div>
        </div>

        <OptionalEODVotingNudge onCloseModal={() => onOpenChange(false)} />

        <DialogFooter className="flex-col sm:flex-col gap-3 mt-2">
          <Button
            onClick={handleSubmit}
            disabled={report.trim().length < 10 || isSubmitting}
            className="w-full h-14 bg-primary text-primary-foreground rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95"
          >
            {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Authorize Clock Out"}
          </Button>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="w-full h-10 border-none text-[10px] font-black uppercase tracking-widest opacity-40 hover:opacity-100 hover:bg-transparent transition-all"
          >
            Abort Command
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
