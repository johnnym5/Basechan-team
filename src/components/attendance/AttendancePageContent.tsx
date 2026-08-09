'use client';
import { ClockControl } from "@/components/attendance/ClockControl";
import { StatusFeed } from "@/components/attendance/StatusFeed";
import { AttendanceHistory } from "@/components/attendance/AttendanceHistory";
import { useUser, useDoc, useMemoFirebase, useFirestore, useCollection } from "@/firebase";
import { doc, collection, query, where } from "firebase/firestore";
import type { UserProfile, Attendance } from "@/lib/types";
import { usePermissions } from "@/hooks/usePermissions";
import { Skeleton } from "@/components/ui/skeleton";
import { PendingApprovals } from "@/components/attendance/PendingApprovals";
import { useSystemConfig } from "@/hooks/useSystemConfig";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TeamAttendanceHistory } from "@/components/attendance/TeamAttendanceHistory";
import { WorkforceRoster } from "@/components/attendance/WorkforceRoster";
import { LiveStaffMonitor } from "@/components/attendance/LiveStaffMonitor";
import { StaffAttendanceAnalytics } from "@/components/attendance/StaffAttendanceAnalytics";
import { useState, useEffect, useMemo } from "react";
import { Calendar } from "@/components/ui/calendar";
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from "@/components/ui/carousel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDuration } from "@/lib/formatters";
import { format, isSameDay } from "date-fns";
import { StaffQuickViewSheet } from "@/components/profile/staff/StaffQuickViewSheet";
import { FileText, CalendarDays, Users, BarChart3 } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

import { ModuleContainer } from "@/components/layout/shell/ModuleContainer";

