'use client';
import { useUser, useDoc, useMemoFirebase, useFirestore, useCollection } from "@/firebase";
import { doc, collection, query, where, getDocs } from 'firebase/firestore';
import type { UserProfile, DailyReport, Attendance, Requisition, Task, LeaveRequest, Nomination, PulseCheck } from '@/lib/types';
import { usePermissions } from '@/hooks/usePermissions';
import { Skeleton } from '@/components/ui/skeleton';
import { FinancialReport } from '@/components/reports/FinancialReport';
import { AttendanceReport } from "@/components/reports/AttendanceReport";
import { KPIAnalytics } from "@/components/reports/KPIAnalytics";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SubmitDailyReport } from "@/components/reports/SubmitDailyReport";
import { MyDailyReports } from "@/components/reports/MyDailyReports";
import { TeamDailyReports } from "@/components/reports/TeamDailyReports";
import { TeamHealthTab } from "@/components/reports/TeamHealthTab";
import { PeerNominationForm } from "@/components/reports/PeerNominationForm";
import { PerformanceDashboard } from "@/components/reports/PerformanceDashboard";
import { MyAwardsAndReviews } from "@/components/reports/MyAwardsAndReviews";
import { TeamDashboard } from "@/components/reports/TeamDashboard";
import { IntelligentSummaryCenter } from "@/components/reports/IntelligentSummaryCenter";
import { MyBriefingDashboard } from "@/components/reports/MyBriefingDashboard";
import { TeamPerformanceMasterView } from "@/components/reports/TeamPerformanceMasterView";
import { AdminCommandBriefing } from "@/components/reports/AdminCommandBriefing";
import { PeerRecognitionHub } from "@/components/reports/PeerRecognitionHub";
import { useState, useEffect, useMemo } from "react";
import { Button } from "../ui/button";
import { Download, FileSpreadsheet, Loader2, Trophy, BarChart3, UserCheck, Heart, ShieldAlert, Award, Zap } from "lucide-react";
import * as XLSX from 'xlsx';
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

