'use client';
import { useUser, useDoc, useMemoFirebase, useFirestore, useCollection } from "@/firebase";
import { doc, collection, query, where, getDocs } from 'firebase/firestore';
import type { UserProfile, DailyReport, Attendance, Requisition, Task } from '@/lib/types';
import { usePermissions } from '@/hooks/usePermissions';
import { Skeleton } from '@/components/ui/skeleton';
import { FinancialReport } from '@/components/reports/FinancialReport';
import { AttendanceReport } from "@/components/reports/AttendanceReport";
import { KPIAnalytics } from "@/components/reports/KPIAnalytics";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SubmitDailyReport } from "@/components/reports/SubmitDailyReport";
import { MyDailyReports } from "@/components/reports/MyDailyReports";
import { TeamDailyReports } from "@/components/reports/TeamDailyReports";
import { PerformanceDashboard } from "@/components/reports/PerformanceDashboard";
import { TeamHealthTab } from "@/components/reports/TeamHealthTab";
import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Download, FileSpreadsheet, Loader2, Trophy, BarChart3, UserCheck, Heart } from "lucide-react";
import * as XLSX from 'xlsx';
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export function ReportsPageContent({ initialPayload }: { initialPayload?: { tab?: string } }) {
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
  const [activeTab, setActiveTab] = useState('performance');

  useEffect(() => {
    if (initialPayload?.tab) {
        setActiveTab(initialPayload.tab);
    } else {
        const savedTab = localStorage.getItem(storageKey);
        if (savedTab) setActiveTab(savedTab);
    }
  }, [initialPayload]);

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

  if (isProfileLoading) {
    return <div className="space-y-8 p-6"><Skeleton className="h-10 w-1/3" /><Skeleton className="h-[600px] w-full rounded-3xl" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
            <h1 className="text-3xl font-black font-headline tracking-tighter">Reports & Analytics</h1>
            <p className="text-muted-foreground uppercase tracking-widest text-[10px] font-bold">
                {permissions.canManageStaff ? "Team Performance & Activity Logs" : "Personal Task History & Achievements"}
            </p>
        </div>
        {permissions.canManageStaff && (
            <Button variant="outline" onClick={handleMasterExport} disabled={isExporting} className="rounded-xl border-primary/20 hover:bg-primary/10 hover:border-primary transition-all active:scale-95 group">
                {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4 group-hover:rotate-12 transition-transform" />}
                Export Data
            </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-secondary/20 rounded-2xl p-1 mb-8">
            <TabsTrigger value="performance" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-background data-[state=active]:shadow-lg">
                <Trophy className="h-3 w-3 mr-2" /> My Dashboard
            </TabsTrigger>
            {permissions.canManageStaff && (
                <>
                    <TabsTrigger value="analytics" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-background data-[state=active]:shadow-lg">
                        <BarChart3 className="h-3 w-3 mr-2" /> Team Leaderboard
                    </TabsTrigger>
                    <TabsTrigger value="team-reports" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-background data-[state=active]:shadow-lg">
                        <UserCheck className="h-3 w-3 mr-2" /> Activity Logs
                    </TabsTrigger>
                    <TabsTrigger value="team-health" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-background data-[state=active]:shadow-lg">
                        <Heart className="h-3 w-3 mr-2" /> Team Health
                    </TabsTrigger>
                </>
            )}
            {!permissions.canManageStaff && (
                <TabsTrigger value="submit" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-background data-[state=active]:shadow-lg">
                    Submit Daily Report
                </TabsTrigger>
            )}
        </TabsList>

        <div className="mt-0">
            <TabsContent value="performance" className="m-0 focus-visible:ring-0 outline-none">
                {userProfile && <PerformanceDashboard userProfile={userProfile} />}
            </TabsContent>

            <TabsContent value="analytics" className="m-0 space-y-8 focus-visible:ring-0 outline-none animate-in fade-in duration-500">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    {userProfile && <AttendanceReport userProfile={userProfile} />}
                    {userProfile && <KPIAnalytics userProfile={userProfile} />}
                </div>
                {userProfile && <FinancialReport userProfile={userProfile} />}
            </TabsContent>

            <TabsContent value="team-reports" className="m-0 focus-visible:ring-0 outline-none animate-in fade-in duration-500">
                {userProfile && <TeamDailyReports userProfile={userProfile} />}
            </TabsContent>

            <TabsContent value="team-health" className="m-0 focus-visible:ring-0 outline-none animate-in fade-in duration-500">
                {userProfile && <TeamHealthTab userProfile={userProfile} />}
            </TabsContent>

            <TabsContent value="submit" className="m-0 space-y-8 focus-visible:ring-0 outline-none animate-in fade-in duration-500">
                {userProfile && <SubmitDailyReport userProfile={userProfile} />}
                {userProfile && <MyDailyReports userProfile={userProfile} />}
            </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