export function AttendancePageContent({ noWrapper = false }: { noWrapper?: boolean }) {
  const { user: authUser } = useUser();
  const firestore = useFirestore();

  const userProfileRef = useMemoFirebase(() =>
    firestore && authUser ? doc(firestore, "users", authUser.uid) : null
    , [firestore, authUser]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  const { config: systemConfig, isLoading: isConfigLoading } = useSystemConfig(userProfile?.orgId);
  const permissions = usePermissions(userProfile);

  // Unified State for Overhaul
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);

  // Fetch Attendance for the whole organization for the selected month to show dots on calendar
  const attendanceQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile?.orgId) return null;
    return query(
      collection(firestore, 'attendance'),
      where('orgId', '==', userProfile.orgId)
    );
  }, [firestore, userProfile?.orgId]);
  const { data: allAttendance } = useCollection<Attendance>(attendanceQuery);

  const staffOnSelectedDate = useMemo(() => {
    if (!allAttendance || !selectedDate) return [];
    return allAttendance.filter(r => isSameDay(new Date(r.date + 'T00:00:00'), selectedDate));
  }, [allAttendance, selectedDate]);

  const pendingQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile || !permissions.canApproveHR) return null;
    return query(
      collection(firestore, 'attendance'),
      where('orgId', '==', userProfile.orgId),
      where('status', '==', 'PENDING')
    );
  }, [firestore, userProfile?.orgId, permissions.canApproveHR]);
  const { data: pendingRecords } = useCollection<Attendance>(pendingQuery);
  const pendingCount = pendingRecords?.length || 0;

  const usersQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile?.orgId) return null;
    return query(
      collection(firestore, 'users'),
      where('orgId', '==', userProfile.orgId)
    );
  }, [firestore, userProfile?.orgId]);
  const { data: users } = useCollection<UserProfile>(usersQuery);

  const isLoading = isProfileLoading || isConfigLoading;

  const storageKey = 'attendance-view-tab';
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedTab = localStorage.getItem(storageKey);
      if (savedTab === 'history') return 'clock';
      if (savedTab === 'team-history') return 'live-view';
      if (savedTab) return savedTab;
    }
    return 'clock';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, activeTab);
    }
  }, [activeTab]);

  if (isLoading) {
    return (
      <div className="space-y-8 p-10">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-[500px] w-full" />
      </div>
    )
  }

  const content = (
    <>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 h-full">
        <TabsList className="w-full justify-start border-b border-white/5 rounded-none h-auto p-0 bg-transparent gap-8 mb-8 overflow-x-auto overflow-y-hidden shrink-0 pb-0">
          <TabsTrigger value="clock" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-3 text-[10px] font-black uppercase tracking-[0.2em] opacity-50 data-[state=active]:opacity-100 transition-all">Time Clock</TabsTrigger>

          {permissions.canApproveHR && (
            <TabsTrigger value="approvals" className="relative data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-3 text-[10px] font-black uppercase tracking-[0.2em] opacity-50 data-[state=active]:opacity-100 transition-all">
              Approvals
              {pendingCount > 0 && (
                <span className="absolute -top-1.5 -right-3 h-4 w-4 rounded-full bg-destructive text-white text-[8px] flex items-center justify-center font-black shadow-lg shadow-destructive/50 animate-pulse">
                  {pendingCount}
                </span>
              )}
            </TabsTrigger>
          )}

          <TabsTrigger value="live-view" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-3 text-[10px] font-black uppercase tracking-[0.2em] opacity-50 data-[state=active]:opacity-100 transition-all">Live Roster</TabsTrigger>

          {permissions.canApproveHR && (
            <TabsTrigger value="analytics" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-3 text-[10px] font-black uppercase tracking-[0.2em] opacity-50 data-[state=active]:opacity-100 transition-all">Historical Analytics</TabsTrigger>
          )}
        </TabsList>

        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
          {permissions.canManageStaff && (
              <TabsContent value="ops-command" className="mt-0 focus-visible:outline-none h-full space-y-8">
                  {/* Phase 1: Operational Oversight (Calendar + Carousel) */}
                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
                      <div className="xl:col-span-4">
                        <Card className="apple-glass rounded-[2rem] p-4 border border-white/5">
                            <div className="flex items-center gap-2 px-4 mb-4">
                                <CalendarDays className="h-4 w-4 text-primary" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Operational Archive</span>
                            </div>
                            <Calendar
                                mode="single"
                                selected={selectedDate}
                                onSelect={setSelectedDate}
                                className="w-full"
                            />
                        </Card>
                      </div>

                      <div className="xl:col-span-8 space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <h3 className="text-xl font-black font-headline tracking-tighter uppercase">Deployed Assets</h3>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">
                                    {selectedDate ? format(selectedDate, 'MMMM do, yyyy') : 'No Date Selected'}
                                </p>
                            </div>
                        </div>

                        {staffOnSelectedDate.length === 0 ? (
                            <div className="h-40 flex flex-col items-center justify-center border border-dashed border-white/10 rounded-[2.5rem] bg-secondary/5">
                                <p className="text-muted-foreground uppercase font-black text-[10px] tracking-[0.3em] opacity-30">Zero deployments recorded for this cycle</p>
                            </div>
                        ) : (
                            <Carousel opts={{ align: "start", dragFree: true }} className="w-full">
                                <CarouselContent className="-ml-4">
                                    {staffOnSelectedDate.map((record) => (
                                        <CarouselItem key={record.id} className="pl-4 basis-auto">
                                            {/* Staff Pill Box */}
                                            <div
                                                onClick={() => {
                                                    setSelectedStaffId(record.userId);
                                                    setIsQuickViewOpen(true);
                                                }}
                                                className="group flex items-center gap-4 bg-card/40 hover:bg-primary/10 border border-white/5 hover:border-primary/20 p-3 pr-6 rounded-full cursor-pointer transition-all duration-300 active:scale-95 shadow-lg"
                                            >
                                                <Avatar className="h-10 w-10 border border-white/10 group-hover:border-primary/30 transition-colors">
                                                    <AvatarFallback className="bg-secondary text-[10px] font-black">{record.userName.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-black text-white truncate leading-none group-hover:text-primary transition-colors">{record.userName}</p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-[9px] font-mono font-bold text-emerald-400/80">{format(new Date(record.clockIn), 'HH:mm')}</span>
                                                        <span className="text-muted-foreground opacity-30 text-[8px]">→</span>
                                                        <span className={cn("text-[9px] font-mono font-bold", record.clockOut ? "text-rose-400/80" : "text-primary animate-pulse")}>
                                                            {record.clockOut ? format(new Date(record.clockOut), 'HH:mm') : 'ACTIVE'}
                                                        </span>
                                                        <div className="h-2 w-px bg-white/10 mx-1" />
                                                        <span className="text-[9px] font-black text-muted-foreground">{formatDuration(record.duration)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </CarouselItem>
                                    ))}
                                </CarouselContent>
                                <div className="flex justify-end gap-2 mt-4">
                                    <CarouselPrevious className="static h-8 w-8 translate-y-0 rounded-xl" />
                                    <CarouselNext className="static h-8 w-8 translate-y-0 rounded-xl" />
                                </div>
                            </Carousel>
                        )}

                        <div className="pt-4">
                            <LiveStaffMonitor userProfile={userProfile!} />
                        </div>
                      </div>
                  </div>

                  {/* Phase 2: Roster Matrix */}
                  <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-emerald-500" />
                        <h3 className="text-sm font-black uppercase tracking-[0.2em]">Force Readiness Matrix</h3>
                      </div>
                      <WorkforceRoster userProfile={userProfile!} permissions={permissions} />
                  </div>
              </TabsContent>
          )}

          <TabsContent value="clock" className="mt-0 focus-visible:outline-none h-full">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch min-h-full p-4 md:p-6 bg-card/20 rounded-[2.5rem] border border-white/5">
              <div className="lg:col-span-1 h-full">
                <ClockControl userProfile={userProfile || null} permissions={permissions} systemConfig={systemConfig || null} />
              </div>
              <div className="lg:col-span-2 h-full overflow-hidden">
                <AttendanceHistory userProfile={userProfile || null} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="roster" className="mt-0 focus-visible:outline-none h-full">
            {userProfile && <WorkforceRoster userProfile={userProfile} permissions={permissions} />}
          </TabsContent>

          <TabsContent value="live-view" className="mt-0 focus-visible:outline-none h-full flex flex-col p-4 md:p-6 bg-card/20 rounded-[2.5rem] border border-white/5 space-y-8">
            <div className="flex flex-col gap-8 h-full">
              <div className="shrink-0">
                {permissions.canViewTeam && userProfile && (
                  <LiveStaffMonitor userProfile={userProfile} />
                )}
              </div>
              <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-emerald-500" />
                    <h3 className="text-sm font-black uppercase tracking-[0.2em]">Force Readiness Matrix</h3>
                  </div>
                  <div className="overflow-x-auto w-full">
                    <div className="min-w-[800px]">
                        <WorkforceRoster userProfile={userProfile!} permissions={permissions} />
                    </div>
                  </div>
              </div>
              <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                <div className="lg:col-span-8 h-full">
                  {permissions.canViewTeam && userProfile && (
                    <TeamAttendanceHistory userProfile={userProfile} />
                  )}
                </div>
                <div className="lg:col-span-4 h-full">
                  <StatusFeed userProfile={userProfile || null} permissions={permissions} />
                </div>
              </div>
            </div>
          </TabsContent>

          {permissions.canApproveHR && userProfile && (
            <TabsContent value="approvals" className="mt-0 focus-visible:outline-none h-full">
              <PendingApprovals userProfile={userProfile} />
            </TabsContent>
          )}

          {permissions.canApproveHR && (
            <TabsContent value="analytics" className="mt-0 focus-visible:outline-none h-full flex flex-col p-4 md:p-6 bg-card/20 rounded-[2.5rem] border border-white/5 space-y-8">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <h2 className="text-2xl font-black font-headline tracking-tighter uppercase flex items-center gap-3">
                            <BarChart3 className="h-6 w-6 text-primary" /> Historical Analytics
                        </h2>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Deep Dive Personnel Performance Telemetry</p>
                    </div>

                    <div className="w-full md:w-64">
                        <Select value={selectedStaffId || ""} onValueChange={setSelectedStaffId}>
                            <SelectTrigger className="rounded-xl border-white/10 bg-background/50 backdrop-blur-md">
                                <SelectValue placeholder="Select Staff Member" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-white/10 bg-background/90 backdrop-blur-xl">
                                {users?.map(u => (
                                    <SelectItem key={u.id} value={u.id} className="text-xs font-bold">{u.fullName}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="flex-1 min-h-0">
                    {selectedStaffId ? (
                        <StaffAttendanceAnalytics staffId={selectedStaffId} />
                    ) : (
                        <div className="h-64 flex flex-col items-center justify-center border border-dashed border-white/10 rounded-[2.5rem] bg-secondary/5">
                            <Users className="h-12 w-12 mb-4 opacity-20" />
                            <p className="text-muted-foreground uppercase font-black text-[10px] tracking-[0.3em] opacity-30">Select a staff member to initialize analytics</p>
                        </div>
                    )}
                </div>
            </TabsContent>
          )}
        </div>
      </Tabs>

      <StaffQuickViewSheet
          isOpen={isQuickViewOpen}
          onClose={() => {
              setIsQuickViewOpen(false);
              setSelectedStaffId(null);
          }}
          userId={selectedStaffId}
          orgId={userProfile?.orgId || ''}
          onViewFullProfile={(id) => {
              // Navigation is handled via global layout or specific router push
          }}
      />
    </>
  );

  if (noWrapper) return content;

  return (
    <ModuleContainer
        title="Attendance Center"
        subtitle="Operations & Personnel Oversight"
        noScroll={true}
    >
      {content}
    </ModuleContainer>
  );
}