import { ModuleContainer } from "@/components/layout/shell/ModuleContainer";

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
    if (initialPayload?.tab) {
        setActiveTab(initialPayload.tab);
    } else {
        const savedTab = localStorage.getItem(storageKey);
        if (savedTab) {
            // Migration: if the saved tab was 'performance' (My Dashboard), switch to 'submit'
            if (savedTab === 'performance' || savedTab === 'analytics' || savedTab === 'team-health') {
                setActiveTab(permissions.canManageStaff ? 'team-performance' : 'submit');
            } else if (savedTab === 'team-reports') {
                setActiveTab('team-reports');
            } else if (savedTab === 'intelligent-brief') {
                setActiveTab('intelligent-brief');
            } else {
                setActiveTab(savedTab);
            }
        } else {
            setActiveTab(permissions.canManageStaff ? 'team-performance' : 'submit');
        }
    }
  }, [initialPayload, permissions.canManageStaff]);

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
                Status: r.status,
                CreatedBy: r.creatorName,
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

  // Fetch Staff List for Nominations
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

  const staffList = useMemo(() =>
    rawStaff?.filter(s => s.id !== authUser?.uid).map(s => ({ id: s.id, name: s.fullName })) || []
  , [rawStaff, authUser?.uid]);

  const handleNominationSubmit = async (payload: any) => {
    if (!firestore) return;
    try {
        const nominationBatch = payload.nominations.map((nom: any) => ({
            ...nom,
            orgId: userProfile?.orgId,
            nominatorId: payload.nominatorId,
            nominatorName: payload.nominatorName,
            timestamp: payload.date,
            status: 'PENDING',
            additionalNotes: payload.additionalNotes
        }));

        const { addDocumentNonBlocking } = await import('@/firebase');
        for (const nomination of nominationBatch) {
            await addDocumentNonBlocking(collection(firestore, 'nominations'), nomination);
        }

        toast({ title: "Nominations Submitted", description: "Thank you for recognizing your teammates!" });
        setActiveTab('submit');
    } catch (e: any) {
        toast({ variant: 'destructive', title: "Submission Failed", description: e.message });
    }
  };

  if (isProfileLoading) {
    return <div className="space-y-8 p-4 md:p-10"><Skeleton className="h-10 w-1/3" /><Skeleton className="h-[400px] md:h-[600px] w-full rounded-3xl" /></div>;
  }

  const content = (
    <div className="flex flex-col h-full gap-4 md:gap-6 overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between shrink-0 gap-4">
          <div>
              <h2 className="text-lg font-black font-headline tracking-tighter uppercase">Operations Intelligence</h2>
              <p className="text-[9px] md:text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Performance Metrics, Activity Logs & Team Health</p>
          </div>
          {permissions.canManageStaff && (
              <Button variant="outline" onClick={handleMasterExport} disabled={isExporting} className="rounded-xl border-primary/20 hover:bg-primary/10 hover:border-primary transition-all active:scale-95 group h-10 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20 w-fit">
                  {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4 group-hover:rotate-12 transition-transform text-primary" />}
                  Export Master Data
              </Button>
          )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col min-h-0 h-full">
            <div className="w-full overflow-x-auto no-scrollbar mb-6 md:mb-8 shrink-0">
                <TabsList className="bg-secondary/20 rounded-2xl p-1 w-max border border-white/5 flex gap-1">
                    {permissions.canManageStaff ? (
                        <>
                            <TabsTrigger value="team-reports" className="rounded-xl px-4 md:px-6 font-black uppercase text-[9px] md:text-[10px] tracking-widest data-[state=active]:bg-background transition-all">
                                <Zap className="h-3.5 w-3.5 mr-2 text-amber-500" /> Team Insight
                            </TabsTrigger>
                            <TabsTrigger value="team-performance" className="rounded-xl px-4 md:px-6 font-black uppercase text-[9px] md:text-[10px] tracking-widest data-[state=active]:bg-background transition-all">
                                <Trophy className="h-3.5 w-3.5 mr-2 text-primary" /> Team Performance
                            </TabsTrigger>
                            <TabsTrigger value="recognition" className="rounded-xl px-4 md:px-6 font-black uppercase text-[9px] md:text-[10px] tracking-widest data-[state=active]:bg-background transition-all">
                                <Award className="h-3.5 w-3.5 mr-2 text-amber-500" /> Recognition Hub
                            </TabsTrigger>
                        </>
                    ) : (
                        permissions.canSubmitReport && (
                            <>
                                <TabsTrigger value="submit" className="rounded-xl px-4 md:px-6 font-black uppercase text-[9px] md:text-[10px] tracking-widest data-[state=active]:bg-background transition-all">
                                    Submit Daily Report
                                </TabsTrigger>
                                <TabsTrigger value="recognition" className="rounded-xl px-4 md:px-6 font-black uppercase text-[9px] md:text-[10px] tracking-widest data-[state=active]:bg-background transition-all">
                                    <Award className="h-3.5 w-3.5 mr-2 text-amber-500" /> Recognition Hub
                                </TabsTrigger>
                                <TabsTrigger value="intelligent-brief" className="rounded-xl px-4 md:px-6 font-black uppercase text-[9px] md:text-[10px] tracking-widest data-[state=active]:bg-background transition-all">
                                    <Zap className="h-3.5 w-3.5 mr-2 text-amber-500" /> Personal Insight
                                </TabsTrigger>
                            </>
                        )
                    )}
                </TabsList>
            </div>

            <div className="flex-1 min-h-0">
                {permissions.canManageStaff && (
                    <>
                        <TabsContent value="team-reports" className="m-0 space-y-8 focus-visible:ring-0 outline-none animate-in fade-in duration-500">
                            {userProfile && rawStaff && allAttendance && allTasksData && allLeaveData && allNominations && (
                                <AdminCommandBriefing
                                    staffList={rawStaff}
                                    attendanceLogs={allAttendance}
                                    tasks={allTasksData}
                                    leaveRequests={allLeaveData}
                                    nominations={allNominations}
                                />
                            )}
                            {userProfile && <TeamDailyReports userProfile={userProfile} />}
                        </TabsContent>

                        <TabsContent value="team-performance" className="m-0 space-y-8 focus-visible:ring-0 outline-none animate-in fade-in duration-500">
                            {userProfile && rawStaff && allAttendance && allTasksData && allNominations && allPulseData && (
                                <TeamPerformanceMasterView
                                    staffList={rawStaff}
                                    attendanceLogs={allAttendance}
                                    tasks={allTasksData}
                                    nominations={allNominations}
                                    pulseFeed={allPulseData}
                                />
                            )}
                        </TabsContent>

                        <TabsContent value="recognition" className="m-0 focus-visible:ring-0 outline-none animate-in fade-in duration-500">
                            {userProfile && staffList && allNominations && (
                                <PeerRecognitionHub
                                    currentUser={userProfile}
                                    staffList={staffList}
                                    recognitionData={allNominations}
                                    onSubmitNomination={handleNominationSubmit}
                                />
                            )}
                        </TabsContent>
                    </>
                )}

                {!permissions.canManageStaff && permissions.canSubmitReport && (
                    <>
                        <TabsContent value="submit" className="m-0 space-y-8 focus-visible:ring-0 outline-none animate-in fade-in duration-500">
                            {userProfile && <SubmitDailyReport userProfile={userProfile} />}
                            {userProfile && <MyDailyReports userProfile={userProfile} />}
                        </TabsContent>
                        <TabsContent value="recognition" className="m-0 focus-visible:ring-0 outline-none animate-in fade-in duration-500">
                            {userProfile && staffList && allNominations && (
                                <PeerRecognitionHub
                                    currentUser={userProfile}
                                    staffList={staffList}
                                    recognitionData={allNominations}
                                    onSubmitNomination={handleNominationSubmit}
                                />
                            )}
                        </TabsContent>
                        <TabsContent value="intelligent-brief" className="m-0 focus-visible:ring-0 outline-none animate-in fade-in duration-500">
                            {userProfile && rawStaff && allAttendance && allTasksData && allLeaveData && allNominations && (
                                <MyBriefingDashboard
                                    userProfile={userProfile}
                                    staffList={rawStaff}
                                    attendanceLogs={allAttendance}
                                    tasks={allTasksData}
                                    leaveRequests={allLeaveData}
                                    nominations={allNominations}
                                />
                            )}
                        </TabsContent>
                    </>
                )}
            </div>
          </Tabs>
      </div>
    </div>
  );

  if (noWrapper) return content;

  return (
    <ModuleContainer
        title="Reports & Analytics"
        subtitle={permissions.canManageStaff ? "Team Performance & Activity Logs" : "Personal Task History & Achievements"}
        actions={
            permissions.canManageStaff && (
                <Button variant="outline" onClick={handleMasterExport} disabled={isExporting} className="rounded-xl border-primary/20 hover:bg-primary/10 hover:border-primary transition-all active:scale-95 group h-10 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20">
                    {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4 group-hover:rotate-12 transition-transform text-primary" />}
                    Export Master Data
                </Button>
            )
        }
    >
      {content}
    </ModuleContainer>
  );
}
