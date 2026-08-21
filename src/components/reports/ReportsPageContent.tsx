'use client';

import { useUser, useDoc, useMemoFirebase, useFirestore, useCollection } from "@/firebase";
import { doc, collection, query, where, getDocs } from 'firebase/firestore';
import type { UserProfile, DailyReport, Attendance, Requisition, Task, LeaveRequest, Nomination, PulseCheck } from '@/lib/types';
import { usePermissions } from '@/hooks/usePermissions';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SubmitDailyReport } from "@/components/reports/SubmitDailyReport";
import { MyDailyReports } from "@/components/reports/MyDailyReports";
import { TeamDailyReports } from "@/components/reports/TeamDailyReports";
import { TeamInsightHub } from "@/components/reports/TeamInsightHub";
import { MyBriefingDashboard } from "@/components/reports/MyBriefingDashboard";
import { AlertArchive } from "@/components/reports/AlertArchive";
import { useState, useEffect, useMemo } from "react";
import { Button } from "../ui/button";
import { Download, FileSpreadsheet, Loader2, Trophy, BarChart3, UserCheck, Heart, ShieldAlert, Award, Zap, History as HistoryIcon } from "lucide-react";
import * as XLSX from 'xlsx';
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ModuleContainer } from "@/components/layout/shell/ModuleContainer";
import { useScrubbedData } from "@/hooks/useScrubbedData";

