"use client"

import React, { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, User, Calendar as CalendarIcon, Clock, ShieldAlert, X } from "lucide-react"
import { useFirestore } from "@/firebase"
import { doc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import type { UserProfile, Attendance, AttendanceStatus, AttendanceRemark } from "@/lib/types"
import { format } from "date-fns"

interface EditAttendanceRecordDialogProps {
  isOpen: boolean;
  onClose: () => void;
  staffList: UserProfile[];
  existingLog?: Attendance | null;
  selectedDate?: Date;
  currentUser: UserProfile;
}

export function EditAttendanceRecordDialog({
  isOpen,
  onClose,
  staffList,
  existingLog,
  selectedDate,
  currentUser
}: EditAttendanceRecordDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [userId, setUserId] = useState<string>("");
  const [date, setDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [clockInTime, setClockInTime] = useState<string>("");
  const [clockOutTime, setClockOutTime] = useState<string>("");
  const [status, setStatus] = useState<AttendanceStatus>("APPROVED");
  const [isLate, setIsLate] = useState<boolean>(false);
  const [editReason, setEditReason] = useState<string>("");

  useEffect(() => {
    if (isOpen) {
      if (existingLog) {
        setUserId(existingLog.userId);
        setDate(existingLog.date);
        setClockInTime(existingLog.clockIn ? format(new Date(existingLog.clockIn), 'HH:mm') : "");
        setClockOutTime(existingLog.clockOut ? format(new Date(existingLog.clockOut), 'HH:mm') : "");
        setStatus(existingLog.status);
        setIsLate(existingLog.remarks?.includes('LATE') || false);
      } else {
        setUserId("");
        setDate(selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
        setClockInTime("");
        setClockOutTime("");
        setStatus("APPROVED");
        setIsLate(false);
      }
      setEditReason("");
    }
  }, [isOpen, existingLog, selectedDate]);

  const handleSubmit = async () => {
    if (!firestore || !userId || !date || (!clockInTime && !clockOutTime) || !editReason) {
        toast({ variant: "destructive", title: "Missing Information", description: "Select personnel, a date, at least one clock time, and provide a reason." });
        return;
    }

    setIsSubmitting(true);
    try {
      const docId = `${userId}_${date}`;
      const logRef = doc(firestore, 'attendance', docId);

      const staff = staffList.find(s => s.id === userId);
      const clockInIso = clockInTime ? new Date(`${date}T${clockInTime}:00`).toISOString() : null;
      const clockOutIso = clockOutTime ? new Date(`${date}T${clockOutTime}:00`).toISOString() : null;
      const effectiveClockIn = clockInIso || existingLog?.clockIn || null;

      if (clockOutIso && !effectiveClockIn) {
        toast({ variant: "destructive", title: "Clock-in Required", description: "A clock-out needs an existing clock-in or a clock-in time in this override." });
        setIsSubmitting(false);
        return;
      }

      const remarks: AttendanceRemark[] = [];
      if (isLate) remarks.push('LATE');

      const payload: any = {
        userId,
        userName: staff?.fullName || "Unknown",
        orgId: currentUser.orgId,
        date,
        ...(clockInIso ? { clockIn: clockInIso } : {}),
        ...(clockOutIso ? { clockOut: clockOutIso } : {}),
        status,
        remarks,
        location: 'OFFICE',
        editedByAdmin: true,
        editReason,
        editedAt: new Date().toISOString(),
        lastUpdatedAt: serverTimestamp(),
      };

      if (clockOutIso && effectiveClockIn) {
          const duration = Math.floor((new Date(clockOutIso).getTime() - new Date(effectiveClockIn).getTime()) / 1000);
          payload.duration = Math.max(0, duration);
      } else if (clockInIso) {
          payload.duration = 0;
      }

      await setDoc(logRef, payload, { merge: true });

      // If departure time is left blank and status is APPROVED, mark user status as ONLINE so staff is active to clock out
      if (clockInIso && !clockOutIso && status === 'APPROVED') {
        const userRef = doc(firestore, 'users', userId);
        await updateDoc(userRef, {
          status: 'ONLINE',
          lastSeen: new Date().toISOString()
        });
      }

      toast({
        title: "Record Synchronized",
        description: clockInIso && clockOutIso
          ? "Arrival and departure telemetry updated successfully."
          : clockOutIso
            ? "Departure time recorded successfully."
            : "Active arrival logged. Personnel can clock out later."
      });
      onClose();
    } catch (error: any) {
      console.error("Override failed", error);
      toast({ variant: "destructive", title: "Override Failed", description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px] apple-glass-darker border-none rounded-[2rem] p-8">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black font-headline tracking-tighter uppercase text-white">
            {existingLog ? 'Edit Tactical Record' : 'Manual Override'}
          </DialogTitle>
          <DialogDescription className="text-[10px] font-bold uppercase tracking-widest opacity-60">
            Administrative intervention for personnel telemetry.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5 py-6">
          {/* PERSONNEL SELECTOR */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Select Unit</label>
            <Select value={userId} onValueChange={setUserId} disabled={!!existingLog}>
              <SelectTrigger className="h-12 bg-black/20 border-white/10 rounded-xl font-bold uppercase text-xs">
                <SelectValue placeholder="Identify Personnel..." />
              </SelectTrigger>
              <SelectContent className="apple-glass-darker border-none rounded-2xl">
                {staffList.map(s => (
                  <SelectItem key={s.id} value={s.id} className="text-xs font-bold uppercase p-3">
                    {s.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* DATE */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Operational Date</label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-12 bg-black/20 border-white/10 rounded-xl font-mono text-xs"
              />
            </div>
            {/* STATUS */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Protocol Status</label>
              <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                <SelectTrigger className="h-12 bg-black/20 border-white/10 rounded-xl font-bold uppercase text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="apple-glass-darker border-none rounded-2xl">
                  <SelectItem value="APPROVED" className="text-xs font-bold uppercase p-3">Authorized</SelectItem>
                  <SelectItem value="PENDING" className="text-xs font-bold uppercase p-3">Awaiting Verification</SelectItem>
                  <SelectItem value="REJECTED" className="text-xs font-bold uppercase p-3">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* CLOCK IN */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Arrival Time</label>
              <Input
                type="time"
                value={clockInTime}
                onChange={(e) => setClockInTime(e.target.value)}
                className="h-12 bg-black/20 border-white/10 rounded-xl font-mono text-xs"
              />
            </div>

            {/* CLOCK OUT */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Departure Time</label>
                {clockOutTime && (
                  <button
                    type="button"
                    onClick={() => setClockOutTime("")}
                    className="text-[8px] font-black uppercase text-amber-500 hover:text-amber-400 flex items-center gap-0.5 transition-colors"
                    title="Clear departure time to keep shift active"
                  >
                    <X className="w-2.5 h-2.5" /> Keep Active
                  </button>
                )}
              </div>
              <Input
                type="time"
                value={clockOutTime}
                onChange={(e) => setClockOutTime(e.target.value)}
                placeholder="--:-- (Active)"
                className="h-12 bg-black/20 border-white/10 rounded-xl font-mono text-xs"
              />
            </div>
          </div>

          <p className="text-[8px] font-bold text-muted-foreground uppercase opacity-60 ml-1 -mt-2">
            Enter either time, or both. A departure-only override requires an existing clock-in.
          </p>

          {/* LATE TOGGLE */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-amber-500/5 border border-amber-500/10">
            <div className="space-y-0.5">
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-500">Lateness Remark</p>
                <p className="text-[8px] font-bold text-muted-foreground uppercase opacity-60">Flag this record for tardiness</p>
            </div>
            <input
                type="checkbox"
                checked={isLate}
                onChange={(e) => setIsLate(e.target.checked)}
                className="h-5 w-5 rounded border-white/10 bg-black/20 text-primary focus:ring-primary/20"
            />
          </div>

          {/* AUDIT REASON */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1 flex gap-1">
              Override Justification <span className="text-rose-500">*</span>
            </label>
            <Textarea
              placeholder="Provide context for this manual entry..."
              value={editReason}
              onChange={(e) => setEditReason(e.target.value)}
              className="min-h-[100px] bg-black/20 border-white/10 rounded-2xl p-4 text-sm font-medium resize-none focus:border-primary/50 transition-all italic"
              required
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !editReason.trim()}
            className="w-full h-14 bg-primary text-primary-foreground rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95"
          >
            {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <ShieldAlert className="mr-2 h-5 w-5" />}
            Commit Record Override
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
