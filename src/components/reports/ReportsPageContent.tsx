<<<<<<< HEAD
'use client';
import { useUser, useDoc, useMemoFirebase, useFirestore, useCollection } from "@/firebase";
import { doc, collection, query, where } from 'firebase/firestore';
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
import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Download, FileSpreadsheet, Loader2 } from "lucide-react";
import * as XLSX from 'xlsx';
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export function ReportsPageContent({ initialPayload }: { initialPayload?: { tab?: string } }) {
  const { user: authUser } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  const userProfileRef = useMemoFirebase(() => 
    authUser ? doc(firestore, "users", authUser.uid) : null,
  [firestore, authUser]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);
  const permissions = usePermissions(userProfile);

  const storageKey = 'reports-view-tab';
  const [activeTab, setActiveTab] = useState('analytics');

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

  // Master Export Function
  const handleMasterExport = async () => {
    if (!firestore || !userProfile) return;
    setIsExporting(true);
    
    try {
        const orgId = userProfile.orgId;
        const [attSnap, reqSnap, taskSnap, reportSnap] = await Promise.all([
            useCollection(query(collection(firestore, 'attendance'), where('orgId', '==', orgId))),
            useCollection(query(collection(firestore, 'requisitions'), where('orgId', '==', orgId))),
            useCollection(query(collection(firestore, 'tasks'), where('orgId', '==', orgId))),
            useCollection(query(collection(firestore, 'daily_reports'), where('orgId', '==', orgId))),
        ]);

        const wb = XLSX.utils.book_new();

        // Attendance Sheet
        if (attSnap.data) {
            const attData = attSnap.data.map(r => ({
                Date: r.date,
                Name: r.userName,
                'Clock In': format(new Date(r.clockIn), 'p'),
                'Clock Out': r.clockOut ? format(new Date(r.clockOut), 'p') : 'N/A',
                'Worked (Hrs)': ((r.duration || 0) / 3600).toFixed(2),
                'Idle (Hrs)': ((r.idleTime || 0) / 3600).toFixed(2),
                Location: r.location,
                Status: r.status
            }));
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(attData), "Attendance");
        }

        // Requisitions Sheet
        if (reqSnap.data) {
            const reqData = reqSnap.data.map(r => ({
                Serial: r.serialNo,
                Title: r.title,
                Amount: r.amount,
                Vendor: r.vendorName,
                Status: r.status,
                CreatedBy: r.creatorName,
                Date: format(new Date(r.createdAt), 'PP')
            }));
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(reqData), "Procurement");
        }

        // Tasks Sheet
        if (taskSnap.data) {
            const taskData = taskSnap.data.map(t => ({
                Serial: t.serialNo,
                Title: t.title,
                Assignee: t.assignedToName,
                Priority: t.priority,
                Status: t.status,
                'Est. Hours': t.estimatedHours || 0,
                'Actual Hours': t.actualHours || 0,
                Due: t.dueDate ? format(new Date(t.dueDate), 'PP') : 'N/A'
            }));
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(taskData), "Missions");
        }

        XLSX.writeFile(wb, `Org_Performance_Report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
        toast({ title: "Export Complete", description: "Consolidated organizational data has been downloaded." });
    } catch (e: any) {
        toast({ variant: 'destructive', title: "Export Failed", description: e.message });
    } finally {
        setIsExporting(false);
    }
  }

  if (isProfileLoading) {
    return <Skeleton className="h-screen w-full" />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
            <h1 className="text-3xl font-bold font-headline tracking-tight">Reports & Analytics</h1>
            <p className="text-muted-foreground">
                {permissions.canManageStaff ? "Analyze performance, punctuality, and team productivity." : "Submit your daily report and view your history."}
            </p>
        </div>
        {permissions.canManageStaff && (
            <Button variant="outline" onClick={handleMasterExport} disabled={isExporting} className="rounded-xl border-primary/20 hover:bg-primary/5">
                {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}
                Consolidated Export
            </Button>
        )}
      </div>

      {permissions.canManageStaff ? (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-2 max-w-md bg-secondary/20">
            <TabsTrigger value="analytics" className="font-bold uppercase text-[10px] tracking-widest">Executive Analytics</TabsTrigger>
            <TabsTrigger value="team-reports" className="font-bold uppercase text-[10px] tracking-widest">Personnel Logs</TabsTrigger>
          </TabsList>
          <TabsContent value="analytics" className="mt-6 space-y-6 animate-slide-up-fade">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {userProfile && <AttendanceReport userProfile={userProfile} />}
                {userProfile && <KPIAnalytics userProfile={userProfile} />}
            </div>
            {userProfile && <FinancialReport userProfile={userProfile} />}
          </TabsContent>
          <TabsContent value="team-reports" className="mt-6 animate-slide-up-fade">
            {userProfile && <TeamDailyReports userProfile={userProfile} />}
          </TabsContent>
        </Tabs>
      ) : (
        <div className="space-y-6 animate-slide-up-fade">
            {userProfile && <SubmitDailyReport userProfile={userProfile} />}
            {userProfile && <MyDailyReports userProfile={userProfile} />}
        </div>
      )}
    </div>
  );
}
=======
'use client';
import { useUser, useDoc, useMemoFirebase, useFirestore } from "@/firebase";
import { doc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { usePermissions } from '@/hooks/usePermissions';
import { Skeleton } from '@/components/ui/skeleton';
import { FinancialReport } from '@/components/reports/FinancialReport';
import { AttendanceReport } from "@/components/reports/AttendanceReport";
import { KPIAnalytics } from "@/components/reports/KPIAnalytics";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SubmitDailyReport } from "@/components/reports/SubmitDailyReport";
import { MyDailyReports } from "@/components/reports/MyDailyReports";
import { TeamDailyReports } from "@/components/reports/TeamDailyReports";
import { useState, useEffect } from "react";

export function ReportsPageContent({ initialPayload }: { initialPayload?: { tab?: string } }) {
  const { user: authUser } = useUser();
  const firestore = useFirestore();

  const userProfileRef = useMemoFirebase(() => 
    authUser ? doc(firestore, "users", authUser.uid) : null,
  [firestore, authUser]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);
  const permissions = usePermissions(userProfile);

  const storageKey = 'reports-view-tab';
  const [activeTab, setActiveTab] = useState('analytics');

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

  if (isProfileLoading) {
    return <Skeleton className="h-screen w-full" />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">Reports & Analytics</h1>
        <p className="text-muted-foreground">
            {permissions.canManageStaff ? "Analyze performance, punctuality, and team productivity." : "Submit your daily report and view your history."}
        </p>
      </div>

      {permissions.canManageStaff ? (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-2 max-w-md">
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="team-reports">Team Reports</TabsTrigger>
          </TabsList>
          <TabsContent value="analytics" className="mt-4 space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {userProfile && <AttendanceReport userProfile={userProfile} />}
                {userProfile && <KPIAnalytics userProfile={userProfile} />}
            </div>
            {userProfile && <FinancialReport userProfile={userProfile} />}
          </TabsContent>
          <TabsContent value="team-reports" className="mt-4">
            {userProfile && <TeamDailyReports userProfile={userProfile} />}
          </TabsContent>
        </Tabs>
      ) : (
        <div className="space-y-6">
            {userProfile && <SubmitDailyReport userProfile={userProfile} />}
            {userProfile && <MyDailyReports userProfile={userProfile} />}
        </div>
      )}
    </div>
  );
}
>>>>>>> e46f2e1ad97486affb300b626ff5055ece21f529