export function ReportsPageContent({ initialPayload, noWrapper = false }: { initialPayload?: { tab?: string }, noWrapper?: boolean }) {
  const { user: authUser } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  const userProfileRef = useMemoFirebase(() => 
    authUser ? doc(firestore!, "users", authUser.uid) : null,
  [firestore, authUser]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);
  const permissions = usePermissions(userProfile);

  const storageKey = 'reports-view-tab';
  const [activeTab, setActiveTab] = useState('submit');

  useEffect(() => {
    if (activeTab) {
      localStorage.setItem(storageKey, activeTab);
    }
  }, [activeTab]);

  const handleMasterExport = async () => {
    if (!firestore || !userProfile) return;
    setIsExporting(true);
    
    try {
        const orgId = userProfile.orgId;
        
        const qAtt = query(collection(firestore, 'attendance'), where('orgId', '==', orgId));
        const qReq = query(collection(firestore, 'requisitions'), where('orgId', '==', orgId));
        const qTask = query(collection(firestore, 'tasks'), where('orgId', '==', orgId));
        
        const [attSnap, reqSnap, taskSnap] = await Promise.all([
            getDocs(qAtt),
            getDocs(qReq),
            getDocs(qTask)
        ]);

        const wb = XLSX.utils.book_new();

        const attData = attSnap.docs.map(doc => {
            const r = doc.data() as Attendance;
            return {
                Date: r.date,
                Name: r.userName,
                'Clock In': r.clockIn ? format(new Date(r.clockIn), 'p') : 'N/A',
                'Clock Out': r.clockOut ? format(new Date(r.clockOut), 'p') : 'N/A',
                'Worked (Hrs)': ((r.duration || 0) / 3600).toFixed(2),
                'Idle (Hrs)': ((r.idleTime || 0) / 3600).toFixed(2),
                Location: r.location,
                Status: r.status
            };
        });
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(attData), "Attendance");

        const reqData = reqSnap.docs.map(doc => {
            const r = doc.data() as Requisition;
            return {
                Serial: r.serialNo,
                Title: r.title,
                Amount: r.amount,
                Vendor: r.vendorName,
                Status: r.status,CreatedBy: r.creatorName,
                Date: format(new Date(r.createdAt), 'PP')
            };
        });
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(reqData), "Financial Requests");

        const taskData = taskSnap.docs.map(doc => {
            const t = doc.data() as Task;
            return {
                Serial: t.serialNo,
                Title: t.title,
                Assignee: t.assignedToName,
                Priority: t.priority,
                Status: t.status,
                'Est. Hours': t.estimatedHours || 0,
                'Actual Hours': t.actualHours || 0,
                Due: t.dueDate ? format(new Date(t.dueDate), 'PP') : 'N/A'
            };
        });
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(taskData), "Tasks");

        XLSX.writeFile(wb, `Team_Report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
        toast({ title: "Export Complete", description: "Consolidated team data has been downloaded." });
    } catch (e: any) {
        toast({ variant: 'destructive', title: "Export Failed", description: e.message });
    } finally {
        setIsExporting(false);
    }
  }

  // Fetch Staff List
  const staffQuery = useMemoFirebase(() =>
    firestore ? query(collection(firestore, 'users'), where('orgId', '==', userProfile?.orgId || '')) : null
  , [firestore, userProfile?.orgId]);
  const { data: rawStaff } = useCollection<UserProfile>(staffQuery);

  const allTasksQuery = useMemoFirebase(() =>
    firestore ? query(collection(firestore, 'tasks'), where('orgId', '==', userProfile?.orgId || '')) : null
  , [firestore, userProfile?.orgId]);
  const { data: allTasksData } = useCollection<Task>(allTasksQuery);

  const allLeaveQuery = useMemoFirebase(() =>
    firestore ? query(collection(firestore, 'leave_requests'), where('orgId', '==', userProfile?.orgId || '')) : null
  , [firestore, userProfile?.orgId]);
  const { data: allLeaveData } = useCollection<LeaveRequest>(allLeaveQuery);

  const allAttendanceQuery = useMemoFirebase(() =>
    firestore ? query(collection(firestore, 'attendance'), where('orgId', '==', userProfile?.orgId || '')) : null
  , [firestore, userProfile?.orgId]);
  const { data: allAttendance } = useCollection<Attendance>(allAttendanceQuery);

  const allNominationsQuery = useMemoFirebase(() =>
    firestore ? query(collection(firestore, 'nominations'), where('orgId', '==', userProfile?.orgId || ''), where('status', '==', 'APPROVED')) : null
  , [firestore, userProfile?.orgId]);
  const { data: allNominations } = useCollection<Nomination>(allNominationsQuery);

  const allPulseQuery = useMemoFirebase(() =>
    firestore ? query(collection(firestore, 'pulse_checks'), where('orgId', '==', userProfile?.orgId || '')) : null
  , [firestore, userProfile?.orgId]);
  const { data: allPulseData } = useCollection<PulseCheck>(allPulseQuery);

  // --- SCRUB DATA ---
  const {
      activeStaff,
      activeAttendance,
      activeNominations,
      activeTasks,
      activeLeaveRequests
  } = useScrubbedData({
      staffList: rawStaff || undefined,
      attendanceLogs: allAttendance || undefined,
      reportsData: [],
      nominations: allNominations || undefined,
      tasks: allTasksData || undefined,
      leaveRequests: allLeaveData || undefined
  });

  const handleNominationSubmit = async (payload: any) => {
    if (!firestore) return;
    try {
        const nominationBatch = payload.nominations.map((nom: any) => ({
            ...nom,
            orgId: userProfile?.orgId,
            nominatorId: payload.nominatorId,
            nominatorName: payload.nominatorName,
            timestamp: payload.date,
            status: nom.status || 'PENDING',
            additionalNotes: payload.additionalNotes || ""
        }));

        const { addDocumentNonBlocking } = await import('@/firebase');
        const { removeUndefined } = await import('@/lib/utils');

        for (const nomination of nominationBatch) {
            const cleanNomination = removeUndefined(nomination);
            await addDocumentNonBlocking(collection(firestore, 'nominations'), cleanNomination);
        }

        toast({ title: "Recognition Recorded", description: "Your daily recognition star has been dispatched!" });
    } catch (e: any) {
        toast({ variant: 'destructive', title: "Submission Failed", description: e.message });
    }
  };

  if (isProfileLoading) {
    return <div className="space-y-8 p-4 md:p-10"><Skeleton className="h-10 w-1/3" /><Skeleton className="h-[400px] md:h-[600px] w-full rounded-3xl" /></div>;
  }

  const renderContent = () => {
    if (userProfile && activeStaff && activeAttendance && activeTasks && activeLeaveRequests && activeNominations) {
        return (
            <TeamInsightHub
                userProfile={userProfile}
                staffList={activeStaff}
                attendanceLogs={activeAttendance}
                tasks={activeTasks}
                leaveRequests={activeLeaveRequests}
                nominations={activeNominations}
                pulseFeed={allPulseData || []}
                onExport={handleMasterExport}
                onSubmitNomination={handleNominationSubmit}
                isExporting={isExporting}
            />
        );
    }

    return (
        <div className="py-20 flex flex-col items-center justify-center opacity-20">
            <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
            <p className="text-[10px] font-black uppercase tracking-widest">Initializing Tactical Matrix...</p>
        </div>
    );
  };

  if (noWrapper) return renderContent();

  return (
    <ModuleContainer
        title="Reports & Analytics"
        subtitle={permissions.canManageStaff ? "Team Performance & Activity Logs" : "Personal Task History & Achievements"}
    >
      {renderContent()}
    </ModuleContainer>
  );
}
