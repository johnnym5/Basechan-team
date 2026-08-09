'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '../ui/skeleton';
import type { DailyReport, UserProfile } from '@/lib/types';
import { useFirestore } from '@/firebase';
import { collection, query, where, orderBy, getDocs, doc, updateDoc } from 'firebase/firestore';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from "@/components/ui/table"
import { format, subDays, addDays, isToday, isSameDay, startOfDay } from 'date-fns';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
  } from "@/components/ui/dialog"
import { useState, useEffect, useMemo } from 'react';
import {
    CheckCircle2,
    Loader2,
    ChevronLeft,
    ChevronRight,
    Calendar as CalendarIcon,
    Search,
    AlertTriangle,
    Eye,
    Check,
    Clock,
    Users,
    Activity,
    Info,
    ArrowRight,
    ExternalLink,
    ListTodo,
    Fingerprint,
    BookOpen
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Switch } from '../ui/switch';
import { Badge } from '../ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { uiEmitter } from '@/lib/ui-emitter';
import { cn } from '@/lib/utils';
import { useOrganizationStaff } from '@/hooks/useStaff';
import { useToast } from '@/hooks/use-toast';

interface TeamDailyReportsProps {
  userProfile: UserProfile;
}

export function TeamDailyReports({ userProfile }: TeamDailyReportsProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { data: staffList } = useOrganizationStaff(userProfile.orgId);

  const [reports, setReports] = useState<DailyReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReport, setSelectedReport] = useState<DailyReport | null>(null);
  const [expandedSummaries, setExpandedSummaries] = useState<Set<string>>(new Set());

  const fetchReports = async () => {
    if (!firestore || !userProfile) return;
    setIsLoading(true);

    try {
        const reportsRef = collection(firestore, 'daily_reports');
        const formattedDate = format(selectedDate, 'yyyy-MM-dd');

        const q = query(
            reportsRef, 
            where('orgId', '==', userProfile.orgId), 
            where('reportDate', '==', formattedDate),
            orderBy('createdAt', 'desc')
        );

        const snap = await getDocs(q);
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as DailyReport));
        setReports(data);
    } catch (e) {
        console.error("Failed to fetch team reports:", e);
    } finally {
        setIsLoading(false);
    }
  };

  useEffect(() => {
      fetchReports();
  }, [firestore, userProfile?.orgId, selectedDate]);

  const filteredReports = useMemo(() => {
      return reports.filter(r =>
        r.userName.toLowerCase().includes(searchQuery.toLowerCase())
      );
  }, [reports, searchQuery]);

  // KPI Calculations
  const stats = useMemo(() => {
      const totalStaff = staffList?.length || 15;
      const submitted = reports.length;

      let totalHours = 0;
      let totalInactive = 0;
      let systemReportCount = 0;

      reports.forEach(r => {
          const totalMatch = r.content.match(/Total Time:\s*([\d.]+)/i);
          const inactiveMatch = r.content.match(/Inactive Time:\s*([\d.]+)/i);

          if (totalMatch) {
              totalHours += parseFloat(totalMatch[1]);
              systemReportCount++;
          }
          if (inactiveMatch) {
              totalInactive += parseFloat(inactiveMatch[1]);
          }
      });

      return {
          staffPresent: `${submitted} / ${totalStaff}`,
          totalHours: `${totalHours.toFixed(1)} hrs`,
          avgInactive: systemReportCount > 0 ? `${(totalInactive / systemReportCount).toFixed(1)} hrs` : '0.0 hrs',
          missing: Math.max(0, totalStaff - submitted),
          hasHighInactive: systemReportCount > 0 && (totalInactive / systemReportCount) > 2
      };
  }, [reports, staffList]);

  const handleToggleReviewed = async (reportId: string, current: boolean) => {
      if (!firestore) return;
      try {
          await updateDoc(doc(firestore, 'daily_reports', reportId), {
              isReviewed: !current
          });
          setReports(prev => prev.map(r => r.id === reportId ? { ...r, isReviewed: !current } : r));
          toast({ title: "Status Updated", description: "Report review status synchronized." });
      } catch (e) {
          toast({ variant: 'destructive', title: "Update Failed", description: "Could not authorize review status." });
      }
  };

  const toggleExpandSummary = (id: string) => {
      const next = new Set(expandedSummaries);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setExpandedSummaries(next);
  };

  const checkAnomaly = (content: string) => {
      const totalMatch = content.match(/Total Time:\s*([\d.]+)/i);
      const inactiveMatch = content.match(/Inactive Time:\s*([\d.]+)/i);
      if (totalMatch && inactiveMatch) {
          const total = parseFloat(totalMatch[1]);
          const inactive = parseFloat(inactiveMatch[1]);
          return total > 0 && (inactive / total) > 0.5;
      }
      return false;
  };

  const handlePreviousDay = () => setSelectedDate(prev => subDays(prev, 1));
  const handleNextDay = () => {
      if (!isToday(selectedDate)) {
          setSelectedDate(prev => addDays(prev, 1));
      }
  };

  const handleJumpToTask = (taskId: string) => {
      setSelectedReport(null);
      uiEmitter.emit('open-tasks-dialog', { taskId });
  };

  const handleJumpToWorkstation = (station: 'attendance' | 'workbooks') => {
      setSelectedReport(null);
      uiEmitter.emit(`open-${station}-dialog` as any);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      {/* 1. Calendar-Based Pagination Header */}
      <div className="sticky top-0 z-30 p-4 apple-glass rounded-2xl border border-white/5 shadow-xl flex items-center justify-between gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePreviousDay}
            className="rounded-xl h-10 px-4 font-black uppercase text-[10px] tracking-widest hover:bg-white/5"
          >
              <ChevronLeft className="mr-2 h-4 w-4" /> Previous Day
          </Button>

          <Popover>
              <PopoverTrigger asChild>
                  <Button variant="outline" className="h-12 px-6 rounded-2xl border-white/10 bg-black/20 hover:bg-black/40 transition-all gap-3 min-w-[240px]">
                      <CalendarIcon className="h-4 w-4 text-primary" />
                      <span className="font-black font-headline uppercase tracking-tighter text-base">
                          {isToday(selectedDate) ? "Today, " : ""}
                          {format(selectedDate, 'MMMM do, yyyy')}
                      </span>
                  </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 apple-glass border-none" align="center">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    disabled={(date) => date > new Date()}
                    initialFocus
                  />
              </PopoverContent>
          </Popover>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleNextDay}
            disabled={isToday(selectedDate)}
            className="rounded-xl h-10 px-4 font-black uppercase text-[10px] tracking-widest hover:bg-white/5 disabled:opacity-20"
          >
              Next Day <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
      </div>

      {/* 2. Daily KPI Aggregation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-white/5 border-white/5 rounded-[2rem] p-6 shadow-inner relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Users className="h-16 w-16" /></div>
              <CardHeader className="p-0 pb-2"><CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60">Staff Logged In</CardTitle></CardHeader>
              <CardContent className="p-0">
                  <p className="text-4xl font-black font-headline tracking-tighter text-primary">{stats.staffPresent}</p>
                  <p className="text-[9px] font-bold text-muted-foreground uppercase mt-1">Operational Coverage</p>
              </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/5 rounded-[2rem] p-6 shadow-inner relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Clock className="h-16 w-16" /></div>
              <CardHeader className="p-0 pb-2"><CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60">Total Hours Logged</CardTitle></CardHeader>
              <CardContent className="p-0">
                  <p className="text-4xl font-black font-headline tracking-tighter text-emerald-500">{stats.totalHours}</p>
                  <p className="text-[9px] font-bold text-muted-foreground uppercase mt-1">Aggregated Duty Cycle</p>
              </CardContent>
          </Card>

          <Card className={cn(
              "bg-white/5 border-white/5 rounded-[2rem] p-6 shadow-inner relative overflow-hidden group transition-colors",
              stats.hasHighInactive ? "bg-amber-500/5 border-amber-500/10" : ""
          )}>
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Activity className="h-16 w-16" /></div>
              <CardHeader className="p-0 pb-2">
                  <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60">Avg. Inactive Time</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                  <p className={cn(
                      "text-4xl font-black font-headline tracking-tighter",
                      stats.hasHighInactive ? "text-amber-500" : "text-white"
                  )}>{stats.avgInactive}</p>
                  <div className="flex items-center gap-2 mt-1">
                      <p className="text-[9px] font-bold text-muted-foreground uppercase">System Standby Average</p>
                      {stats.hasHighInactive && <AlertTriangle className="h-3 w-3 text-amber-500 animate-pulse" />}
                  </div>
              </CardContent>
          </Card>
      </div>

      {/* 3. Filter Bar & Reports Table */}
      <Card className="apple-glass border-none shadow-xl overflow-hidden">
        <CardHeader className="border-b border-white/5 px-8 py-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <CardTitle className="text-xl font-black font-headline uppercase tracking-tight">Intelligence Ledger</CardTitle>
                    <CardDescription className="text-[10px] font-black uppercase tracking-widest opacity-60">Chronological activity logs for organization assets.</CardDescription>
                </div>
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-40" />
                    <input
                        placeholder="Search personnel..."
                        className="w-full pl-10 h-11 rounded-xl bg-black/20 border border-white/5 focus:outline-none focus:border-primary/50 text-xs text-white"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>
        </CardHeader>
        <CardContent className="p-0">
            <Table>
                <TableHeader className="bg-white/[0.02]">
                    <TableRow className="border-white/5 hover:bg-transparent h-12">
                        <TableHead className="text-[9px] font-black uppercase tracking-widest pl-8">Personnel</TableHead>
                        <TableHead className="text-[9px] font-black uppercase tracking-widest">Activity Summary</TableHead>
                        <TableHead className="text-[9px] font-black uppercase tracking-widest text-center">Status</TableHead>
                        <TableHead className="text-[9px] font-black uppercase tracking-widest text-center">Actions</TableHead>
                        <TableHead className="text-right text-[9px] font-black uppercase tracking-widest pr-8">Filed At</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                        Array.from({length: 5}).map((_, i) => (
                            <TableRow key={i} className="border-white/5 h-20"><TableCell colSpan={5} className="px-8"><Skeleton className="h-8 w-full rounded-xl" /></TableCell></TableRow>
                        ))
                    ) : filteredReports.length === 0 ? (
                        <TableRow className="border-none">
                            <TableCell colSpan={5} className="h-64 text-center">
                                <div className="flex flex-col items-center gap-3 opacity-20">
                                    <Info className="h-12 w-12" />
                                    <p className="font-black uppercase text-[10px] tracking-[0.3em]">Zero intelligence reports filed for this cycle</p>
                                </div>
                            </TableCell>
                        </TableRow>
                    ) : (
                        filteredReports.map(report => {
                            const isAnomaly = checkAnomaly(report.content);
                            const isExpanded = expandedSummaries.has(report.id);

                            return (
                                <TableRow
                                    key={report.id}
                                    className={cn(
                                        "border-white/5 group h-auto transition-colors",
                                        isAnomaly ? "bg-amber-500/5 hover:bg-amber-500/10 border-l-4 border-l-amber-500" : "hover:bg-primary/5"
                                    )}
                                >
                                    <TableCell className="pl-8 py-6 align-top">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-black font-headline text-white group-hover:text-primary transition-colors cursor-pointer" onClick={() => setSelectedReport(report)}>{report.userName}</span>
                                            <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground mt-1 opacity-50">Unit ID: {report.userId.slice(0, 8)}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="max-w-md py-6 align-top">
                                        <div className="space-y-2">
                                            <p className={cn(
                                                "text-xs font-medium leading-relaxed transition-all duration-300",
                                                !isExpanded ? "line-clamp-2" : ""
                                            )}>
                                                {report.content}
                                            </p>
                                            <Button
                                                variant="link"
                                                size="sm"
                                                onClick={() => toggleExpandSummary(report.id)}
                                                className="p-0 h-auto text-[9px] font-black uppercase tracking-widest text-primary hover:text-primary/80 no-underline"
                                            >
                                                {isExpanded ? "Show Less" : "Read Full Memo"}
                                            </Button>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center py-6 align-top">
                                        {isAnomaly ? (
                                            <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[8px] font-black uppercase gap-1.5 px-2">
                                                <AlertTriangle className="h-2.5 w-2.5" /> High Standby
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="text-[8px] font-black uppercase opacity-40">Standard</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-center py-6 align-top">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[7px] font-black uppercase opacity-40">Reviewed</span>
                                                <Switch
                                                    checked={report.isReviewed ?? false}
                                                    onCheckedChange={() => handleToggleReviewed(report.id, report.isReviewed ?? false)}
                                                    className="data-[state=checked]:bg-emerald-500"
                                                />
                                            </div>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/10 transition-all opacity-0 group-hover:opacity-100" onClick={() => setSelectedReport(report)}>
                                                <Eye className="h-4 w-4 text-primary" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right pr-8 py-6 align-top">
                                        <time className="text-[10px] font-black font-mono text-muted-foreground opacity-60">
                                            {format(new Date(report.createdAt), 'HH:mm:ss')}
                                        </time>
                                    </TableCell>
                                </TableRow>
                            )
                        })
                    )}
                </TableBody>
            </Table>
        </CardContent>
      </Card>

      {/* Details Dialog */}
      {selectedReport && (
          <Dialog open={!!selectedReport} onOpenChange={(isOpen) => !isOpen && setSelectedReport(null)}>
              <DialogContent className="max-w-2xl apple-glass-darker border-none rounded-[2.5rem] p-8">
                  <DialogHeader className="space-y-4">
                      <div className="flex items-start justify-between">
                          <div>
                              <DialogTitle className="text-2xl font-black font-headline tracking-tighter uppercase">Operational Report: {selectedReport.userName}</DialogTitle>
                              <DialogDescription className="text-[10px] font-black uppercase tracking-widest mt-1">
                                  Filed {format(new Date(selectedReport.createdAt), 'PPP, p')}
                              </DialogDescription>
                          </div>
                          <div className="flex gap-2">
                               <Button variant="outline" size="sm" className="h-8 rounded-xl px-3 border-white/10 hover:bg-primary/10 hover:text-primary transition-all group" onClick={() => handleJumpToWorkstation('attendance')}>
                                  <Fingerprint className="h-3 w-3 mr-2" />
                                  <span className="text-[8px] font-black uppercase">Personnel Station</span>
                              </Button>
                               <Button variant="outline" size="sm" className="h-8 rounded-xl px-3 border-white/10 hover:bg-primary/10 hover:text-primary transition-all group" onClick={() => handleJumpToWorkstation('workbooks')}>
                                  <BookOpen className="h-3 w-3 mr-2" />
                                  <span className="text-[8px] font-black uppercase">Data Grid</span>
                              </Button>
                          </div>
                      </div>
                  </DialogHeader>

                  <div className="space-y-6 py-6 overflow-y-auto max-h-[60vh] custom-scrollbar pr-2">
                      <div className="space-y-2">
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                              <ExternalLink className="h-3 w-3" />
                              Intelligence Summary
                          </h4>
                          <div className="p-6 rounded-2xl bg-black/30 border border-white/5 text-sm leading-relaxed font-medium whitespace-pre-wrap italic opacity-90">
                              "{selectedReport.content}"
                          </div>
                      </div>

                      {selectedReport.completedTasks && selectedReport.completedTasks.length > 0 && (
                          <div className="space-y-2">
                              <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                  <ListTodo className="h-3 w-3" />
                                  Mission Links
                              </h4>
                              <div className="grid grid-cols-1 gap-2">
                                  {selectedReport.completedTasks.map(task => (
                                      <div
                                          key={task.taskId}
                                          onClick={() => handleJumpToTask(task.taskId)}
                                          className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-primary/5 cursor-pointer group transition-all active:scale-[0.98]"
                                      >
                                          <div className="flex items-center gap-3 overflow-hidden">
                                              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
                                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                              </div>
                                              <span className="text-[11px] font-black uppercase tracking-tight truncate">{task.title}</span>
                                          </div>
                                          <div className="flex items-center gap-2 text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                                              <span className="text-[8px] font-black uppercase">Inspect</span>
                                              <ArrowRight className="h-3 w-3" />
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      )}
                  </div>
              </DialogContent>
          </Dialog>
      )}
    </div>
  );
}
