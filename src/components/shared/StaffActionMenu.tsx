"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { useUser, useDoc, useMemoFirebase, useFirestore } from "@/firebase"
import { doc, updateDoc, serverTimestamp, getDocs, collection, query, where, orderBy, limit } from "firebase/firestore"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  MoreVertical,
  AlertCircle,
  Clock,
  UserCog,
  Award,
  Trophy,
  Target,
  Calendar,
  FileText,
  ExternalLink,
  History as HistoryIcon,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Timer,
  Loader2,
  Ban,
  UserX
} from "lucide-react"
import { uiEmitter } from "@/lib/ui-emitter"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { useStaffWeeklyHistory } from "@/hooks/useStaffWeeklyHistory"
import { useStaffWeeklyReports } from "@/hooks/useStaffWeeklyReports"
import { FileSearch } from "lucide-react"
import {
    startOfWeek,
    endOfWeek,
    format,
    subWeeks,
    addWeeks,
    eachDayOfInterval,
    parseISO,
    isSameDay,
    isWeekend
} from "date-fns"
import { formatDuration } from "@/lib/formatters"
import type { UserProfile, Attendance, Task, LeaveRequest } from "@/lib/types"
import { useQuery } from "@tanstack/react-query"

import { useRecapSummary, RecapMode } from "@/hooks/useRecapSummary"
import { PerformanceRecapModal } from "../reports/PerformanceRecapModal"

interface StaffActionMenuProps {
    staff: {
        id: string;
        name: string;
        status?: string;
        isArchived?: boolean;
    };
    currentLog?: Attendance | null;
    orgId?: string;
}

type ModalType = 'LATENESS' | 'HISTORY' | 'POINTS' | 'LEAVE' | 'REPORTS' | 'DISABLE' | 'REMOVE' | 'PERFORMANCE_RECAP';

/**
 * Reusable Action Menu for staff-related operations.
 * Centralizes administrative and tactical routing for personnel management via Modals.
 */
