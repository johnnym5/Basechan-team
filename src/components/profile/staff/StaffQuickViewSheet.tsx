'use client';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useEmployee360 } from '@/hooks/useEmployee360';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';
import type { UserProfile, DailyReport, Task, Attendance } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDuration } from '@/lib/formatters';
import {
  User,
  Timer,
  ListTodo,
  FileText,
  ExternalLink,
  Activity,
  CheckCircle2,
  Clock,
  Circle,
  Eye
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { useSuperAdminMode } from '@/context/SuperAdminModeProvider';
import { useImpersonation } from '@/context/ImpersonationProvider';
import { useToast } from '@/hooks/use-toast';

interface StaffQuickViewSheetProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | null;
  orgId: string;
  onViewFullProfile: (userId: string) => void;
}

export function StaffQuickViewSheet({ isOpen, onClose, userId, orgId, onViewFullProfile }: StaffQuickViewSheetProps) {
  const { data, isLoading } = useEmployee360(userId || undefined, orgId);
  const firestore = useFirestore();
  const { isSuperAdminModeActive } = useSuperAdminMode();
  const { setImpersonatedUserId, setIsImpersonating } = useImpersonation();
  const { toast } = useToast();

  // Fetch Latest Daily Report
  const reportsQuery = useMemoFirebase(
    () =>
      firestore && userId ? query(
        collection(firestore, 'daily_reports'),
        where('orgId', '==', orgId),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(1)
      ) : null,
    [firestore, userId, orgId]
  );
  const { data: reports, isLoading: isReportLoading } = useCollection<DailyReport>(reportsQuery);
  const latestReport = reports?.[0];

  const profile = data?.profile;
  const attendance = data?.attendance;
  const tasks = data?.tasks;

  const activeTasks = useMemo(() => {
    return tasks?.filter(t => t.status !== 'ARCHIVED') || [];
  }, [tasks]);

  const latestAttendance = attendance?.[0];
  const isOnline = profile?.status === 'ONLINE' || profile?.status === 'ACTIVE';

  if (!userId) return null;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-md apple-glass-darker border-l border-white/10 p-0 flex flex-col overflow-hidden">
        <SheetHeader className="p-8 pb-4 shrink-0">
          <SheetTitle className="sr-only">Staff Quick View</SheetTitle>
          <SheetDescription className="sr-only">Rapid overview of personnel metrics and active missions.</SheetDescription>

          <div className="flex flex-col gap-4">
            {isLoading ? (
                <div className="flex items-center gap-4">
                <Skeleton className="h-16 w-16 rounded-2xl" />
                <div className="space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-3 w-24" />
                </div>
                </div>
            ) : profile ? (
                <div className="flex items-center gap-5">
                <div className="relative">
                    <Avatar className="h-16 w-16 border-2 border-white/10 rounded-2xl shadow-2xl">
                    <AvatarImage src={profile.avatarUrl || ''} />
                    <AvatarFallback className="bg-secondary text-white font-black text-lg">{profile.fullName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    {isOnline && <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-emerald-500 rounded-full border-2 border-background animate-pulse" />}
                </div>
                <div className="min-w-0">
                    <h2 className="text-xl font-black font-headline tracking-tighter uppercase truncate">{profile.fullName}</h2>
                    <div className="flex items-center gap-2 mt-1">
                    <p className="text-[10px] font-bold text-primary uppercase tracking-widest">{profile.jobTitle || 'Unit Staff'}</p>
                    <Circle className="h-1 w-1 fill-white/20 text-white/20" />
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">{profile.departmentName || 'Operations'}</p>
                    </div>
                </div>
                </div>
            ) : null}

            {isSuperAdminModeActive && profile && (
                <Button
                    variant="outline"
                    size="sm"
                    className="w-full bg-amber-500/10 border-amber-500/20 text-amber-500 hover:bg-amber-500 hover:text-white rounded-xl h-10 font-black uppercase text-[9px] tracking-widest transition-all group"
                    onClick={() => {
                        setImpersonatedUserId(profile.id);
                        setIsImpersonating(true);
                        toast({ title: "Identity Assumed", description: `You are now operating as ${profile.fullName}.` });
                        onClose();
                    }}
                >
                    <Eye className="mr-2 h-3.5 w-3.5 group-hover:scale-110 transition-transform" />
                    Impersonate User
                </Button>
            )}
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-8 py-4 space-y-8 pb-32">
          {/* Live Metrics Grid */}
          <section className="space-y-4">
             <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-40">
                <Activity className="h-3 w-3" />
                Operational Status
             </div>
             <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 border border-white/5 rounded-2xl p-4 space-y-1">
                   <p className="text-[8px] font-black uppercase text-muted-foreground opacity-40 tracking-widest">Shift Progress</p>
                   <div className="flex items-baseline gap-1">
                      <span className="text-lg font-black font-mono text-emerald-400">
                        {latestAttendance ? formatDuration(latestAttendance.duration) : '00:00:00'}
                      </span>
                   </div>
                </div>
                <div className="bg-white/5 border border-white/5 rounded-2xl p-4 space-y-1">
                   <p className="text-[8px] font-black uppercase text-muted-foreground opacity-40 tracking-widest">Last Sync</p>
                   <div className="flex items-baseline gap-1">
                      <span className="text-sm font-bold text-white uppercase tracking-tight">
                        {profile?.lastHeartbeat ? formatDistanceToNow(new Date(profile.lastHeartbeat), { addSuffix: true }) : 'N/A'}
                      </span>
                   </div>
                </div>
             </div>
          </section>

          {/* Active Missions */}
          <section className="space-y-4">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-40">
                    <ListTodo className="h-3 w-3" />
                    Active Missions
                </div>
                <Badge variant="outline" className="text-[8px] font-black bg-primary/10 border-primary/20 text-primary">
                    {activeTasks.length} In Progress
                </Badge>
             </div>
             <div className="space-y-2">
                {isLoading ? (
                    <Skeleton className="h-20 w-full rounded-xl" />
                ) : activeTasks.length === 0 ? (
                    <div className="py-6 text-center border border-dashed border-white/5 rounded-2xl opacity-20">
                        <p className="text-[10px] font-black uppercase tracking-widest">Zero Active Tasks</p>
                    </div>
                ) : (
                    activeTasks.slice(0, 3).map(task => (
                        <div key={task.id} className="bg-white/5 border border-white/5 rounded-xl p-3 flex items-center justify-between group">
                            <div className="min-w-0">
                                <p className="text-[11px] font-bold text-white truncate leading-none">{task.title}</p>
                                <p className="text-[8px] font-black uppercase text-muted-foreground mt-1 tracking-tighter opacity-50">{task.priority} PRIORITY</p>
                            </div>
                            <Clock className="h-3 w-3 text-primary opacity-20 group-hover:opacity-100 transition-opacity" />
                        </div>
                    ))
                )}
             </div>
          </section>

          {/* Latest Daily Intelligence */}
          <section className="space-y-4">
             <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-40">
                <FileText className="h-3 w-3" />
                Daily Intelligence Snippet
             </div>
             <div className="bg-secondary/10 border border-white/5 rounded-2xl p-5 relative overflow-hidden">
                {isReportLoading ? (
                    <Skeleton className="h-20 w-full rounded-xl" />
                ) : latestReport ? (
                    <>
                        <div className="flex justify-between items-center mb-3">
                            <p className="text-[9px] font-black uppercase text-primary tracking-widest">Report for {latestReport.reportDate}</p>
                            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed italic">
                            "{latestReport.content}"
                        </p>
                    </>
                ) : (
                    <p className="text-xs text-muted-foreground opacity-30 italic text-center py-4">No recent intelligence reports filed.</p>
                )}
             </div>
          </section>
        </div>

        <SheetFooter className="p-8 border-t border-white/5 bg-black/20 shrink-0">
          <Button
            className="w-full h-14 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/20 m3-interactive"
            onClick={() => {
                onClose();
                onViewFullProfile(userId);
            }}
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            View Full Profile 360
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