export function StaffActionMenu({ staff, currentLog, orgId: propOrgId }: StaffActionMenuProps) {
  const router = useRouter()
  const { user } = useUser()
  const firestore = useFirestore()
  const { toast } = useToast()

  const userProfileRef = useMemoFirebase(() =>
    firestore && user ? doc(firestore, 'users', user.uid) : null,
  [firestore, user])
  const { data: currentUserProfile } = useDoc<UserProfile>(userProfileRef)

  const orgId = propOrgId || currentUserProfile?.orgId

  const [activeModal, setActiveModal] = useState<ModalType | null>(null)
  const [historyDate, setHistoryDate] = useState<Date>(new Date())
  const [confirmName, setConfirmName] = useState("")
  const [isUpdating, setIsUpdating] = useState(false)

  // LAZY LOAD QUERY: Only runs when the History modal is opened
  const { data: historyLogs, isLoading: isLoadingHistory } = useQuery({
    queryKey: ['staffRecentHistory', staff?.id, orgId],
    queryFn: async () => {
      if (!firestore || !staff?.id || !orgId) return [];
      const q = query(
        collection(firestore, 'attendance'),
        where('orgId', '==', orgId),
        where('userId', '==', staff.id),
        orderBy('clockIn', 'desc'),
        limit(5)
      );
      const snap = await getDocs(q);
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Attendance));
    },
    enabled: activeModal === 'HISTORY' && !!staff?.id && !!orgId,
  })

  const [recapMode, setRecapMode] = useState<RecapMode>('MONTHLY');
  const [recapDate, setRecapDate] = useState<Date>(new Date());

  // FETCH DATA FOR RECAP
  const { data: recapAttendance } = useQuery({
    queryKey: ['staffRecapAttendance', staff?.id, orgId, recapMode, recapDate.toISOString()],
    queryFn: async () => {
      if (!firestore || !staff?.id || !orgId) return [];
      const q = query(
        collection(firestore, 'attendance'),
        where('orgId', '==', orgId),
        where('userId', '==', staff.id)
        // We'll filter by date client-side in the hook for now to keep it simple,
        // or we could add more specific queries here.
      );
      const snap = await getDocs(q);
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Attendance));
    },
    enabled: activeModal === 'PERFORMANCE_RECAP' && !!staff?.id && !!orgId,
  });

  const { data: recapTasks } = useQuery({
    queryKey: ['staffRecapTasks', staff?.id, orgId],
    queryFn: async () => {
      if (!firestore || !staff?.id || !orgId) return [];
      const q = query(
        collection(firestore, 'tasks'),
        where('orgId', '==', orgId),
        where('assignedTo', '==', staff.id)
      );
      const snap = await getDocs(q);
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
    },
    enabled: activeModal === 'PERFORMANCE_RECAP' && !!staff?.id && !!orgId,
  });

  const { data: recapLeaves } = useQuery({
    queryKey: ['staffRecapLeaves', staff?.id, orgId],
    queryFn: async () => {
      if (!firestore || !staff?.id || !orgId) return [];
      const q = query(
        collection(firestore, 'leave_requests'),
        where('orgId', '==', orgId),
        where('userId', '==', staff.id)
      );
      const snap = await getDocs(q);
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as LeaveRequest));
    },
    enabled: activeModal === 'PERFORMANCE_RECAP' && !!staff?.id && !!orgId,
  });

  const performanceRecapData = useRecapSummary(
      staff.id,
      recapMode,
      recapDate,
      recapAttendance || [],
      recapTasks || [],
      [], // reports are in attendanceLogs
      recapLeaves || []
  );

  // Failsafe for Radix UI body-lock freeze
  React.useEffect(() => {
    return () => {
      document.body.style.pointerEvents = "";
    };
  }, []);

  const handleOpenProfile = () => {
    uiEmitter.emit('open-staff-profile-dialog' as any, { userId: staff.id });
  };

  const handleOpenRecognition = () => {
    uiEmitter.emit('open-recognition-dialog' as any, { userId: staff.id });
  };

  const renderModalContent = () => {
    switch (activeModal) {
      case 'LATENESS':
        return (
          <>
            <DialogHeader>
              <DialogTitle className="text-rose-500 flex items-center gap-2 font-black uppercase tracking-tighter">
                <AlertCircle className="w-5 h-5" /> Lateness Justification: {staff?.name}
              </DialogTitle>
              <DialogDescription className="text-[10px] font-bold uppercase tracking-widest opacity-60">Review submitted arrival reason.</DialogDescription>
            </DialogHeader>
            <div className="p-6 bg-rose-500/5 rounded-2xl border border-rose-500/10 text-sm mt-4 italic font-medium leading-relaxed shadow-inner text-foreground">
              {currentLog?.lateReason ? `"${currentLog.lateReason}"` : "No lateness justification submitted for this operational cycle."}
            </div>
            <DialogFooter className="mt-8">
              <Button variant="outline" onClick={() => setActiveModal(null)} className="w-full rounded-xl h-11 px-6 font-black uppercase text-[10px] tracking-widest border-white/10 hover:bg-white/5">Close Audit</Button>
            </DialogFooter>
          </>
        )
      case 'HISTORY':
        return (
          <>
            <DialogHeader className="pb-4 border-b border-white/5">
                <DialogTitle className="flex items-center gap-2 font-black uppercase tracking-tighter">
                    <Clock className="w-5 h-5 text-primary" /> Recent Performance History
                </DialogTitle>
                <DialogDescription className="text-[10px] font-bold uppercase tracking-widest opacity-60">Last 5 active cycles for {staff?.name}.</DialogDescription>
            </DialogHeader>

            <div className="py-6 space-y-3">
               {isLoadingHistory ? (
                   <div className="h-48 flex items-center justify-center">
                       <Loader2 className="w-8 h-8 animate-spin text-primary opacity-20" />
                   </div>
               ) : historyLogs && historyLogs.length > 0 ? (
                    <div className="space-y-2">
                        {historyLogs.map((log, idx) => (
                            <div key={log.id || idx} className="p-4 flex items-center justify-between bg-white/[0.03] border border-white/5 rounded-2xl group hover:bg-white/5 transition-all">
                                <div className="flex flex-col">
                                    <span className="text-xs font-black text-white">{format(new Date(log.date + 'T00:00:00'), 'EEEE, MMM dd')}</span>
                                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5 opacity-40">{log.location}</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <Badge variant="outline" className={cn(
                                        "text-[8px] font-black uppercase px-2 py-0.5 border-none",
                                        log.status === 'APPROVED' ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
                                    )}>
                                        {log.remarks?.includes('LATE') ? 'LATE' : 'ON-TIME'}
                                    </Badge>
                                    <span className="text-xs font-mono font-black text-primary w-12 text-right">
                                        {log.duration ? `${(log.duration / 3600).toFixed(1)}h` : '0.0h'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
               ) : (
                   <div className="py-12 flex flex-col items-center justify-center text-center opacity-20">
                       <HistoryIcon className="w-12 h-12 mb-4" />
                       <p className="text-[10px] font-black uppercase tracking-widest">No Historical Data Identified</p>
                   </div>
               )}
            </div>

            <DialogFooter className="mt-4 pt-4 border-t border-white/5">
               <Button onClick={() => { setActiveModal(null); router.push(`/staff/attendance?userId=${staff?.id}`); }} className="w-full rounded-xl h-12 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20 bg-primary hover:bg-primary/90 text-white m3-interactive">
                  View Full Operational Ledger ↗
               </Button>
            </DialogFooter>
          </>
        )
      case 'POINTS':
        return (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-black uppercase tracking-tighter">
                <Target className="w-5 h-5 text-amber-500" /> Performance Standing
              </DialogTitle>
              <DialogDescription className="text-[10px] font-bold uppercase tracking-widest opacity-60">Manual adjustment for {staff?.name}.</DialogDescription>
            </DialogHeader>
            <div className="p-6 bg-amber-500/5 rounded-2xl border border-amber-500/10 mt-4 space-y-4">
                <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Current Standing</span>
                    <span className="text-2xl font-black font-headline text-amber-500">748 <span className="text-[10px] opacity-40">PTS</span></span>
                </div>
                <div className="h-px bg-white/5" />
                <p className="text-[9px] font-medium leading-relaxed italic text-muted-foreground opacity-60">Points are automatically calculated via operational telemetry. Manual overrides should only be performed for sanctioned awards or disciplinary deductions.</p>
            </div>
            <DialogFooter className="mt-8">
               <Button onClick={() => router.push(`/reports?tab=team-performance&userId=${staff?.id}`)} className="w-full rounded-xl h-11 font-black uppercase text-[10px] tracking-widest bg-amber-500 text-black hover:bg-amber-600">
                  Open Performance Manager
               </Button>
            </DialogFooter>
          </>
        )
      case 'LEAVE':
        return (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-black uppercase tracking-tighter">
                <Calendar className="w-5 h-5 text-primary" /> Leave Allocation
              </DialogTitle>
              <DialogDescription className="text-[10px] font-bold uppercase tracking-widest opacity-60">Authorized cycle for {staff?.name}.</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-center space-y-1">
                    <p className="text-[8px] font-black uppercase text-muted-foreground">Days Used</p>
                    <p className="text-xl font-black font-headline">04</p>
                </div>
                <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 text-center space-y-1">
                    <p className="text-[8px] font-black uppercase text-primary">Remaining</p>
                    <p className="text-xl font-black font-headline text-primary">17</p>
                </div>
            </div>
            <DialogFooter className="mt-8">
               <Button onClick={() => router.push(`/staff/leave?userId=${staff?.id}`)} className="w-full rounded-xl h-11 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20">
                  Manage Leave Requests ↗
               </Button>
            </DialogFooter>
          </>
        )
      case 'REPORTS':
        const rStart = startOfWeek(historyDate, { weekStartsOn: 1 });
        const rEnd = endOfWeek(historyDate, { weekStartsOn: 1 });
        const rDays = eachDayOfInterval({ start: rStart, end: rEnd }).filter(d => !isWeekend(d));

        return (
          <>
            <DialogHeader className="pb-4 border-b border-white/5">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <DialogTitle className="flex items-center gap-2 font-black uppercase tracking-tighter">
                        <FileText className="w-5 h-5 text-primary" /> Daily Reports
                    </DialogTitle>
                    <DialogDescription className="text-[10px] font-bold uppercase tracking-widest opacity-60">Week of {format(rStart, 'MMM dd')} - {format(rEnd, 'MMM dd, yyyy')}</DialogDescription>
                </div>
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-white/5" onClick={() => setHistoryDate(prev => subWeeks(prev, 1))}>
                        <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-white/5" onClick={() => setHistoryDate(new Date())}>
                        <RotateCcw className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-white/5" onClick={() => setHistoryDate(prev => addWeeks(prev, 1))}>
                        <ChevronRight className="w-4 h-4" />
                    </Button>
                </div>
              </div>
            </DialogHeader>

            <div className="py-4 space-y-4 max-h-[50vh] overflow-y-auto custom-scrollbar [scrollbar-gutter:stable] pr-2">
               {/* Note: In a real app, this should probably also be lazy-loaded via react-query if reports are many */}
               <div className="space-y-3">
                   {rDays.map((day, idx) => {
                       const dateStr = format(day, 'yyyy-MM-dd');
                       const report = currentLog?.date === dateStr ? { content: currentLog.eodReport } : null; // This is simplistic, would need real reportsData

                       return (
                           <div key={idx} className="p-4 rounded-2xl border border-white/5 bg-black/20 hover:bg-white/5 transition-all">
                               <div className="flex items-center justify-between mb-2">
                                   <div className="flex flex-col">
                                       <span className="text-[10px] font-black uppercase text-primary">{format(day, 'EEEE')}</span>
                                       <span className="text-[8px] font-bold opacity-40 uppercase tracking-widest">{format(day, 'MMM dd, yyyy')}</span>
                                   </div>
                               </div>

                               {report?.content ? (
                                   <p className="text-xs font-medium leading-relaxed italic opacity-80 line-clamp-3">
                                       "{report.content}"
                                   </p>
                               ) : (
                                   <div className="py-2 flex items-center justify-center border border-dashed border-white/5 rounded-xl opacity-20">
                                       <span className="text-[8px] font-black uppercase tracking-widest">No Intelligence Filed</span>
                                   </div>
                               )}
                           </div>
                       );
                   })}
               </div>
            </div>

            <DialogFooter className="mt-4 pt-4 border-t border-white/5">
               <Button variant="ghost" onClick={() => router.push(`/reports?tab=team-reports&userId=${staff?.id}`)} className="w-full rounded-xl h-10 font-black uppercase text-[9px] tracking-widest hover:bg-primary/10 hover:text-primary transition-all">
                  Audit Activity Feed ↗
               </Button>
            </DialogFooter>
          </>
        )
      case 'DISABLE':
        const isDisabled = staff?.status === 'DISABLED'
        return (
          <>
            <DialogHeader>
              <DialogTitle className="text-orange-500 flex items-center gap-2 font-black uppercase tracking-tighter">
                <Ban className="w-5 h-5" /> {isDisabled ? 'Enable' : 'Disable'} Access: {staff?.name}
              </DialogTitle>
              <DialogDescription className="text-xs font-bold uppercase tracking-widest opacity-60">
                {isDisabled
                  ? "This will restore the user's access to the dashboard and allow them to clock in."
                  : "This will immediately revoke access. The user will be logged out and blocked from entering the system."}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-8 flex gap-3">
              <Button variant="outline" onClick={() => setActiveModal(null)} className="rounded-xl h-11 px-6 font-black uppercase text-[10px] tracking-widest border-white/10 hover:bg-white/5">Cancel</Button>
              <Button
                disabled={isUpdating}
                className={cn(
                  "rounded-xl h-11 px-6 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-orange-500/20",
                  isDisabled ? "bg-emerald-600 hover:bg-emerald-700" : "bg-orange-600 hover:bg-orange-700"
                )}
                onClick={async () => {
                  if (!firestore) return;
                  setIsUpdating(true);
                  try {
                    await updateDoc(doc(firestore, 'users', staff.id), {
                      status: isDisabled ? 'ACTIVE' : 'DISABLED',
                      accessRevokedAt: isDisabled ? null : serverTimestamp()
                    });
                    toast({ title: "Access Updated", description: `${staff.name} is now ${isDisabled ? 'Active' : 'Disabled'}.` });
                    setActiveModal(null);
                  } catch (e: any) {
                    toast({ variant: 'destructive', title: "Update Failed", description: e.message });
                  } finally {
                    setIsUpdating(false);
                  }
                }}
              >
                {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : `Confirm ${isDisabled ? 'Enable' : 'Disable'}`}
              </Button>
            </DialogFooter>
          </>
        )
      case 'REMOVE':
        const isMatch = confirmName.trim().toLowerCase() === staff?.name?.trim().toLowerCase()
        return (
          <>
            <DialogHeader>
              <DialogTitle className="text-rose-500 flex items-center gap-2 font-black uppercase tracking-tighter">
                <UserX className="w-5 h-5" /> Remove {staff?.name}
              </DialogTitle>
              <DialogDescription className="text-xs font-bold uppercase tracking-widest opacity-60">
                This action will permanently revoke access and hide this user from the active directory. Historical data will be preserved.
              </DialogDescription>
            </DialogHeader>
            <div className="bg-rose-500/10 border border-rose-500/30 p-5 rounded-2xl mt-4 space-y-4">
              <p className="text-xs font-black text-rose-500 uppercase tracking-widest">Warning: This action is destructive.</p>
              <div className="space-y-2">
                <p className="text-[10px] text-muted-foreground uppercase font-bold opacity-60">To confirm, please type <strong className="text-foreground">{staff?.name}</strong> below.</p>
                <Input
                  value={confirmName}
                  onChange={(e) => setConfirmName(e.target.value)}
                  placeholder={staff?.name}
                  className="bg-black/20 border-white/5 rounded-xl h-11 text-sm focus:ring-rose-500 text-foreground"
                />
              </div>
            </div>
            <DialogFooter className="mt-8 flex gap-3">
              <Button variant="outline" onClick={() => { setActiveModal(null); setConfirmName(""); }} className="rounded-xl h-11 px-6 font-black uppercase text-[10px] tracking-widest border-white/10 hover:bg-white/5">Cancel</Button>
              <Button
                variant="destructive"
                disabled={!isMatch || isUpdating}
                className="rounded-xl h-11 px-6 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-rose-500/20"
                onClick={async () => {
                  if (!firestore) return;
                  setIsUpdating(true);
                  try {
                    await updateDoc(doc(firestore, 'users', staff.id), {
                      isArchived: true,
                      status: 'DISABLED',
                      archivedAt: serverTimestamp()
                    });
                    toast({ title: "User Removed", description: `${staff.name} has been archived.` });
                    setActiveModal(null);
                    setConfirmName("");
                  } catch (e: any) {
                    toast({ variant: 'destructive', title: "Removal Failed", description: e.message });
                  } finally {
                    setIsUpdating(false);
                  }
                }}
              >
                {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Removal"}
              </Button>
            </DialogFooter>
          </>
        )
      default:
        return null
    }
  }

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-secondary/20 hover:text-primary transition-colors rounded-lg">
            <span className="sr-only">Open menu</span>
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56 apple-glass-darker border-white/5 shadow-2xl rounded-2xl p-1.5 z-[1000]">
          <DropdownMenuLabel className="px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
            Management: {staff?.name || "Staff"}
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-white/5 mx-1" />

          {/* CONDITIONAL/WARNING ACTION */}
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setActiveModal('LATENESS');
            }}
            className="flex items-center px-3 py-2.5 text-xs font-bold text-rose-500 focus:text-rose-500 focus:bg-rose-500/10 cursor-pointer rounded-xl transition-colors"
          >
            <AlertCircle className="mr-3 h-4 w-4 shrink-0" />
            <span className="uppercase tracking-tighter">Lateness Reason</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator className="bg-white/5 mx-1" />

          {/* STANDARD ACTIONS */}
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setActiveModal('HISTORY');
            }}
            className="flex items-center px-3 py-2.5 text-xs font-bold text-foreground focus:bg-primary/10 focus:text-primary cursor-pointer rounded-xl transition-colors group"
          >
            <Clock className="mr-3 h-4 w-4 shrink-0 opacity-40 group-focus:opacity-100" />
            <span className="uppercase tracking-tighter">View History</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setActiveModal('PERFORMANCE_RECAP');
            }}
            className="flex items-center px-3 py-2.5 text-xs font-bold text-foreground focus:bg-primary/10 focus:text-primary cursor-pointer rounded-xl transition-colors group"
          >
            <Trophy className="mr-3 h-4 w-4 shrink-0 opacity-40 group-focus:opacity-100" />
            <span className="uppercase tracking-tighter">Performance Recap</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              handleOpenProfile();
            }}
            className="flex items-center px-3 py-2.5 text-xs font-bold text-foreground focus:bg-primary/10 focus:text-primary cursor-pointer rounded-xl transition-colors group"
          >
            <UserCog className="mr-3 h-4 w-4 shrink-0 opacity-40 group-focus:opacity-100" />
            <span className="uppercase tracking-tighter">Edit Profile</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              handleOpenRecognition();
            }}
            className="flex items-center px-3 py-2.5 text-xs font-bold text-foreground focus:bg-primary/10 focus:text-primary cursor-pointer rounded-xl transition-colors group"
          >
            <Award className="mr-3 h-4 w-4 shrink-0 opacity-40 group-focus:opacity-100" />
            <span className="uppercase tracking-tighter">Give Recognition</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setActiveModal('POINTS');
            }}
            className="flex items-center px-3 py-2.5 text-xs font-bold text-foreground focus:bg-primary/10 focus:text-primary cursor-pointer rounded-xl transition-colors group"
          >
            <Target className="mr-3 h-4 w-4 shrink-0 opacity-40 group-focus:opacity-100" />
            <span className="uppercase tracking-tighter">Edit Points</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator className="bg-white/5 mx-1" />

          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setActiveModal('LEAVE');
            }}
            className="flex items-center px-3 py-2.5 text-xs font-bold text-foreground focus:bg-primary/10 focus:text-primary cursor-pointer rounded-xl transition-colors group"
          >
            <Calendar className="mr-3 h-4 w-4 shrink-0 opacity-40 group-focus:opacity-100" />
            <span className="uppercase tracking-tighter">View Leave</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setActiveModal('REPORTS');
            }}
            className="flex items-center px-3 py-2.5 text-xs font-bold text-foreground focus:bg-primary/10 focus:text-primary cursor-pointer rounded-xl transition-colors group"
          >
            <FileText className="mr-3 h-4 w-4 shrink-0 opacity-40 group-focus:opacity-100" />
            <span className="uppercase tracking-tighter">Review Reports</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator className="bg-white/5 mx-1" />

          <DropdownMenuItem
            onSelect={() => router.push(`/reports?tab=culture&sub=builder&userId=${staff?.id}`)}
            className="flex items-center px-3 py-2 text-xs font-bold text-primary focus:bg-primary/10 focus:text-primary cursor-pointer rounded-xl transition-colors group"
          >
            <FileSearch className="mr-3 h-4 w-4 shrink-0" />
            <span className="uppercase tracking-tighter">Issue Performance Review</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator className="bg-white/5 mx-1" />

          {/* DISABLE ACTION */}
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setActiveModal('DISABLE');
            }}
            className="flex items-center px-3 py-2.5 text-xs font-bold text-orange-500 focus:text-orange-500 focus:bg-orange-500/10 cursor-pointer rounded-xl transition-colors group"
          >
            <Ban className="mr-3 h-4 w-4 shrink-0 opacity-70 group-focus:opacity-100" />
            <span className="uppercase tracking-tighter">{staff?.status === 'DISABLED' ? 'Enable Access' : 'Disable Access'}</span>
          </DropdownMenuItem>

          {/* REMOVE ACTION */}
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setActiveModal('REMOVE');
            }}
            className="flex items-center px-3 py-2.5 text-xs font-bold text-red-500 focus:text-red-500 focus:bg-red-500/10 cursor-pointer rounded-xl transition-colors group"
          >
            <UserX className="mr-3 h-4 w-4 shrink-0 opacity-70 group-focus:opacity-100" />
            <span className="uppercase tracking-tighter">Remove User</span>
          </DropdownMenuItem>

        </DropdownMenuContent>
      </DropdownMenu>

      {/* THE UNIFIED MODAL COMPONENT */}
      <Dialog open={!!activeModal && activeModal !== 'PERFORMANCE_RECAP'} onOpenChange={(isOpen) => {
        if (!isOpen) {
          setActiveModal(null);
          setConfirmName("");
        }
      }}>
        <DialogContent className="w-[95vw] max-w-[450px] apple-glass-darker border-white/5 shadow-3xl rounded-[2rem] p-8 overflow-hidden z-[2000]">
          {renderModalContent()}
        </DialogContent>
      </Dialog>

      <PerformanceRecapModal
          isOpen={activeModal === 'PERFORMANCE_RECAP'}
          onClose={() => setActiveModal(null)}
          staffName={staff.name}
          summaryData={performanceRecapData}
          mode={recapMode}
          periodLabel={recapMode === 'WEEKLY' ? `Week of ${format(performanceRecapData.dateInterval.start, 'MMM dd, yyyy')}` : format(recapDate, 'MMMM yyyy')}
      />
    </>
  )
}
